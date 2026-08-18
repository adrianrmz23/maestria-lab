import { NextResponse } from "next/server";
import { createAcademicTask, listAcademicTasks } from "@/lib/tasks/server";
import type { AcademicTaskType, TaskProvider, TaskQuality, TaskSourceScope, TaskWorkMode } from "@/lib/tasks/types";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await listAcademicTasks(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron cargar las tareas." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as {
      title?: string;
      taskType?: AcademicTaskType;
      instructions?: string;
      rubricText?: string;
      providerPreference?: TaskProvider;
      qualityMode?: TaskQuality;
      workMode?: TaskWorkMode;
      sourceScope?: Partial<TaskSourceScope>;
    };
    const taskType = payload.taskType || "custom";
    if (!payload.instructions?.trim()) return NextResponse.json({ error: "Pega las instrucciones de la tarea." }, { status: 400 });
    return NextResponse.json(await createAcademicTask(id, {
      title: payload.title,
      taskType,
      instructions: payload.instructions,
      rubricText: payload.rubricText,
      providerPreference: payload.providerPreference,
      qualityMode: payload.qualityMode,
      workMode: payload.workMode,
      sourceScope: payload.sourceScope,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la tarea." }, { status: 500 });
  }
}
