import { NextResponse } from "next/server";
import { generateConceptAudioSummary, getConceptAudioSummary, getElevenLabsEnvironment } from "@/lib/audio/server";
import type { ConceptAudioKind } from "@/lib/audio/types";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const topicId = url.searchParams.get("topicId")?.trim();
    const conceptId = url.searchParams.get("conceptId")?.trim();
    if (!topicId || !conceptId) {
      return NextResponse.json({ error: "Faltan topicId o conceptId." }, { status: 400 });
    }
    return NextResponse.json(await getConceptAudioSummary(id, topicId, conceptId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar el audio de la lección." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para crear el guion del audio." }, { status: 503 });
  const eleven = getElevenLabsEnvironment();
  if (!eleven.configured) return NextResponse.json({ error: "Falta ELEVENLABS_API_KEY." }, { status: 503 });
  if (!eleven.voiceConfigured) return NextResponse.json({ error: "Falta ELEVENLABS_VOICE_ID." }, { status: 503 });

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({})) as { topicId?: string; conceptId?: string; kind?: ConceptAudioKind; force?: boolean };
    if (!payload.topicId?.trim() || !payload.conceptId?.trim()) {
      return NextResponse.json({ error: "Faltan topicId o conceptId." }, { status: 400 });
    }
    const kind: ConceptAudioKind = "lesson";
    return NextResponse.json(await generateConceptAudioSummary(id, payload.topicId.trim(), payload.conceptId.trim(), kind, Boolean(payload.force)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar el audio de la lección." }, { status: 500 });
  }
}
