import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import type { DocumentRow } from "@/lib/supabase/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id: moduleId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.from("documents").select("*").eq("module_id", moduleId).maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: "El módulo no tiene documento fuente." }, { status: 404 });

    const document = row as DocumentRow;
    const download = new URL(request.url).searchParams.get("download") === "1";
    const { data, error: signedError } = await supabase.storage.from(document.storage_bucket).createSignedUrl(
      document.storage_path,
      300,
      download ? { download: document.name } : undefined,
    );
    if (signedError || !data?.signedUrl) throw signedError ?? new Error("No se pudo crear la URL temporal.");

    return NextResponse.json({ url: data.signedUrl, expiresIn: 300 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir el documento." }, { status: 500 });
  }
}
