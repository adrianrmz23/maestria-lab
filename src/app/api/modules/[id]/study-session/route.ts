import { NextResponse } from "next/server";
import type { StudyDuration } from "@/lib/mastery/types";
import { createAdaptiveStudySession, getStudySession } from "@/lib/mastery/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const durations = new Set<StudyDuration>([5, 10, 15, 20, 30, 40, 45]);

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
    return NextResponse.json(await getStudySession(id, sessionId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la sesión." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { durationMinutes?: StudyDuration };
    if (!payload.durationMinutes || !durations.has(payload.durationMinutes)) return NextResponse.json({ error: "Selecciona 5, 10, 15, 20, 30, 40 o 45 minutos." }, { status: 400 });
    return NextResponse.json(await createAdaptiveStudySession(id, payload.durationMinutes));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo preparar la sesión adaptativa." }, { status: 500 });
  }
}
