import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { runDocumentExtraction } from "@/lib/supabase/documents";
import { mapDocumentRow, type DocumentRow } from "@/lib/supabase/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const { id: moduleId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.from("documents").select("*").eq("module_id", moduleId).maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: "El módulo no tiene documento fuente." }, { status: 404 });

    try {
      const document = await runDocumentExtraction(row as DocumentRow);
      return NextResponse.json({ document, extractionOk: true });
    } catch (extractionError) {
      const { data: failed } = await supabase.from("documents").select("*").eq("module_id", moduleId).single();
      return NextResponse.json({
        document: failed ? mapDocumentRow(failed as DocumentRow) : undefined,
        extractionOk: false,
        warning: extractionError instanceof Error ? extractionError.message : "No se pudo extraer el documento.",
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo reintentar la extracción." }, { status: 500 });
  }
}
