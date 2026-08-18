import { NextResponse } from "next/server";
import { createNote, deleteNote, getNotes } from "@/lib/learning-engine/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    return NextResponse.json({ notes: await getNotes(id, url.searchParams.get("topicId") || undefined, url.searchParams.get("conceptId") || undefined) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron cargar las notas." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { topicId?: string; conceptId?: string; noteText?: string };
    if (!payload.topicId || !payload.conceptId || !payload.noteText?.trim()) return NextResponse.json({ error: "Faltan datos de la nota." }, { status: 400 });
    return NextResponse.json(await createNote(id, payload.topicId, payload.conceptId, payload.noteText));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la nota." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const noteId = new URL(request.url).searchParams.get("noteId");
    if (!noteId) return NextResponse.json({ error: "Falta noteId." }, { status: 400 });
    return NextResponse.json(await deleteNote(id, noteId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la nota." }, { status: 500 });
  }
}
