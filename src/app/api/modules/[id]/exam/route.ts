import { NextResponse } from "next/server";
import type { ExamMode } from "@/lib/mastery/types";
import { createExamSession, getExamSession } from "@/lib/mastery/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };
const modes = new Set<ExamMode>(["quick", "review", "full", "reinforcement"]);

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
    return NextResponse.json(await getExamSession(id, sessionId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la evaluación." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY en .env.local." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { mode?: ExamMode };
    if (!payload.mode || !modes.has(payload.mode)) return NextResponse.json({ error: "Selecciona un modo de evaluación válido." }, { status: 400 });
    return NextResponse.json(await createExamSession(id, payload.mode));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar la evaluación." }, { status: 500 });
  }
}
