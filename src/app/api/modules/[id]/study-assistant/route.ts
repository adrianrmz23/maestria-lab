import { NextResponse } from "next/server";
import { runStudyAssistant } from "@/lib/experience/server";
import type { StudyAssistantAction } from "@/lib/experience/types";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };
const actions = new Set<StudyAssistantAction>(["deeper", "example", "python", "question", "connection", "custom"]);

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY en .env.local." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { topicId?: string; conceptId?: string; action?: StudyAssistantAction; question?: string };
    if (!payload.topicId || !payload.conceptId || !payload.action || !actions.has(payload.action)) {
      return NextResponse.json({ error: "Faltan datos del concepto o la acción solicitada." }, { status: 400 });
    }
    if (payload.action === "custom" && !payload.question?.trim()) return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
    return NextResponse.json(await runStudyAssistant(id, payload.topicId, payload.conceptId, payload.action, payload.question));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo completar la consulta de estudio." }, { status: 500 });
  }
}
