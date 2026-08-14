import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id: moduleId } = await context.params;
    const url = new URL(request.url);
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") || 8)));
    const supabase = getSupabaseAdmin();

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, extraction_status, unit_count")
      .eq("module_id", moduleId)
      .maybeSingle();
    if (documentError) throw documentError;
    if (!document) return NextResponse.json({ error: "El módulo no tiene documento fuente." }, { status: 404 });
    if (document.extraction_status !== "ready") return NextResponse.json({ error: "La extracción todavía no está lista." }, { status: 409 });

    const { data: units, error: unitsError, count } = await supabase
      .from("document_units")
      .select("unit_index, page_number, label, content, char_count", { count: "exact" })
      .eq("document_id", document.id)
      .order("unit_index", { ascending: true })
      .range(offset, offset + limit - 1);
    if (unitsError) throw unitsError;

    return NextResponse.json({
      units: units ?? [],
      total: count ?? document.unit_count ?? 0,
      offset,
      limit,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar la extracción." }, { status: 500 });
  }
}
