import { NextResponse } from "next/server";
import { generateExperienceForConcept, getExperienceRecord } from "@/lib/experience/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

function idsFromUrl(request: Request) {
  const url = new URL(request.url);
  return { topicId: url.searchParams.get("topicId")?.trim() || "", conceptId: url.searchParams.get("conceptId")?.trim() || "" };
}

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const { topicId, conceptId } = idsFromUrl(request);
    if (!topicId || !conceptId) return NextResponse.json({ error: "topicId y conceptId son obligatorios." }, { status: 400 });
    return NextResponse.json(await getExperienceRecord(id, topicId, conceptId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar la experiencia." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY en .env.local." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { topicId?: string; conceptId?: string };
    const topicId = payload.topicId?.trim() || "";
    const conceptId = payload.conceptId?.trim() || "";
    if (!topicId || !conceptId) return NextResponse.json({ error: "topicId y conceptId son obligatorios." }, { status: 400 });
    return NextResponse.json({ ok: true, ...(await generateExperienceForConcept(id, topicId, conceptId)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar la experiencia." }, { status: 500 });
  }
}
