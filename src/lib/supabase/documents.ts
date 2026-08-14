import { extractDocument } from "@/lib/extraction/extract-document";
import type { SourceDocumentMeta } from "@/lib/mock-data";
import { DOCUMENT_BUCKET, ensureDocumentBucket, getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapDocumentRow, type DocumentRow } from "@/lib/supabase/mappers";

function humanizeExtractionError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Error desconocido durante la extracción.";

  if (raw.includes("Setting up fake worker failed") || raw.includes("pdf.worker.mjs")) {
    return "No se pudo inicializar el motor de lectura PDF. Reinicia Maestría Lab después de actualizar el proyecto y vuelve a intentar la extracción.";
  }

  return raw;
}

export async function runDocumentExtraction(document: DocumentRow) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("documents")
    .update({ extraction_status: "extracting", extraction_error: null, updated_at: new Date().toISOString() })
    .eq("id", document.id);

  try {
    const { data: blob, error: downloadError } = await supabase.storage.from(document.storage_bucket).download(document.storage_path);
    if (downloadError || !blob) throw downloadError ?? new Error("No se pudo descargar el documento desde Storage.");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const extraction = await extractDocument(buffer, document.kind);

    // La re-extracción invalida cualquier ayuda/RAG derivado de la versión anterior
    // para que el Tutor y el lector nunca trabajen con fragmentos obsoletos.
    const [deleteRag, deleteAnnotations, deleteUnits] = await Promise.all([
      supabase.from("rag_chunks").delete().eq("document_id", document.id),
      supabase.from("reader_annotations").delete().eq("document_id", document.id),
      supabase.from("document_units").delete().eq("document_id", document.id),
    ]);
    const optionalTableMissing = (code?: string) => code === "42P01" || code === "PGRST205" || code === "PGRST204";
    if (deleteRag.error && !optionalTableMissing(deleteRag.error.code)) throw deleteRag.error;
    if (deleteAnnotations.error && !optionalTableMissing(deleteAnnotations.error.code)) throw deleteAnnotations.error;
    if (deleteUnits.error) throw deleteUnits.error;

    if (extraction.units.length) {
      const rows = extraction.units.map((unit) => ({
        document_id: document.id,
        unit_index: unit.unitIndex,
        page_number: unit.pageNumber ?? null,
        label: unit.label,
        content: unit.content,
        char_count: unit.charCount,
      }));
      for (let start = 0; start < rows.length; start += 50) {
        const { error: unitsError } = await supabase.from("document_units").insert(rows.slice(start, start + 50));
        if (unitsError) throw unitsError;
      }
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({
        extraction_status: "ready",
        page_count: extraction.pageCount ?? null,
        unit_count: extraction.units.length,
        char_count: extraction.charCount,
        word_count: extraction.wordCount,
        parser: extraction.parser,
        parser_version: extraction.parserVersion,
        preview_text: extraction.previewText,
        extracted_text: extraction.fullText,
        extraction_error: extraction.warnings.length ? extraction.warnings.slice(0, 8).join(" | ") : null,
        extracted_at: now,
        updated_at: now,
      })
      .eq("id", document.id)
      .select("*")
      .single();

    if (updateError || !updated) throw updateError ?? new Error("No se pudo guardar el resultado de extracción.");
    return mapDocumentRow(updated as DocumentRow);
  } catch (error) {
    const message = humanizeExtractionError(error);
    await supabase
      .from("documents")
      .update({ extraction_status: "error", extraction_error: message, updated_at: new Date().toISOString() })
      .eq("id", document.id);
    throw new Error(message);
  }
}

export function normalizeDocumentMime(kind: SourceDocumentMeta["kind"], mimeType?: string) {
  if (kind === "PDF") return "application/pdf";
  return mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ? mimeType
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export function safeStorageFileName(fileName: string) {
  const extension = fileName.toLowerCase().endsWith(".docx") ? ".docx" : ".pdf";
  const base = fileName
    .replace(/\.(pdf|docx)$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100) || "documento";
  return `${base}${extension}`;
}

export async function removeStoredDocument(storagePath?: string, bucket = DOCUMENT_BUCKET) {
  if (!storagePath) return;
  await ensureDocumentBucket();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw error;
}
