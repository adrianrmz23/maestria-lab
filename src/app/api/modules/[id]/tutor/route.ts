import { NextResponse } from "next/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { askTutor, getTutorState } from "@/lib/rag/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const threadId = new URL(request.url).searchParams.get("threadId");
    return NextResponse.json(await getTutorState(id, threadId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar el tutor." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para responder con el Tutor IA." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { message?: string; threadId?: string | null };
    if (!payload.message?.trim()) return NextResponse.json({ error: "Escribe una pregunta para el tutor." }, { status: 400 });
    return NextResponse.json(await askTutor(id, payload.message, payload.threadId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo responder la pregunta." }, { status: 500 });
  }
}
