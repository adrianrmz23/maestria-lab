import { NextResponse } from "next/server";
import { generateManifestForModule } from "@/lib/pedagogy/generate-manifest";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY en .env.local." }, { status: 503 });
  try {
    const { id } = await context.params;
    const result = await generateManifestForModule(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar el Learning Manifest." }, { status: 500 });
  }
}
