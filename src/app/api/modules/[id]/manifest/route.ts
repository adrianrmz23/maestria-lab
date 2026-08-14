import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("learning_manifests").select("status,schema_version,model,manifest,topic_count,concept_count,source_unit_count,source_char_count,generation_error,generated_at").eq("module_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "missing", topicCount: 0, conceptCount: 0, sourceUnitCount: 0, sourceCharCount: 0 });
    return NextResponse.json({
      status: data.status,
      schemaVersion: data.schema_version,
      model: data.model ?? undefined,
      manifest: data.manifest ?? undefined,
      topicCount: data.topic_count ?? 0,
      conceptCount: data.concept_count ?? 0,
      sourceUnitCount: data.source_unit_count ?? 0,
      sourceCharCount: data.source_char_count ?? 0,
      generationError: data.generation_error ?? undefined,
      generatedAt: data.generated_at ?? undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar el Learning Manifest." }, { status: 500 });
  }
}
