import { NextResponse } from "next/server";
import { generateCapstoneProject, getProjects } from "@/lib/learning-engine/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try { const { id } = await context.params; return NextResponse.json({ projects: await getProjects(id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron cargar los proyectos." }, { status: 500 }); }
}

export async function POST(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para generar el proyecto integrador." }, { status: 503 });
  try { const { id } = await context.params; return NextResponse.json(await generateCapstoneProject(id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar el proyecto." }, { status: 500 }); }
}
