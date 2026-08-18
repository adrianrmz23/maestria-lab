import { NextResponse } from "next/server";
import { deleteAcademicTask, generateAcademicTask, getAcademicTask, reinterpretAcademicTask, reviewAcademicTask, saveAcademicTaskVersion, updateAcademicTask } from "@/lib/tasks/server";
import type { AcademicTaskRecord, TaskOutput } from "@/lib/tasks/types";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, taskId } = await context.params;
    return NextResponse.json(await getAcademicTask(id, taskId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la tarea." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, taskId } = await context.params;
    const payload = await request.json().catch(() => ({})) as { action?: "generate" | "review" | "reinterpret" };
    if (payload.action === "review") return NextResponse.json(await reviewAcademicTask(id, taskId));
    if (payload.action === "reinterpret") return NextResponse.json(await reinterpretAcademicTask(id, taskId));
    if (payload.action === "generate") return NextResponse.json(await generateAcademicTask(id, taskId));
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar la acción." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, taskId } = await context.params;
    const payload = await request.json() as { content?: TaskOutput } & Partial<Pick<AcademicTaskRecord, "title" | "instructions" | "rubricText" | "providerPreference" | "qualityMode" | "workMode" | "sourceScope" | "status">>;
    if (payload.content) return NextResponse.json(await saveAcademicTaskVersion(id, taskId, payload.content));
    return NextResponse.json(await updateAcademicTask(id, taskId, payload));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la tarea." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, taskId } = await context.params;
    return NextResponse.json(await deleteAcademicTask(id, taskId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la tarea." }, { status: 500 });
  }
}
