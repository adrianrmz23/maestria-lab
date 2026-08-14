import { NextResponse } from "next/server";
import { updateStudySession } from "@/lib/mastery/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; sessionId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, sessionId } = await context.params;
    const payload = await request.json() as { status?: "in_progress" | "completed" };
    if (payload.status !== "in_progress" && payload.status !== "completed") return NextResponse.json({ error: "Estado de sesión inválido." }, { status: 400 });
    return NextResponse.json(await updateStudySession(id, sessionId, payload.status));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la sesión." }, { status: 500 });
  }
}
