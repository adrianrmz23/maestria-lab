import { NextResponse } from "next/server";
import { addTaskAttachment, removeTaskAttachment } from "@/lib/tasks/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, taskId } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un archivo PDF, DOCX, TXT o MD." }, { status: 400 });
    return NextResponse.json({ source: await addTaskAttachment(id, taskId, file) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar el archivo." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id, taskId } = await context.params;
    const sourceId = new URL(request.url).searchParams.get("sourceId");
    if (!sourceId) return NextResponse.json({ error: "Falta sourceId." }, { status: 400 });
    return NextResponse.json(await removeTaskAttachment(id, taskId, sourceId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar el archivo." }, { status: 500 });
  }
}
