import { NextResponse } from "next/server";
import { evaluateRecall } from "@/lib/learning-engine/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para evaluar el recuerdo activo." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { topicId?: string; conceptId?: string; response?: string };
    if (!payload.topicId || !payload.conceptId || !payload.response?.trim()) return NextResponse.json({ error: "Escribe lo que recuerdas antes de comprobar." }, { status: 400 });
    return NextResponse.json(await evaluateRecall(id, payload.topicId, payload.conceptId, payload.response));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo evaluar el recuerdo activo." }, { status: 500 });
  }
}
