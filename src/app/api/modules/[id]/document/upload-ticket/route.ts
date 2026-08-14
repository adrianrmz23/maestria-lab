import { NextResponse } from "next/server";
import { DOCUMENT_BUCKET, DOCUMENT_MAX_BYTES, ensureDocumentBucket, getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { normalizeDocumentMime, safeStorageFileName } from "@/lib/supabase/documents";
import type { SourceDocumentMeta } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type TicketPayload = {
  name?: string;
  kind?: SourceDocumentMeta["kind"];
  mimeType?: string;
  size?: number;
  lastModified?: number;
};

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id: moduleId } = await context.params;
    const input = await request.json() as TicketPayload;
    if (!input.name || !input.kind || !input.size || !input.lastModified) {
      return NextResponse.json({ error: "Metadatos de documento incompletos." }, { status: 400 });
    }
    if (input.kind !== "PDF" && input.kind !== "DOCX") {
      return NextResponse.json({ error: "Solo se permiten documentos PDF o DOCX." }, { status: 400 });
    }
    if (input.size > DOCUMENT_MAX_BYTES) {
      return NextResponse.json({ error: "El documento supera el límite de 50 MB." }, { status: 413 });
    }

    const supabase = getSupabaseAdmin();
    const { data: moduleRow, error: moduleError } = await supabase.from("modules").select("id").eq("id", moduleId).maybeSingle();
    if (moduleError) throw moduleError;
    if (!moduleRow) return NextResponse.json({ error: "El módulo no existe." }, { status: 404 });

    const { data: existing, error: existingError } = await supabase.from("documents").select("id").eq("module_id", moduleId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ error: "El módulo ya tiene un documento fuente. Desvincúlalo antes de asociar otro." }, { status: 409 });

    await ensureDocumentBucket();
    const safeName = safeStorageFileName(input.name);
    const storagePath = `${moduleId}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data) throw error ?? new Error("No se pudo crear el permiso temporal de subida.");

    return NextResponse.json({
      bucket: DOCUMENT_BUCKET,
      path: storagePath,
      token: data.token,
      contentType: normalizeDocumentMime(input.kind, input.mimeType),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo preparar la subida." }, { status: 500 });
  }
}
