import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { mapResourceRow, removeResourceFile, type ResourceRow } from "@/lib/resources/server";
import type { UpdateModuleResourceInput } from "@/lib/resources/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string; resourceId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, resourceId } = await context.params;
    const input = await request.json() as UpdateModuleResourceInput;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof input.title === "string" && input.title.trim()) updates.title = input.title.trim();
    if (typeof input.source === "string") updates.source = input.source.trim();
    if (input.resourceType) updates.resource_type = input.resourceType;
    if (input.topicId !== undefined) updates.topic_id = input.topicId || null;
    if (input.conceptId !== undefined) updates.concept_id = input.conceptId || null;
    if (typeof input.pinned === "boolean") updates.pinned = input.pinned;
    if (typeof input.sortOrder === "number") updates.sort_order = Math.round(input.sortOrder);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("module_resources").update(updates).eq("id", resourceId).eq("module_id", id).select("*").single();
    if (error || !data) throw error ?? new Error("No se pudo actualizar el recurso.");
    return NextResponse.json({ resource: mapResourceRow(data as ResourceRow) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el recurso." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, resourceId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("module_resources").select("storage_bucket,storage_path").eq("id", resourceId).eq("module_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "El recurso no existe." }, { status: 404 });
    await removeResourceFile(data.storage_bucket, data.storage_path);
    const { error: deleteError } = await supabase.from("module_resources").delete().eq("id", resourceId).eq("module_id", id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar el recurso." }, { status: 500 });
  }
}
