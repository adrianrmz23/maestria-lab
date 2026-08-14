import { NextResponse } from "next/server";
import { evaluatePracticeAnswer } from "@/lib/experience/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { topicId?: string; conceptId?: string; exerciseId?: string; answer?: string; exerciseType?: string };
    if (!payload.topicId || !payload.conceptId || !payload.exerciseId || typeof payload.answer !== "string") {
      return NextResponse.json({ error: "Faltan datos del ejercicio." }, { status: 400 });
    }
    if (payload.exerciseType === "short_answer" && !getOpenAIEnvironment()) {
      return NextResponse.json({ error: "Las respuestas abiertas requieren OPENAI_API_KEY." }, { status: 503 });
    }
    return NextResponse.json(await evaluatePracticeAnswer(id, payload.topicId, payload.conceptId, payload.exerciseId, payload.answer));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo evaluar la respuesta." }, { status: 500 });
  }
}
