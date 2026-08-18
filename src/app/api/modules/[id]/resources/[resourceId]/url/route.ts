import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import type { ResourceRow } from "@/lib/resources/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string; resourceId: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, resourceId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("module_resources").select("*").eq("id", resourceId).eq("module_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "El recurso no existe." }, { status: 404 });
    const resource = data as ResourceRow;
    if (resource.external_url) return NextResponse.json({ url: resource.external_url, expiresIn: 0, external: true });
    if (!resource.storage_bucket || !resource.storage_path) return NextResponse.json({ error: "El recurso no tiene archivo asociado." }, { status: 404 });
    const download = new URL(request.url).searchParams.get("download") === "1";
    const { data: signed, error: signedError } = await supabase.storage.from(resource.storage_bucket).createSignedUrl(
      resource.storage_path,
      900,
      download ? { download: resource.original_name || resource.title } : undefined,
    );
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo abrir el recurso.");
    return NextResponse.json({ url: signed.signedUrl, expiresIn: 900, external: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir el recurso." }, { status: 500 });
  }
}
