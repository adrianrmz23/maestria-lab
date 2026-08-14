import { generateStructuredLearningManifest } from "@/lib/openai/responses";
import type { LearningManifest } from "@/lib/pedagogy/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_SOURCE_CHARS = 180_000;

type UnitRow = {
  unit_index: number;
  page_number: number | null;
  label: string | null;
  content: string;
  char_count: number;
};

type ModuleRow = { id: string; title: string; subject: string; description: string };
type DocumentRow = { id: string; module_id: string; name: string; extraction_status: string; unit_count: number; char_count: number };

function trimUnitContent(content: string, maxChars: number) {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, Math.max(0, maxChars - 80))}\n[…fragmento recortado por límite técnico…]`;
}

function buildSourcePayload(module: ModuleRow, document: DocumentRow, units: UnitRow[]) {
  const baseHeader = [
    `MÓDULO: ${module.title}`,
    `MATERIA: ${module.subject}`,
    `DESCRIPCIÓN DEL MÓDULO: ${module.description}`,
    `DOCUMENTO FUENTE: ${document.name}`,
    `UNIDADES EXTRAÍDAS: ${units.length}`,
    "",
    "FUENTE COMPLETA POR UNIDADES:",
  ].join("\n");

  const available = Math.max(20_000, MAX_SOURCE_CHARS - baseHeader.length);
  const perUnit = Math.max(1200, Math.floor(available / Math.max(1, units.length)) - 100);
  const serialized = units.map((unit) => {
    const label = unit.label || `Unidad ${unit.unit_index}`;
    const page = unit.page_number ? ` · página ${unit.page_number}` : "";
    return `[UNIDAD ${unit.unit_index}${page} · ${label}]\n${trimUnitContent(unit.content, perUnit)}`;
  }).join("\n\n---\n\n");

  return `${baseHeader}\n${serialized}\n\nINSTRUCCIÓN FINAL: Construye el Learning Manifest completo respetando la fuente y la trazabilidad. No omitas temas importantes aunque sean matemáticos o difíciles.`;
}

function countConcepts(manifest: LearningManifest) {
  return manifest.topics.reduce((sum, topic) => sum + topic.concepts.length, 0);
}

function validateSourceReferences(manifest: LearningManifest, units: UnitRow[]) {
  const unitsByIndex = new Map(units.map((unit) => [unit.unit_index, unit]));
  const refs = [
    ...manifest.topics.flatMap((topic) => topic.sourceRefs),
    ...manifest.topics.flatMap((topic) => topic.concepts.flatMap((concept) => concept.sourceRefs)),
  ];

  for (const ref of refs) {
    const unit = unitsByIndex.get(ref.unitIndex);
    if (!unit) throw new Error(`El motor devolvió una referencia inexistente: unidad ${ref.unitIndex}.`);
    if (ref.pageNumber !== null && unit.page_number !== ref.pageNumber) {
      throw new Error(`La referencia a página ${ref.pageNumber} no coincide con la unidad ${ref.unitIndex}.`);
    }
  }
}

function normalizeManifest(manifest: LearningManifest) {
  const topicIds = new Set<string>();
  manifest.topics = manifest.topics
    .sort((a, b) => a.order - b.order)
    .map((topic, topicIndex) => {
      let topicId = topic.id || `tema-${topicIndex + 1}`;
      while (topicIds.has(topicId)) topicId = `${topicId}-${topicIndex + 1}`;
      topicIds.add(topicId);
      const conceptIds = new Set<string>();
      const concepts = topic.concepts.map((concept, conceptIndex) => {
        let conceptId = concept.id || `concepto-${conceptIndex + 1}`;
        while (conceptIds.has(conceptId)) conceptId = `${conceptId}-${conceptIndex + 1}`;
        conceptIds.add(conceptId);
        return { ...concept, id: conceptId };
      });
      return { ...topic, id: topicId, order: topicIndex + 1, concepts };
    });
  return manifest;
}

export async function generateManifestForModule(moduleId: string) {
  const supabase = getSupabaseAdmin();
  const { data: module, error: moduleError } = await supabase.from("modules").select("id,title,subject,description").eq("id", moduleId).maybeSingle();
  if (moduleError) throw moduleError;
  if (!module) throw new Error("El módulo no existe.");

  const { data: document, error: documentError } = await supabase.from("documents").select("id,module_id,name,extraction_status,unit_count,char_count").eq("module_id", moduleId).maybeSingle();
  if (documentError) throw documentError;
  if (!document) throw new Error("El módulo necesita un documento fuente antes de generar contenido pedagógico.");
  if (document.extraction_status !== "ready") throw new Error("La extracción del documento debe estar completada antes de generar el Learning Manifest.");

  const { data: units, error: unitsError } = await supabase.from("document_units").select("unit_index,page_number,label,content,char_count").eq("document_id", document.id).order("unit_index", { ascending: true });
  if (unitsError) throw unitsError;
  if (!units?.length) throw new Error("No hay unidades extraídas para analizar.");

  const now = new Date().toISOString();
  const sourceCharCount = (units as UnitRow[]).reduce((sum, unit) => sum + Number(unit.char_count || unit.content.length), 0);
  const { error: upsertError } = await supabase.from("learning_manifests").upsert({
    module_id: moduleId,
    document_id: document.id,
    status: "generating",
    schema_version: "1.0",
    manifest: null,
    topic_count: 0,
    concept_count: 0,
    source_unit_count: units.length,
    source_char_count: sourceCharCount,
    generation_error: null,
    generated_at: null,
    updated_at: now,
  }, { onConflict: "module_id" });
  if (upsertError) throw upsertError;

  try {
    const input = buildSourcePayload(module as ModuleRow, document as DocumentRow, units as UnitRow[]);
    const result = await generateStructuredLearningManifest(input);
    const manifest = normalizeManifest(result.manifest);
    validateSourceReferences(manifest, units as UnitRow[]);
    const conceptCount = countConcepts(manifest);
    const generatedAt = new Date().toISOString();

    const { error: saveError } = await supabase.from("learning_manifests").update({
      status: "ready",
      model: result.model,
      manifest,
      topic_count: manifest.topics.length,
      concept_count: conceptCount,
      source_unit_count: units.length,
      source_char_count: sourceCharCount,
      generation_error: null,
      generated_at: generatedAt,
      updated_at: generatedAt,
    }).eq("module_id", moduleId);
    if (saveError) throw saveError;

    // Un Manifest regenerado invalida la configuración interactiva vigente.
    // Conservamos los intentos como historial; el motor de dominio pondera una ventana reciente sin borrar el historial.
    // La tabla existe a partir del Bloque 6; si aún no está aplicada, Supabase devuelve el error sin romper esta generación.
    await supabase.from("learning_experiences").delete().eq("module_id", moduleId);

    await supabase.from("modules").update({ topics: manifest.topics.length, updated_at: generatedAt }).eq("id", moduleId);
    return { manifest, model: result.model, generatedAt, sourceUnitCount: units.length, sourceCharCount, conceptCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al generar el Learning Manifest.";
    await supabase.from("learning_manifests").update({ status: "error", generation_error: message, updated_at: new Date().toISOString() }).eq("module_id", moduleId);
    throw new Error(message);
  }
}
