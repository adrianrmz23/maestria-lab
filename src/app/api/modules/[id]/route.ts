import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { removeStoredDocument } from "@/lib/supabase/documents";
import { mapModuleRow, type DocumentRow, type ModuleRow } from "@/lib/supabase/mappers";
import type { ModuleStatus } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type PatchPayload = {
  title?: string;
  subject?: string;
  description?: string;
  progress?: number;
  topics?: number;
  status?: ModuleStatus;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id } = await context.params;
    const input = await request.json() as PatchPayload;
    const supabase = getSupabaseAdmin();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof input.title === "string" && input.title.trim()) updates.title = input.title.trim();
    if (typeof input.subject === "string" && input.subject.trim()) updates.subject = input.subject.trim();
    if (typeof input.description === "string") updates.description = input.description.trim();
    if (typeof input.topics === "number") updates.topics = Math.max(0, Math.round(input.topics));
    if (typeof input.progress === "number") {
      const progress = Math.min(100, Math.max(0, Math.round(input.progress)));
      updates.progress = progress;
      if (input.status === undefined) updates.status = progress === 100 ? "Completado" : progress > 0 ? "En curso" : "Nuevo";
    }
    if (input.status) updates.status = input.status;

    const { data, error } = await supabase.from("modules").update(updates).eq("id", id).select("*").single();
    if (error) throw error;

    const { data: documentRow } = await supabase.from("documents").select("*").eq("module_id", id).maybeSingle();
    return NextResponse.json({ module: mapModuleRow(data as ModuleRow, documentRow as DocumentRow | undefined) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el módulo." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: documentRow, error: documentError } = await supabase.from("documents").select("*").eq("module_id", id).maybeSingle();
    if (documentError) throw documentError;

    if (documentRow) {
      // Para una limpieza real, Storage se elimina antes que la fila. Si falla, detenemos
      // la operación en vez de dejar un archivo huérfano que después sea difícil rastrear.
      await removeStoredDocument((documentRow as DocumentRow).storage_path, (documentRow as DocumentRow).storage_bucket);
    }

    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar el módulo." }, { status: 500 });
  }
}
