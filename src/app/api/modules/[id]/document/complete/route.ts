import { NextResponse } from "next/server";
import { DOCUMENT_BUCKET, getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { normalizeDocumentMime, removeStoredDocument, runDocumentExtraction } from "@/lib/supabase/documents";
import { mapDocumentRow, type DocumentRow } from "@/lib/supabase/mappers";
import type { SourceDocumentMeta } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

type CompletePayload = {
  path?: string;
  name?: string;
  kind?: SourceDocumentMeta["kind"];
  mimeType?: string;
  size?: number;
  lastModified?: number;
};

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  const { id: moduleId } = await context.params;
  let storagePath = "";

  try {
    const input = await request.json() as CompletePayload;
    storagePath = input.path ?? "";
    if (!storagePath || !input.name || !input.kind || !input.size || !input.lastModified) {
      return NextResponse.json({ error: "Metadatos de documento incompletos." }, { status: 400 });
    }
    if (!storagePath.startsWith(`${moduleId}/`)) {
      return NextResponse.json({ error: "La ruta del documento no pertenece al módulo." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase.from("documents").select("id").eq("module_id", moduleId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ error: "El módulo ya tiene un documento fuente." }, { status: 409 });

    const now = new Date().toISOString();
    const { data: documentRow, error: insertError } = await supabase.from("documents").insert({
      module_id: moduleId,
      name: input.name,
      kind: input.kind,
      mime_type: normalizeDocumentMime(input.kind, input.mimeType),
      size_bytes: input.size,
      last_modified: input.lastModified,
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: storagePath,
      extraction_status: "pending",
      created_at: now,
      updated_at: now,
    }).select("*").single();
    if (insertError || !documentRow) throw insertError ?? new Error("No se pudo registrar el documento.");

    try {
      const extracted = await runDocumentExtraction(documentRow as DocumentRow);
      await supabase.from("modules").update({ updated_at: new Date().toISOString() }).eq("id", moduleId);
      return NextResponse.json({ document: extracted, extractionOk: true });
    } catch (extractionError) {
      const { data: failed } = await supabase.from("documents").select("*").eq("id", (documentRow as DocumentRow).id).single();
      await supabase.from("modules").update({ updated_at: new Date().toISOString() }).eq("id", moduleId);
      return NextResponse.json({
        document: failed ? mapDocumentRow(failed as DocumentRow) : mapDocumentRow(documentRow as DocumentRow),
        extractionOk: false,
        warning: extractionError instanceof Error ? extractionError.message : "La extracción no pudo completarse.",
      });
    }
  } catch (error) {
    if (storagePath) {
      try { await removeStoredDocument(storagePath); } catch { /* limpieza best-effort */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo completar el registro del documento." }, { status: 500 });
  }
}
