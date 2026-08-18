import { NextResponse } from "next/server";
import { evaluateCapstoneProject } from "@/lib/learning-engine/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
type RouteContext = { params: Promise<{ id: string; projectId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para evaluar el proyecto." }, { status: 503 });
  try {
    const { id, projectId } = await context.params;
    const payload = await request.json() as { submission?: string };
    if (!payload.submission?.trim()) return NextResponse.json({ error: "Escribe tu solución antes de evaluar." }, { status: 400 });
    return NextResponse.json(await evaluateCapstoneProject(id, projectId, payload.submission));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo evaluar el proyecto." }, { status: 500 });
  }
}
