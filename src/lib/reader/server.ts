import { requestKimiJson, getKimiEnvironment } from "@/lib/kimi/chat";
import { getOpenAIEnvironment, requestStructuredOutput } from "@/lib/openai/responses";
import { readerAnnotationJsonSchema } from "@/lib/reader/schema";
import { structureReaderContent } from "@/lib/reader/structure";
import type { ReaderAnnotation, ReaderAnnotationKind, ReaderUnit } from "@/lib/reader/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type GeneratedAnnotation = {
  phrase: string;
  kind: ReaderAnnotationKind;
  title: string;
  explanation: string;
  example: string | null;
};

function normalizeForMatch(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("es-MX");
}

function phraseExists(content: string, phrase: string) {
  const normalizedContent = normalizeForMatch(content);
  const normalizedPhrase = normalizeForMatch(phrase);
  return normalizedPhrase.length >= 3 && normalizedContent.includes(normalizedPhrase);
}

function asReaderAnnotation(row: {
  id: string;
  block_index: number | null;
  phrase: string;
  kind: ReaderAnnotationKind;
  title: string;
  explanation: string;
  example: string | null;
  provider: string;
  model: string;
}): ReaderAnnotation {
  return {
    id: row.id,
    blockIndex: row.block_index,
    phrase: row.phrase,
    kind: row.kind,
    title: row.title,
    explanation: row.explanation,
    example: row.example,
    provider: row.provider,
    model: row.model,
  };
}

export async function getReaderUnit(moduleId: string, unitIndex?: number): Promise<ReaderUnit> {
  const supabase = getSupabaseAdmin();
  const { data: document, error: documentError } = await supabase.from("documents").select("id,unit_count,extraction_status").eq("module_id", moduleId).maybeSingle();
  if (documentError) throw documentError;
  if (!document) throw new Error("El módulo no tiene documento fuente.");
  if (document.extraction_status !== "ready") throw new Error("La extracción todavía no está lista para lectura.");
  const safeIndex = Math.floor(Math.min(Math.max(1, unitIndex || 1), Math.max(1, document.unit_count || 1)));

  const [{ data: unit, error: unitError }, { data: annotationRows, error: annotationError }] = await Promise.all([
    supabase.from("document_units").select("unit_index,page_number,label,content,char_count").eq("document_id", document.id).eq("unit_index", safeIndex).maybeSingle(),
    supabase.from("reader_annotations").select("id,block_index,phrase,kind,title,explanation,example,provider,model").eq("document_id", document.id).eq("unit_index", safeIndex).order("created_at", { ascending: true }),
  ]);
  if (unitError) throw unitError;
  if (annotationError) throw annotationError;
  if (!unit) throw new Error("No existe esa unidad dentro del documento.");

  return {
    unitIndex: unit.unit_index,
    pageNumber: unit.page_number,
    label: unit.label || `Unidad ${unit.unit_index}`,
    content: unit.content,
    charCount: unit.char_count,
    totalUnits: document.unit_count || 1,
    annotations: (annotationRows ?? []).map((row) => asReaderAnnotation(row as Parameters<typeof asReaderAnnotation>[0])),
  };
}

export async function generateReaderAnnotation(moduleId: string, unitIndex: number, blockIndex: number) {
  const supabase = getSupabaseAdmin();
  const { data: document, error: documentError } = await supabase.from("documents").select("id,name").eq("module_id", moduleId).maybeSingle();
  if (documentError) throw documentError;
  if (!document) throw new Error("El módulo no tiene documento fuente.");

  const { data: unit, error: unitError } = await supabase.from("document_units").select("unit_index,page_number,label,content").eq("document_id", document.id).eq("unit_index", unitIndex).maybeSingle();
  if (unitError) throw unitError;
  if (!unit) throw new Error("No existe esa unidad dentro del documento.");

  const blocks = structureReaderContent(unit.content);
  const block = blocks.find((item) => item.index === blockIndex && (item.type === "paragraph" || item.type === "list"));
  if (!block) throw new Error("Ese párrafo ya no coincide con la versión actual del documento. Recarga el lector.");

  const { data: cached, error: cachedError } = await supabase
    .from("reader_annotations")
    .select("id,block_index,phrase,kind,title,explanation,example,provider,model")
    .eq("document_id", document.id)
    .eq("unit_index", unit.unit_index)
    .eq("block_index", blockIndex)
    .maybeSingle();
  if (cachedError) throw cachedError;
  if (cached) return { cached: true, provider: cached.provider, model: cached.model, annotation: asReaderAnnotation(cached as Parameters<typeof asReaderAnnotation>[0]), unit: await getReaderUnit(moduleId, unit.unit_index) };

  const instruction = [
    "Ayuda a un estudiante de Maestría en IA y Ciencia de Datos a comprender UN párrafo concreto de su documento.",
    "Devuelve un único objeto JSON con phrase, kind, title, explanation y example.",
    "phrase debe copiar literalmente un término o frase MUY CORTA del párrafo recibido.",
    "kind solo puede ser concept, example, warning, formula o context.",
    "title debe ser breve y orientado a comprensión.",
    "explanation debe ser clara, directa y corta: máximo 80 palabras. Explica lo difícil, no repitas el párrafo.",
    "example debe ser un ejemplo concreto de máximo 55 palabras cuando ayude; si no aporta valor, null.",
    "Prioriza intuición, mecanismo, notación o posible confusión.",
    "No presentes información externa como si estuviera en la fuente.",
  ].join("\n");
  const user = `DOCUMENTO: ${document.name}\nUNIDAD: ${unit.unit_index}\nPÁGINA: ${unit.page_number ?? "sin paginación estable"}\nBLOQUE: ${blockIndex}\n\nPÁRRAFO:\n${block.text}`;

  let generated: GeneratedAnnotation;
  let provider = "openai";
  let model = "";
  if (getKimiEnvironment()) {
    try {
      const result = await requestKimiJson<GeneratedAnnotation>({ system: instruction, user, maxCompletionTokens: 700 });
      generated = result.data;
      provider = "kimi";
      model = result.model;
    } catch (error) {
      if (!getOpenAIEnvironment()) throw error;
      const result = await requestStructuredOutput<GeneratedAnnotation>({ name: "reader_paragraph_help", schema: readerAnnotationJsonSchema, developer: instruction, user, reasoning: "low", verbosity: "low" });
      generated = result.data;
      provider = "openai";
      model = result.model;
    }
  } else {
    const result = await requestStructuredOutput<GeneratedAnnotation>({ name: "reader_paragraph_help", schema: readerAnnotationJsonSchema, developer: instruction, user, reasoning: "low", verbosity: "low" });
    generated = result.data;
    provider = "openai";
    model = result.model;
  }

  const allowedKinds = new Set<ReaderAnnotationKind>(["concept", "example", "warning", "formula", "context"]);
  if (!generated || !allowedKinds.has(generated.kind) || !phraseExists(block.text, generated.phrase)) {
    throw new Error("La ayuda generada no pudo vincularse de forma segura con este párrafo.");
  }

  const payload = {
    module_id: moduleId,
    document_id: document.id,
    unit_index: unit.unit_index,
    block_index: blockIndex,
    phrase: generated.phrase.trim(),
    kind: generated.kind,
    title: generated.title.trim(),
    explanation: generated.explanation.trim(),
    example: generated.example?.trim() || null,
    provider,
    model,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("reader_annotations")
    .upsert(payload, { onConflict: "document_id,unit_index,block_index" })
    .select("id,block_index,phrase,kind,title,explanation,example,provider,model")
    .single();
  if (insertError) throw insertError;

  return { cached: false, provider, model, annotation: asReaderAnnotation(inserted as Parameters<typeof asReaderAnnotation>[0]), unit: await getReaderUnit(moduleId, unit.unit_index) };
}
