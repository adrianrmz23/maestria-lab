import { extractDocument } from "@/lib/extraction/extract-document";
import { getKimiTaskEnvironment, requestKimiJson } from "@/lib/kimi/chat";
import { getDeepSeekEnvironment, requestDeepSeekJson } from "@/lib/deepseek/chat";
import { extractTaskImageText, getOpenAITaskEnvironment, requestStructuredOutput } from "@/lib/openai/responses";
import type { LearningManifest } from "@/lib/pedagogy/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { taskOutputSchema, taskRequirementsSchema, taskReviewSchema } from "@/lib/tasks/schema";
import type {
  AcademicTaskRecord,
  AcademicTaskType,
  AcademicTaskVersion,
  ProviderTrace,
  TaskOutput,
  TaskProvider,
  TaskProviderStatus,
  TaskQuality,
  TaskRequirements,
  TaskReview,
  TaskSourceRef,
  TaskSourceScope,
  TaskStudioResponse,
  TaskWorkMode,
} from "@/lib/tasks/types";

const MAX_SOURCE_CHARS = 150_000;
const MAX_ATTACHMENT_CHARS = 45_000;

type TaskRow = {
  id: string;
  module_id: string;
  title: string;
  task_type: AcademicTaskType;
  instructions: string;
  rubric_text: string;
  status: AcademicTaskRecord["status"];
  provider_preference: TaskProvider;
  quality_mode: TaskQuality;
  work_mode: TaskWorkMode;
  source_scope: TaskSourceScope;
  requirements: TaskRequirements | null;
  current_version: number;
  generation_error: string | null;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  task_id: string;
  version_number: number;
  content: TaskOutput;
  provider_trace: ProviderTrace[];
  review: TaskReview | null;
  created_at: string;
};

type UnitRow = {
  unit_index: number;
  page_number: number | null;
  label: string | null;
  content: string;
};

type ResearchPacket = {
  summary: string;
  findings: Array<{
    claim: string;
    explanation: string;
    sources: Array<{ title: string; url: string }>;
  }>;
};

const researchSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "findings"],
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "explanation", "sources"],
        properties: {
          claim: { type: "string" },
          explanation: { type: "string" },
          sources: {
            type: "array",
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "url"],
              properties: {
                title: { type: "string" },
                url: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

function taskErrorMessage(error: unknown) {
  const payload = error as { message?: string; code?: string } | null;
  const message = error instanceof Error ? error.message : payload?.message || "Error desconocido.";
  const code = payload?.code || "";
  if (message.includes("academic_tasks") || code === "PGRST205" || code === "42P01" || message.includes("PGRST205") || message.includes("42P01")) {
    return "Falta ejecutar la migración 013_academic_task_studio.sql en Supabase.";
  }
  return message;
}

function mapVersion(row: VersionRow): AcademicTaskVersion {
  return {
    id: row.id,
    taskId: row.task_id,
    versionNumber: Number(row.version_number),
    content: row.content,
    providerTrace: row.provider_trace || [],
    review: row.review || null,
    createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow, latestVersion?: VersionRow | null): AcademicTaskRecord {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    taskType: row.task_type,
    instructions: row.instructions,
    rubricText: row.rubric_text || "",
    status: row.status,
    providerPreference: row.provider_preference,
    qualityMode: row.quality_mode,
    workMode: row.work_mode,
    sourceScope: row.source_scope,
    requirements: row.requirements,
    currentVersion: Number(row.current_version || 0),
    generationError: row.generation_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestVersion: latestVersion ? mapVersion(latestVersion) : null,
  };
}

export function getTaskProviderStatuses(): TaskProviderStatus[] {
  const openai = getOpenAITaskEnvironment();
  const kimi = getKimiTaskEnvironment();
  const deepseek = getDeepSeekEnvironment();
  return [
    { provider: "openai", configured: Boolean(openai), model: openai?.model || process.env.OPENAI_TASK_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "Sin configurar" },
    { provider: "kimi", configured: Boolean(kimi), model: kimi?.model || process.env.KIMI_TASK_MODEL?.trim() || process.env.KIMI_MODEL?.trim() || "Sin configurar" },
    { provider: "deepseek", configured: Boolean(deepseek), model: deepseek?.model || process.env.DEEPSEEK_TASK_MODEL?.trim() || process.env.DEEPSEEK_MODEL?.trim() || "Sin configurar" },
  ];
}

function availableProviders() {
  return getTaskProviderStatuses().filter((item) => item.configured).map((item) => item.provider);
}

function chooseProvider(taskType: AcademicTaskType, preference: TaskProvider, exclude: Array<Exclude<TaskProvider, "auto">> = []) {
  const available = availableProviders().filter((provider) => !exclude.includes(provider));
  if (!available.length) throw new Error("Configura al menos OPENAI_API_KEY, KIMI_API_KEY o DEEPSEEK_API_KEY para usar Academic Task Studio.");
  if (preference !== "auto") {
    if (!available.includes(preference)) throw new Error(`El proveedor ${preference} no está configurado.`);
    return preference;
  }

  const preferred: Array<Exclude<TaskProvider, "auto">> =
    taskType === "concept_map" || taskType === "synoptic" || taskType === "summary"
      ? ["kimi", "openai", "deepseek"]
      : taskType === "questions"
        ? ["deepseek", "openai", "kimi"]
        : ["openai", "kimi", "deepseek"];
  return preferred.find((provider) => available.includes(provider)) || available[0];
}

async function requestProviderJson<T>({
  provider,
  name,
  schema,
  system,
  user,
  maxTokens = 7000,
  reasoning = "medium",
  webSearch = false,
}: {
  provider: Exclude<TaskProvider, "auto">;
  name: string;
  schema: object;
  system: string;
  user: string;
  maxTokens?: number;
  reasoning?: "minimal" | "low" | "medium" | "high";
  webSearch?: boolean;
}): Promise<{ data: T; model: string }> {
  if (provider === "openai") {
    const env = getOpenAITaskEnvironment();
    if (!env) throw new Error("OpenAI no está configurado.");
    return requestStructuredOutput<T>({
      name,
      schema,
      developer: system,
      user,
      reasoning,
      verbosity: "medium",
      modelOverride: env.model,
      webSearch,
    });
  }
  const schemaHint = `\n\nFORMA EXACTA DEL JSON ESPERADO:\n${JSON.stringify(schema)}`;
  if (provider === "kimi") {
    const env = getKimiTaskEnvironment();
    if (!env) throw new Error("Kimi no está configurado.");
    return requestKimiJson<T>({ system: `${system}${schemaHint}`, user, maxCompletionTokens: maxTokens, modelOverride: env.model });
  }
  return requestDeepSeekJson<T>({ system: `${system}${schemaHint}`, user, maxTokens });
}

async function interpretTaskInstructions({
  taskType,
  instructions,
  rubricText,
  providerPreference,
  attachmentContext = "",
}: {
  taskType: AcademicTaskType;
  instructions: string;
  rubricText: string;
  providerPreference: TaskProvider;
  attachmentContext?: string;
}) {
  const provider = chooseProvider(taskType, providerPreference);
  const system = [
    "Eres el intérprete de consignas académicas de Maestría Lab.",
    "Convierte la instrucción del profesor en requisitos verificables sin inventar requisitos ausentes.",
    "Respeta el tipo de tarea elegido por el estudiante salvo que sea custom; si detectas una contradicción, ponla en ambiguities.",
    "No resuelvas todavía la tarea. Solo interpreta qué debe entregarse.",
    "dueDate debe ser null si no hay una fecha explícita.",
  ].join("\n");
  const user = [
    `TIPO ELEGIDO: ${taskType}`,
    `INSTRUCCIONES: ${instructions}`,
    `RÚBRICA / CRITERIOS: ${rubricText || "No proporcionada"}`,
    attachmentContext ? `ARCHIVOS ADICIONALES CON INSTRUCCIONES O RÚBRICA:
${attachmentContext}` : "",
  ].filter(Boolean).join("\n\n");
  const result = await requestProviderJson<TaskRequirements>({ provider, name: "task_requirements", schema: taskRequirementsSchema, system, user, maxTokens: 2200, reasoning: "low" });
  return { requirements: { ...result.data, taskType }, trace: { role: "interpreter", provider, model: result.model } satisfies ProviderTrace };
}

function serializeManifest(manifest: LearningManifest, scope: TaskSourceScope) {
  const topics = scope.topicId ? manifest.topics.filter((topic) => topic.id === scope.topicId) : manifest.topics;
  return topics.map((topic) => {
    const concepts = scope.conceptId ? topic.concepts.filter((concept) => concept.id === scope.conceptId) : topic.concepts;
    return [
      `[MANIFEST · ${topic.title}]`,
      `Resumen: ${topic.summary}`,
      ...concepts.map((concept) => [
        `CONCEPTO: ${concept.title}`,
        `Fuente: ${concept.sourceSummary}`,
        `Explicación: ${concept.easy}`,
        `Nivel maestría: ${concept.masters}`,
        `Importancia: ${concept.whyItMatters}`,
        `Aplicación IA: ${concept.applicationAI}`,
      ].join("\n")),
    ].join("\n");
  }).join("\n\n---\n\n");
}

function referencedUnitIndexes(manifest: LearningManifest | null, scope: TaskSourceScope) {
  if (!manifest || !scope.topicId) return null;
  const topic = manifest.topics.find((item) => item.id === scope.topicId);
  if (!topic) return null;
  const concepts = scope.conceptId ? topic.concepts.filter((item) => item.id === scope.conceptId) : topic.concepts;
  const refs = new Set<number>();
  topic.sourceRefs.forEach((ref) => refs.add(ref.unitIndex));
  concepts.forEach((concept) => concept.sourceRefs.forEach((ref) => refs.add(ref.unitIndex)));
  return refs;
}

async function buildSourcePacket(task: TaskRow) {
  const supabase = getSupabaseAdmin();
  const chunks: string[] = [];
  const allowedDocumentUnits = new Map<number, { pageNumber: number | null; label: string }>();
  const allowedWebUrls = new Set<string>();

  const { data: moduleRow, error: moduleError } = await supabase.from("modules").select("title,subject,description").eq("id", task.module_id).maybeSingle();
  if (moduleError) throw moduleError;
  if (!moduleRow) throw new Error("El módulo ya no existe.");
  chunks.push(`MÓDULO: ${moduleRow.title}\nMATERIA: ${moduleRow.subject}\nDESCRIPCIÓN: ${moduleRow.description}`);

  let manifest: LearningManifest | null = null;
  const { data: manifestRow } = await supabase.from("learning_manifests").select("status,manifest").eq("module_id", task.module_id).maybeSingle();
  if (manifestRow?.status === "ready" && manifestRow.manifest) manifest = manifestRow.manifest as LearningManifest;

  if (task.source_scope.manifest && manifest) {
    chunks.push(`LEARNING MANIFEST AUTORIZADO:\n${serializeManifest(manifest, task.source_scope)}`);
  }

  if (task.source_scope.document) {
    const { data: documentRow } = await supabase.from("documents").select("id,name,extraction_status").eq("module_id", task.module_id).maybeSingle();
    if (documentRow?.extraction_status === "ready") {
      const { data: units, error: unitsError } = await supabase.from("document_units").select("unit_index,page_number,label,content").eq("document_id", documentRow.id).order("unit_index", { ascending: true });
      if (unitsError) throw unitsError;
      const filter = referencedUnitIndexes(manifest, task.source_scope);
      const selected = (units as UnitRow[] || []).filter((unit) => !filter || filter.has(unit.unit_index));
      const available = Math.max(20_000, MAX_SOURCE_CHARS - chunks.join("\n\n").length);
      const perUnit = Math.max(900, Math.floor(available / Math.max(1, selected.length)) - 100);
      const serialized = selected.map((unit) => {
        allowedDocumentUnits.set(unit.unit_index, { pageNumber: unit.page_number, label: unit.label || `Unidad ${unit.unit_index}` });
        const text = unit.content.length > perUnit ? `${unit.content.slice(0, perUnit)}\n[…recortado por límite técnico…]` : unit.content;
        return `[DOC unit=${unit.unit_index} page=${unit.page_number ?? "null"} label="${unit.label || `Unidad ${unit.unit_index}`}"]\n${text}`;
      }).join("\n\n---\n\n");
      if (serialized) chunks.push(`DOCUMENTO FUENTE: ${documentRow.name}\n${serialized}`);
    }
  }

  if (task.source_scope.notes) {
    const query = supabase.from("study_notes").select("id,topic_id,concept_id,note_text,recall_question").eq("module_id", task.module_id).order("updated_at", { ascending: false }).limit(30);
    const { data: notes } = await query;
    type NoteRow = { id: string; topic_id: string; concept_id: string; note_text: string; recall_question: string | null };
    const typedNotes = (notes || []) as NoteRow[];
    const filtered = typedNotes.filter((note) => (!task.source_scope.topicId || note.topic_id === task.source_scope.topicId) && (!task.source_scope.conceptId || note.concept_id === task.source_scope.conceptId));
    if (filtered.length) chunks.push(`NOTAS DEL ESTUDIANTE:\n${filtered.map((note) => `[NOTA ${note.id}] ${note.note_text}${note.recall_question ? `\nPregunta de repaso: ${note.recall_question}` : ""}`).join("\n\n")}`);
  }

  const { data: attachments, error: attachmentError } = await supabase.from("academic_task_sources").select("id,name,mime_type,extracted_text,metadata").eq("task_id", task.id).order("created_at", { ascending: true });
  if (attachmentError) throw new Error(taskErrorMessage(attachmentError));
  for (const attachment of attachments || []) {
    const text = String(attachment.extracted_text || "").slice(0, MAX_ATTACHMENT_CHARS);
    if (text) chunks.push(`ARCHIVO ADICIONAL: ${attachment.name}\n${text}`);
  }

  return { packet: chunks.join("\n\n==========\n\n").slice(0, MAX_SOURCE_CHARS), allowedDocumentUnits, allowedWebUrls, manifest };
}

async function runExternalResearch(task: TaskRow) {
  if (!task.source_scope.externalResearch) return { packet: "", urls: new Set<string>(), trace: null as ProviderTrace | null };
  const env = getOpenAITaskEnvironment();
  if (!env) throw new Error("La investigación web requiere OPENAI_API_KEY porque usa Web Search de Responses API.");
  const system = [
    "Eres un investigador académico auxiliar.",
    "Busca solo información externa que complemente la consigna. Prioriza fuentes primarias, universidades, organismos oficiales y documentación técnica.",
    "No sustituyas la fuente de la universidad: esta investigación es contexto adicional y debe quedar claramente separada.",
    "Incluye URLs reales de las fuentes consultadas.",
  ].join("\n");
  const user = `TAREA: ${task.title}\nTIPO: ${task.task_type}\nCONSIGNA: ${task.instructions}\nRÚBRICA: ${task.rubric_text || "No proporcionada"}`;
  const result = await requestStructuredOutput<ResearchPacket>({
    name: "academic_task_research",
    schema: researchSchema,
    developer: system,
    user,
    reasoning: "low",
    verbosity: "medium",
    modelOverride: env.model,
    webSearch: true,
  });
  const urls = new Set<string>();
  result.data.findings.forEach((finding) => finding.sources.forEach((source) => urls.add(source.url)));
  const packet = [
    "INVESTIGACIÓN EXTERNA (NO ES PARTE DEL DOCUMENTO DE LA UNIVERSIDAD):",
    result.data.summary,
    ...result.data.findings.map((finding) => `${finding.claim}\n${finding.explanation}\nFuentes: ${finding.sources.map((source) => `${source.title} — ${source.url}`).join(" | ")}`),
  ].join("\n\n");
  return { packet, urls, trace: { role: "research", provider: "openai", model: result.model } satisfies ProviderTrace };
}

function taskTypeInstruction(task: TaskRow) {
  const map: Record<AcademicTaskType, string> = {
    concept_map: "Genera un mapa conceptual real. visual.enabled=true, visual.type=concept_map. Usa nodos jerárquicos, relaciones con etiquetas y no más de 24 nodos. Las sections explican brevemente cómo leer el mapa.",
    synoptic: "Genera un cuadro sinóptico jerárquico. visual.enabled=true, visual.type=synoptic. Ordena categorías de lo general a lo específico, con máximo 28 nodos.",
    summary: "Genera un resumen fiel, cohesivo y proporcional a la longitud solicitada. visual.enabled=false y visual.type=none.",
    essay: "Genera un ensayo académico con tesis clara, introducción, desarrollo argumentativo y conclusión. No inventes citas textuales. visual.enabled=false.",
    report: "Genera un reporte académico/técnico con estructura clara, hallazgos, análisis y conclusión. visual.enabled=false.",
    research: "Genera un trabajo de investigación distinguiendo explícitamente fuente del módulo e investigación externa cuando exista. visual.enabled=false.",
    infographic: "Genera la arquitectura textual y visual de una infografía. visual.enabled=true, visual.type=infographic; nodos breves y orientados a lectura visual.",
    presentation: "Trata cada section como una diapositiva: heading=título de diapositiva y body=contenido breve, preferentemente 3-5 bullets separados por saltos de línea. visual.enabled=false.",
    questions: "Genera un banco de preguntas con respuestas razonadas. Cada section representa una pregunta y su body incluye Respuesta: y Explicación:. visual.enabled=false.",
    custom: "Sigue estrictamente la consigna interpretada y decide la estructura más adecuada. Usa visual solo si la consigna realmente lo necesita.",
  };
  return map[task.task_type];
}

function generationSystem(task: TaskRow) {
  return [
    "Eres Academic Task Studio de Maestría Lab.",
    "Genera trabajo académico en español, con estilo natural, preciso y apropiado para una maestría.",
    "REGLA PRINCIPAL: el material proporcionado manda. No atribuyas a la fuente ideas que no están ahí.",
    "Cada afirmación académica importante debe poder rastrearse mediante sourceRefs. Para documento usa kind=document con unitIndex/pageNumber reales del paquete. Para Learning Manifest usa kind=manifest. Para notas usa kind=note. Para investigación externa usa kind=web y URL real.",
    "No inventes páginas, unidades, URLs, bibliografía ni citas textuales.",
    "Si la fuente no soporta una afirmación requerida, dilo de forma transparente dentro del texto en lugar de fabricarla.",
    task.work_mode === "guided"
      ? "MODO HAZLO CONMIGO: entrega una versión de trabajo guiada. La estructura debe estar completa, pero las sections deben incluir puntos de decisión, preguntas de autor y espacios claros para que el estudiante personalice antes de entregar. No presentes el texto como versión final."
      : "MODO GENERAR BORRADOR: entrega un borrador completo y utilizable, todavía editable por el estudiante.",
    taskTypeInstruction(task),
    "Para tareas visuales, los ids de nodos y edges deben ser simples y únicos. parentId debe corresponder a un nodo existente o ser null.",
    "Bibliography debe contener solo fuentes realmente usadas. Si solo existe el documento interno, referencia ese documento mediante sourceRef en lugar de inventar APA.",
  ].join("\n");
}

function generationUser(task: TaskRow, sourcePacket: string, researchPacket: string) {
  return [
    `TÍTULO DE LA TAREA: ${task.title}`,
    `TIPO: ${task.task_type}`,
    `CONSIGNA ORIGINAL:\n${task.instructions}`,
    `RÚBRICA / CRITERIOS:\n${task.rubric_text || "No proporcionada"}`,
    `REQUISITOS INTERPRETADOS:\n${JSON.stringify(task.requirements, null, 2)}`,
    "FUENTES ACADÉMICAS AUTORIZADAS:",
    sourcePacket || "No se proporcionó fuente interna.",
    researchPacket || "Sin investigación externa.",
  ].join("\n\n==========\n\n");
}

function reviewSystem() {
  return [
    "Eres el revisor académico estricto de Maestría Lab.",
    "Evalúa el borrador contra la consigna, la rúbrica y las fuentes autorizadas.",
    "Penaliza afirmaciones importantes sin respaldo, omisiones, vaguedad, repeticiones y estructura inadecuada.",
    "No uses detectores de IA ni hagas afirmaciones sobre si el texto fue escrito por IA.",
    "Si no hay una rúbrica explícita, crea criterios razonables y deja claro en feedback que son criterios editoriales inferidos.",
    "unsupportedClaims debe listar solo afirmaciones concretas que no puedas sostener con el paquete de fuentes.",
  ].join("\n");
}

function sanitizeOutput(output: TaskOutput, allowedUnits: Map<number, { pageNumber: number | null; label: string }>, allowedWebUrls: Set<string>) {
  const cleanRef = (ref: TaskSourceRef): TaskSourceRef | null => {
    if (ref.kind === "document") {
      if (ref.unitIndex === null || !allowedUnits.has(ref.unitIndex)) return null;
      const unit = allowedUnits.get(ref.unitIndex)!;
      return { ...ref, label: ref.label || unit.label, pageNumber: unit.pageNumber, url: null };
    }
    if (ref.kind === "web") {
      if (!ref.url || !allowedWebUrls.has(ref.url)) return null;
      return ref;
    }
    return { ...ref, unitIndex: null, pageNumber: null, url: null };
  };
  const sections = output.sections.map((section) => ({ ...section, sourceRefs: section.sourceRefs.map(cleanRef).filter(Boolean) as TaskSourceRef[] }));
  const bibliography = output.bibliography.map(cleanRef).filter(Boolean) as TaskSourceRef[];
  const nodeIds = new Set(output.visual.nodes.map((node) => node.id));
  const nodes = output.visual.nodes.map((node) => ({ ...node, parentId: node.parentId && nodeIds.has(node.parentId) ? node.parentId : null }));
  const edges = output.visual.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return { ...output, taskType: output.taskType || "custom", sections, bibliography, visual: { ...output.visual, nodes, edges } };
}

function normalizeOutputForTask(output: TaskOutput, task: TaskRow): TaskOutput {
  const visualType = task.task_type === "concept_map" ? "concept_map" : task.task_type === "synoptic" ? "synoptic" : task.task_type === "infographic" ? "infographic" : "none";
  const visualRequired = visualType !== "none";
  return {
    ...output,
    taskType: task.task_type,
    visual: {
      ...output.visual,
      enabled: visualRequired ? true : output.visual.enabled && task.task_type === "custom",
      type: visualRequired ? visualType : task.task_type === "custom" ? output.visual.type : "none",
    },
  };
}

async function generateDraft(task: TaskRow) {
  const source = await buildSourcePacket(task);
  const research = await runExternalResearch(task);
  research.urls.forEach((url) => source.allowedWebUrls.add(url));
  const generator = chooseProvider(task.task_type, task.provider_preference);
  const generated = await requestProviderJson<TaskOutput>({
    provider: generator,
    name: "academic_task_output",
    schema: taskOutputSchema,
    system: generationSystem(task),
    user: generationUser(task, source.packet, research.packet),
    maxTokens: 12000,
    reasoning: task.quality_mode === "fast" ? "low" : "medium",
  });
  let output = normalizeOutputForTask(sanitizeOutput(generated.data, source.allowedDocumentUnits, source.allowedWebUrls), task);
  const trace: ProviderTrace[] = [];
  if (research.trace) trace.push(research.trace);
  trace.push({ role: "generator", provider: generator, model: generated.model });
  let review: TaskReview | null = null;

  if (task.quality_mode !== "fast") {
    let reviewer: Exclude<TaskProvider, "auto">;
    try { reviewer = chooseProvider(task.task_type, "auto", [generator]); } catch { reviewer = generator; }
    const reviewed = await requestProviderJson<TaskReview>({
      provider: reviewer,
      name: "academic_task_review",
      schema: taskReviewSchema,
      system: reviewSystem(),
      user: `CONSIGNA:\n${task.instructions}\n\nRÚBRICA:\n${task.rubric_text || "No proporcionada"}\n\nREQUISITOS:\n${JSON.stringify(task.requirements)}\n\nBORRADOR:\n${JSON.stringify(output)}\n\nFUENTES AUTORIZADAS:\n${source.packet}\n${research.packet}`,
      maxTokens: 5000,
      reasoning: "medium",
    });
    review = reviewed.data;
    trace.push({ role: "reviewer", provider: reviewer, model: reviewed.model });

    if (task.quality_mode === "max") {
      let polisher: Exclude<TaskProvider, "auto">;
      try { polisher = chooseProvider(task.task_type, task.provider_preference, reviewer === generator ? [] : [reviewer]); } catch { polisher = generator; }
      const polished = await requestProviderJson<TaskOutput>({
        provider: polisher,
        name: "academic_task_polished",
        schema: taskOutputSchema,
        system: `${generationSystem(task)}\n\nAhora actúas como editor final. Aplica la revisión sin introducir contenido no sustentado. Conserva el alcance, la trazabilidad y el tipo de tarea.`,
        user: `BORRADOR:\n${JSON.stringify(output)}\n\nREVISIÓN:\n${JSON.stringify(review)}\n\nFUENTES:\n${source.packet}\n${research.packet}`,
        maxTokens: 12000,
        reasoning: "medium",
      });
      output = normalizeOutputForTask(sanitizeOutput(polished.data, source.allowedDocumentUnits, source.allowedWebUrls), task);
      trace.push({ role: "polisher", provider: polisher, model: polished.model });
    }
  }

  return { output, review, trace };
}

async function nextVersionNumber(taskId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("academic_task_versions").select("version_number").eq("task_id", taskId).order("version_number", { ascending: false }).limit(1).maybeSingle();
  return Number(data?.version_number || 0) + 1;
}

async function getTaskRow(taskId: string, moduleId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("academic_tasks").select("*").eq("id", taskId);
  if (moduleId) query = query.eq("module_id", moduleId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(taskErrorMessage(error));
  if (!data) throw new Error("La tarea no existe.");
  return data as TaskRow;
}

export async function listAcademicTasks(moduleId: string): Promise<TaskStudioResponse> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("academic_tasks").select("*").eq("module_id", moduleId).order("updated_at", { ascending: false });
  if (error) throw new Error(taskErrorMessage(error));
  const rows = (data || []) as TaskRow[];
  const tasks = await Promise.all(rows.map(async (row) => {
    if (!row.current_version) return mapTask(row, null);
    const { data: version } = await supabase.from("academic_task_versions").select("*").eq("task_id", row.id).eq("version_number", row.current_version).maybeSingle();
    return mapTask(row, version as VersionRow | null);
  }));
  return { tasks, providers: getTaskProviderStatuses() };
}

export async function getAcademicTask(moduleId: string, taskId: string) {
  const supabase = getSupabaseAdmin();
  const task = await getTaskRow(taskId, moduleId);
  const { data: versions, error } = await supabase.from("academic_task_versions").select("*").eq("task_id", taskId).order("version_number", { ascending: false });
  if (error) throw new Error(taskErrorMessage(error));
  const mappedVersions = ((versions || []) as VersionRow[]).map(mapVersion);
  const { data: sources } = await supabase.from("academic_task_sources").select("id,name,mime_type,metadata,created_at").eq("task_id", taskId).order("created_at", { ascending: true });
  return { task: mapTask(task, (versions?.[0] || null) as VersionRow | null), versions: mappedVersions, sources: sources || [], providers: getTaskProviderStatuses() };
}

export async function createAcademicTask(moduleId: string, input: {
  title?: string;
  taskType: AcademicTaskType;
  instructions: string;
  rubricText?: string;
  providerPreference?: TaskProvider;
  qualityMode?: TaskQuality;
  workMode?: TaskWorkMode;
  sourceScope?: Partial<TaskSourceScope>;
}) {
  if (!input.instructions?.trim()) throw new Error("Pega las instrucciones de la tarea antes de continuar.");
  const providerPreference = input.providerPreference || "auto";
  const interpreted = await interpretTaskInstructions({ taskType: input.taskType, instructions: input.instructions.trim(), rubricText: input.rubricText?.trim() || "", providerPreference });
  const sourceScope: TaskSourceScope = {
    document: input.sourceScope?.document ?? true,
    manifest: input.sourceScope?.manifest ?? true,
    notes: input.sourceScope?.notes ?? false,
    externalResearch: input.sourceScope?.externalResearch ?? false,
    topicId: input.sourceScope?.topicId || null,
    conceptId: input.sourceScope?.conceptId || null,
  };
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("academic_tasks").insert({
    module_id: moduleId,
    title: input.title?.trim() || interpreted.requirements.inferredTitle || "Nueva tarea",
    task_type: input.taskType,
    instructions: input.instructions.trim(),
    rubric_text: input.rubricText?.trim() || "",
    status: "draft",
    provider_preference: providerPreference,
    quality_mode: input.qualityMode || "quality",
    work_mode: input.workMode || "guided",
    source_scope: sourceScope,
    requirements: interpreted.requirements,
    current_version: 0,
    generation_error: null,
    created_at: now,
    updated_at: now,
  }).select("*").single();
  if (error) throw new Error(taskErrorMessage(error));
  return { task: mapTask(data as TaskRow, null), interpreterTrace: interpreted.trace, providers: getTaskProviderStatuses() };
}

export async function reinterpretAcademicTask(moduleId: string, taskId: string) {
  const task = await getTaskRow(taskId, moduleId);
  const supabase = getSupabaseAdmin();
  const { data: sources, error: sourceError } = await supabase.from("academic_task_sources").select("name,extracted_text").eq("task_id", taskId).order("created_at", { ascending: true });
  if (sourceError) throw new Error(taskErrorMessage(sourceError));
  type AttachedSourceRow = { name: string; extracted_text: string };
  const typedSources = (sources || []) as AttachedSourceRow[];
  const attachmentContext = typedSources.map((source) => `${source.name}:\n${String(source.extracted_text || "").slice(0, 18000)}`).join("\n\n---\n\n");
  const interpreted = await interpretTaskInstructions({
    taskType: task.task_type,
    instructions: task.instructions,
    rubricText: task.rubric_text,
    providerPreference: task.provider_preference,
    attachmentContext,
  });
  const { data, error } = await supabase.from("academic_tasks").update({
    requirements: interpreted.requirements,
    title: task.title || interpreted.requirements.inferredTitle,
    generation_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", taskId).eq("module_id", moduleId).select("*").single();
  if (error) throw new Error(taskErrorMessage(error));
  return { task: mapTask(data as TaskRow, null), interpreterTrace: interpreted.trace };
}

export async function generateAcademicTask(moduleId: string, taskId: string) {
  const supabase = getSupabaseAdmin();
  const task = await getTaskRow(taskId, moduleId);
  await supabase.from("academic_tasks").update({ status: "generating", generation_error: null, updated_at: new Date().toISOString() }).eq("id", taskId);
  try {
    const result = await generateDraft(task);
    const versionNumber = await nextVersionNumber(taskId);
    const { data: version, error: versionError } = await supabase.from("academic_task_versions").insert({
      task_id: taskId,
      version_number: versionNumber,
      content: result.output,
      provider_trace: result.trace,
      review: result.review,
    }).select("*").single();
    if (versionError) throw versionError;
    const now = new Date().toISOString();
    const { data: updated, error: taskError } = await supabase.from("academic_tasks").update({
      title: result.output.title || task.title,
      status: "ready",
      current_version: versionNumber,
      generation_error: null,
      updated_at: now,
    }).eq("id", taskId).select("*").single();
    if (taskError) throw taskError;
    return { task: mapTask(updated as TaskRow, version as VersionRow), version: mapVersion(version as VersionRow), providers: getTaskProviderStatuses() };
  } catch (error) {
    const message = taskErrorMessage(error);
    await supabase.from("academic_tasks").update({ status: "error", generation_error: message, updated_at: new Date().toISOString() }).eq("id", taskId);
    throw new Error(message);
  }
}

export async function reviewAcademicTask(moduleId: string, taskId: string) {
  const supabase = getSupabaseAdmin();
  const task = await getTaskRow(taskId, moduleId);
  if (!task.current_version) throw new Error("Genera primero un borrador para poder revisarlo.");
  const { data: versionRow, error } = await supabase.from("academic_task_versions").select("*").eq("task_id", taskId).eq("version_number", task.current_version).maybeSingle();
  if (error || !versionRow) throw new Error(taskErrorMessage(error || new Error("No se encontró la versión actual.")));
  await supabase.from("academic_tasks").update({ status: "reviewing", updated_at: new Date().toISOString() }).eq("id", taskId);
  try {
    const source = await buildSourcePacket(task);
    const research = await runExternalResearch(task);
    const generatorProvider = ((versionRow.provider_trace || []) as ProviderTrace[]).find((trace) => trace.role === "generator")?.provider;
    let reviewer: Exclude<TaskProvider, "auto">;
    try { reviewer = chooseProvider(task.task_type, "auto", generatorProvider ? [generatorProvider] : []); } catch { reviewer = generatorProvider || chooseProvider(task.task_type, task.provider_preference); }
    const reviewed = await requestProviderJson<TaskReview>({
      provider: reviewer,
      name: "academic_task_review",
      schema: taskReviewSchema,
      system: reviewSystem(),
      user: `CONSIGNA:\n${task.instructions}\n\nRÚBRICA:\n${task.rubric_text || "No proporcionada"}\n\nBORRADOR:\n${JSON.stringify(versionRow.content)}\n\nFUENTES:\n${source.packet}\n${research.packet}`,
      maxTokens: 5000,
      reasoning: "medium",
    });
    const trace = [...((versionRow.provider_trace || []) as ProviderTrace[]), { role: "reviewer", provider: reviewer, model: reviewed.model } satisfies ProviderTrace];
    const { data: saved, error: saveError } = await supabase.from("academic_task_versions").update({ review: reviewed.data, provider_trace: trace }).eq("id", versionRow.id).select("*").single();
    if (saveError) throw saveError;
    await supabase.from("academic_tasks").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", taskId);
    return { task: mapTask({ ...task, status: "ready" }, saved as VersionRow), version: mapVersion(saved as VersionRow) };
  } catch (error) {
    await supabase.from("academic_tasks").update({ status: "ready", generation_error: taskErrorMessage(error), updated_at: new Date().toISOString() }).eq("id", taskId);
    throw new Error(taskErrorMessage(error));
  }
}

export async function saveAcademicTaskVersion(moduleId: string, taskId: string, content: TaskOutput) {
  const supabase = getSupabaseAdmin();
  const task = await getTaskRow(taskId, moduleId);
  const { data: previous } = task.current_version
    ? await supabase.from("academic_task_versions").select("provider_trace").eq("task_id", taskId).eq("version_number", task.current_version).maybeSingle()
    : { data: null };
  const versionNumber = await nextVersionNumber(taskId);
  const { data: version, error } = await supabase.from("academic_task_versions").insert({
    task_id: taskId,
    version_number: versionNumber,
    content,
    provider_trace: previous?.provider_trace || [],
    review: null,
  }).select("*").single();
  if (error) throw new Error(taskErrorMessage(error));
  const now = new Date().toISOString();
  const { data: updated, error: taskError } = await supabase.from("academic_tasks").update({ title: content.title || task.title, status: "ready", current_version: versionNumber, updated_at: now }).eq("id", taskId).select("*").single();
  if (taskError) throw new Error(taskErrorMessage(taskError));
  return { task: mapTask(updated as TaskRow, version as VersionRow), version: mapVersion(version as VersionRow) };
}

export async function updateAcademicTask(moduleId: string, taskId: string, patch: Partial<Pick<AcademicTaskRecord, "title" | "instructions" | "rubricText" | "providerPreference" | "qualityMode" | "workMode" | "sourceScope" | "status">>) {
  await getTaskRow(taskId, moduleId);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.instructions !== undefined) update.instructions = patch.instructions;
  if (patch.rubricText !== undefined) update.rubric_text = patch.rubricText;
  if (patch.providerPreference !== undefined) update.provider_preference = patch.providerPreference;
  if (patch.qualityMode !== undefined) update.quality_mode = patch.qualityMode;
  if (patch.workMode !== undefined) update.work_mode = patch.workMode;
  if (patch.sourceScope !== undefined) update.source_scope = patch.sourceScope;
  if (patch.status !== undefined) update.status = patch.status;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("academic_tasks").update(update).eq("id", taskId).eq("module_id", moduleId).select("*").single();
  if (error) throw new Error(taskErrorMessage(error));
  return mapTask(data as TaskRow, null);
}

export async function deleteAcademicTask(moduleId: string, taskId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("academic_tasks").delete().eq("id", taskId).eq("module_id", moduleId);
  if (error) throw new Error(taskErrorMessage(error));
  return { ok: true };
}

export async function addTaskAttachment(moduleId: string, taskId: string, file: File) {
  await getTaskRow(taskId, moduleId);
  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("El archivo adicional no puede superar 12 MB.");
  const name = file.name || "archivo";
  const lower = name.toLowerCase();
  let extractedText = "";
  let metadata: Record<string, unknown> = { size: file.size };
  if (lower.endsWith(".pdf")) {
    const result = await extractDocument(Buffer.from(await file.arrayBuffer()), "PDF");
    extractedText = result.fullText;
    metadata = { ...metadata, pageCount: result.pageCount, parser: result.parser };
  } else if (lower.endsWith(".docx")) {
    const result = await extractDocument(Buffer.from(await file.arrayBuffer()), "DOCX");
    extractedText = result.fullText;
    metadata = { ...metadata, parser: result.parser };
  } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    extractedText = await file.text();
  } else if (/\.(png|jpe?g|webp)$/.test(lower)) {
    const inferredMime = lower.endsWith(".png") ? "image/png" : lower.endsWith(".webp") ? "image/webp" : "image/jpeg";
    const image = await extractTaskImageText(Buffer.from(await file.arrayBuffer()), file.type || inferredMime, name);
    extractedText = image.text;
    metadata = { ...metadata, parser: "openai-vision", model: image.model, image: true };
  } else {
    throw new Error("Los archivos adicionales admiten PDF, DOCX, TXT, MD, PNG, JPG/JPEG o WEBP.");
  }
  if (!extractedText.trim()) throw new Error("No se pudo extraer texto útil del archivo.");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("academic_task_sources").insert({
    task_id: taskId,
    source_kind: "attachment",
    name,
    mime_type: file.type || null,
    extracted_text: extractedText.slice(0, 120_000),
    metadata,
  }).select("id,name,mime_type,metadata,created_at").single();
  if (error) throw new Error(taskErrorMessage(error));
  return data;
}

export async function removeTaskAttachment(moduleId: string, taskId: string, sourceId: string) {
  await getTaskRow(taskId, moduleId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("academic_task_sources").delete().eq("id", sourceId).eq("task_id", taskId);
  if (error) throw new Error(taskErrorMessage(error));
  return { ok: true };
}
