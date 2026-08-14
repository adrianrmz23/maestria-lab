import { connectionGraphJsonSchema } from "@/lib/connections/schema";
import type { ConnectionGraph, ConnectionType, KnowledgeConnection } from "@/lib/connections/types";
import { getKimiEnvironment, requestKimiJson } from "@/lib/kimi/chat";
import { getOpenAIEnvironment, requestStructuredOutput } from "@/lib/openai/responses";
import type { LearningConcept, LearningManifest, LearningTopic, SourceReference } from "@/lib/pedagogy/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type GeneratedConnection = {
  sourceModuleId: string;
  sourceTopicId: string;
  sourceConceptId: string;
  targetModuleId: string;
  targetTopicId: string;
  targetConceptId: string;
  relationshipType: ConnectionType;
  title: string;
  explanation: string;
  bridgeExample: string;
  strength: number;
};

type GeneratedGraph = { connections: GeneratedConnection[] };

type ManifestEntry = {
  moduleId: string;
  moduleTitle: string;
  subject: string;
  manifest: LearningManifest;
};

function conceptKey(moduleId: string, topicId: string, conceptId: string) {
  return `${moduleId}::${topicId}::${conceptId}`;
}

function sourceRefs(concept: LearningConcept): SourceReference[] {
  return concept.sourceRefs.slice(0, 4);
}

async function loadManifests(): Promise<ManifestEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("learning_manifests")
    .select("module_id,manifest,status")
    .eq("status", "ready")
    .not("manifest", "is", null);
  if (error) throw error;
  if (!data?.length) return [];

  const moduleIds = data.map((row) => row.module_id);
  const { data: modules, error: modulesError } = await supabase.from("modules").select("id,title,subject").in("id", moduleIds);
  if (modulesError) throw modulesError;
  const moduleMap = new Map((modules ?? []).map((row) => [row.id, row]));

  return data.flatMap((row) => {
    const studyModule = moduleMap.get(row.module_id);
    if (!studyModule || !row.manifest) return [];
    return [{ moduleId: row.module_id, moduleTitle: studyModule.title, subject: studyModule.subject, manifest: row.manifest as LearningManifest }];
  });
}

function compactManifest(entries: ManifestEntry[]) {
  return entries.map((entry) => ({
    moduleId: entry.moduleId,
    moduleTitle: entry.moduleTitle,
    subject: entry.subject,
    topics: entry.manifest.topics.map((topic) => ({
      topicId: topic.id,
      title: topic.title,
      concepts: topic.concepts.map((concept) => ({
        conceptId: concept.id,
        title: concept.title,
        sourceSummary: concept.sourceSummary.slice(0, 420),
        whyItMatters: concept.whyItMatters.slice(0, 320),
        applicationAI: concept.applicationAI.slice(0, 360),
      })),
    })),
  }));
}

function buildConceptMap(entries: ManifestEntry[]) {
  const map = new Map<string, { entry: ManifestEntry; topic: LearningTopic; concept: LearningConcept }>();
  for (const entry of entries) {
    for (const topic of entry.manifest.topics) {
      for (const concept of topic.concepts) map.set(conceptKey(entry.moduleId, topic.id, concept.id), { entry, topic, concept });
    }
  }
  return map;
}

const allowedConnectionTypes = new Set<ConnectionType>(["prerequisite", "analogy", "application", "shared_principle", "contrast", "extension"]);

function normalizeConnection(item: GeneratedConnection, conceptMap: ReturnType<typeof buildConceptMap>) {
  if (!item || typeof item !== "object") return null;
  if (!allowedConnectionTypes.has(item.relationshipType)) return null;
  if (![item.sourceModuleId, item.sourceTopicId, item.sourceConceptId, item.targetModuleId, item.targetTopicId, item.targetConceptId, item.title, item.explanation, item.bridgeExample].every((value) => typeof value === "string" && value.trim())) return null;
  if (item.sourceModuleId === item.targetModuleId || !Number.isFinite(item.strength)) return null;
  const source = conceptMap.get(conceptKey(item.sourceModuleId, item.sourceTopicId, item.sourceConceptId));
  const target = conceptMap.get(conceptKey(item.targetModuleId, item.targetTopicId, item.targetConceptId));
  if (!source || !target) return null;
  const strength = Math.max(1, Math.min(100, Math.round(item.strength)));
  return { item, source, target, strength };
}

export async function generateKnowledgeConnections(): Promise<ConnectionGraph> {
  const entries = await loadManifests();
  if (entries.length < 2) throw new Error("Necesitas al menos dos módulos con Learning Manifest listo para descubrir conexiones.");
  const compact = compactManifest(entries);
  const system = [
    "Analiza varios módulos de una Maestría en IA y Ciencia de Datos y descubre relaciones pedagógicamente útiles entre conceptos DE MÓDULOS DISTINTOS.",
    "Devuelve un objeto JSON con la clave connections y entre 4 y 14 conexiones fuertes; si no hay suficientes relaciones reales, devuelve menos.",
    "Usa exclusivamente IDs existentes del catálogo entregado. No inventes módulos, temas ni conceptos.",
    "relationshipType: prerequisite, analogy, application, shared_principle, contrast o extension.",
    "strength debe medir utilidad pedagógica, no similitud superficial.",
    "explanation debe explicar por qué conocer un concepto ayuda a entender el otro, en 2-4 frases claras.",
    "bridgeExample debe crear un mini puente concreto, idealmente aplicado a IA, Data Science, programación o matemáticas.",
    "Evita relaciones obvias basadas solo en compartir palabras. Prioriza conexiones que ayuden a aprender o transferir conocimiento.",
  ].join("\n");
  const user = `CATÁLOGO DE CONCEPTOS:\n${JSON.stringify(compact)}`;

  let generated: GeneratedGraph;
  let provider = "openai";
  let model = "";
  if (getKimiEnvironment()) {
    try {
      const result = await requestKimiJson<GeneratedGraph>({ system, user, maxCompletionTokens: 4200 });
      generated = result.data;
      provider = "kimi";
      model = result.model;
    } catch (error) {
      if (!getOpenAIEnvironment()) throw error;
      const result = await requestStructuredOutput<GeneratedGraph>({ name: "knowledge_connections", schema: connectionGraphJsonSchema, developer: system, user, reasoning: "medium", verbosity: "medium" });
      generated = result.data;
      provider = "openai";
      model = result.model;
    }
  } else {
    const result = await requestStructuredOutput<GeneratedGraph>({
      name: "knowledge_connections",
      schema: connectionGraphJsonSchema,
      developer: system,
      user,
      reasoning: "medium",
      verbosity: "medium",
    });
    generated = result.data;
    provider = "openai";
    model = result.model;
  }

  const conceptMap = buildConceptMap(entries);
  const normalized = (generated.connections ?? []).map((item) => normalizeConnection(item, conceptMap)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const supabase = getSupabaseAdmin();
  const { error: deleteError } = await supabase.from("module_connections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) throw deleteError;

  if (normalized.length) {
    const rows = normalized.map(({ item, source, target, strength }) => ({
      source_module_id: item.sourceModuleId,
      source_topic_id: item.sourceTopicId,
      source_concept_id: item.sourceConceptId,
      target_module_id: item.targetModuleId,
      target_topic_id: item.targetTopicId,
      target_concept_id: item.targetConceptId,
      relationship_type: item.relationshipType,
      title: item.title.trim(),
      explanation: item.explanation.trim(),
      bridge_example: item.bridgeExample.trim(),
      strength,
      source_refs: sourceRefs(source.concept),
      target_refs: sourceRefs(target.concept),
      provider,
      model,
    }));
    const { error: insertError } = await supabase.from("module_connections").insert(rows);
    if (insertError) throw insertError;
  }

  return getKnowledgeConnections();
}

export async function getKnowledgeConnections(): Promise<ConnectionGraph> {
  const entries = await loadManifests();
  const conceptMap = buildConceptMap(entries);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("module_connections").select("*").order("strength", { ascending: false }).limit(40);
  if (error) throw error;

  const connections: KnowledgeConnection[] = (data ?? []).flatMap((row) => {
    const source = conceptMap.get(conceptKey(row.source_module_id, row.source_topic_id, row.source_concept_id));
    const target = conceptMap.get(conceptKey(row.target_module_id, row.target_topic_id, row.target_concept_id));
    if (!source || !target) return [];
    return [{
      id: row.id,
      sourceModuleId: row.source_module_id,
      sourceModuleTitle: source.entry.moduleTitle,
      sourceTopicId: row.source_topic_id,
      sourceTopicTitle: source.topic.title,
      sourceConceptId: row.source_concept_id,
      sourceConceptTitle: source.concept.title,
      targetModuleId: row.target_module_id,
      targetModuleTitle: target.entry.moduleTitle,
      targetTopicId: row.target_topic_id,
      targetTopicTitle: target.topic.title,
      targetConceptId: row.target_concept_id,
      targetConceptTitle: target.concept.title,
      relationshipType: row.relationship_type,
      title: row.title,
      explanation: row.explanation,
      bridgeExample: row.bridge_example,
      strength: row.strength,
      sourceRefs: row.source_refs ?? [],
      targetRefs: row.target_refs ?? [],
      provider: row.provider,
      model: row.model,
    } satisfies KnowledgeConnection];
  });

  const latest = (data ?? [])[0];
  return { connections, generatedAt: latest?.created_at, provider: latest?.provider, model: latest?.model };
}
