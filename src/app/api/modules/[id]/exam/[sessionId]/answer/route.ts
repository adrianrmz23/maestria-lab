import { NextResponse } from "next/server";
import { evaluateExamAnswer } from "@/lib/mastery/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string; sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, sessionId } = await context.params;
    const payload = await request.json() as { questionId?: string; answer?: string };
    if (!payload.questionId || typeof payload.answer !== "string") return NextResponse.json({ error: "Faltan datos de la respuesta." }, { status: 400 });
    return NextResponse.json(await evaluateExamAnswer(id, sessionId, payload.questionId, payload.answer));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo evaluar la respuesta." }, { status: 500 });
  }
}
