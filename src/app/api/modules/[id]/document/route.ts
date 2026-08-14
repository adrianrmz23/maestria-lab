import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { removeStoredDocument } from "@/lib/supabase/documents";
import type { DocumentRow } from "@/lib/supabase/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id: moduleId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.from("documents").select("*").eq("module_id", moduleId).maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ ok: true });

    const document = row as DocumentRow;
    await removeStoredDocument(document.storage_path, document.storage_bucket);
    const { error: deleteError } = await supabase.from("documents").delete().eq("id", document.id);
    if (deleteError) throw deleteError;
    await supabase.from("modules").update({ updated_at: new Date().toISOString() }).eq("id", moduleId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo desvincular el documento." }, { status: 500 });
  }
}
