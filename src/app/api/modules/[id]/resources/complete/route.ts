import { NextResponse } from "next/server";
import { RESOURCE_BUCKET, getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { inferResourceType, mapResourceRow, normalizeResourceMime, removeResourceFile, type ResourceRow } from "@/lib/resources/server";
import type { ModuleResourceType } from "@/lib/resources/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type CompletePayload = {
  path?: string; name?: string; mimeType?: string; size?: number; lastModified?: number;
  title?: string; source?: string; resourceType?: ModuleResourceType; topicId?: string | null; conceptId?: string | null; pinned?: boolean;
};

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const { id: moduleId } = await context.params;
  let storagePath = "";
  try {
    const input = await request.json() as CompletePayload;
    storagePath = input.path || "";
    if (!storagePath || !input.name || !input.size || !input.lastModified) return NextResponse.json({ error: "Metadatos del recurso incompletos." }, { status: 400 });
    if (!storagePath.startsWith(`${moduleId}/`)) return NextResponse.json({ error: "La ruta del recurso no pertenece al módulo." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("module_resources").insert({
      module_id: moduleId,
      topic_id: input.topicId || null,
      concept_id: input.conceptId || null,
      title: input.title?.trim() || input.name.replace(/\.[^.]+$/, ""),
      resource_type: input.resourceType || inferResourceType(input.name, input.mimeType),
      source: input.source?.trim() || "NotebookLM",
      original_name: input.name,
      mime_type: normalizeResourceMime(input.name, input.mimeType),
      size_bytes: input.size,
      storage_bucket: RESOURCE_BUCKET,
      storage_path: storagePath,
      pinned: Boolean(input.pinned),
      sort_order: 0,
      created_at: now,
      updated_at: now,
    }).select("*").single();
    if (error || !data) {
      if (error?.code === "42P01" || error?.code === "PGRST205") throw new Error("Falta ejecutar la migración 014_module_resources.sql en Supabase.");
      throw error ?? new Error("No se pudo registrar el recurso.");
    }
    await supabase.from("modules").update({ updated_at: now }).eq("id", moduleId);
    return NextResponse.json({ resource: mapResourceRow(data as ResourceRow) });
  } catch (error) {
    if (storagePath) {
      try { await removeResourceFile(RESOURCE_BUCKET, storagePath); } catch { /* limpieza best-effort */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar el recurso." }, { status: 500 });
  }
}
