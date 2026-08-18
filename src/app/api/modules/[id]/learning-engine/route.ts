import { NextResponse } from "next/server";
import { getLearningDashboard, trackConceptProgress } from "@/lib/learning-engine/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await getLearningDashboard(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar el motor de aprendizaje." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { topicId?: string; conceptId?: string; event?: "view" | "lab" | "practice"; score?: number };
    if (!payload.topicId || !payload.conceptId || !payload.event || !["view", "lab", "practice"].includes(payload.event)) return NextResponse.json({ error: "Faltan datos del progreso." }, { status: 400 });
    return NextResponse.json(await trackConceptProgress(id, payload.topicId, payload.conceptId, payload.event, payload.score));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el progreso." }, { status: 500 });
  }
}
