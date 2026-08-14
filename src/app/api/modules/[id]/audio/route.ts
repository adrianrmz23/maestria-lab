import { NextResponse } from "next/server";
import { generateModuleAudioSummary, getElevenLabsEnvironment, getModuleAudioSummaries } from "@/lib/audio/server";
import type { AudioSummaryKind } from "@/lib/audio/types";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await getModuleAudioSummaries(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar el audio del módulo." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getOpenAIEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para crear el guion del resumen." }, { status: 503 });
  const eleven = getElevenLabsEnvironment();
  if (!eleven.configured) return NextResponse.json({ error: "Falta ELEVENLABS_API_KEY." }, { status: 503 });
  if (!eleven.voiceConfigured) return NextResponse.json({ error: "Falta ELEVENLABS_VOICE_ID." }, { status: 503 });

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({})) as { kind?: AudioSummaryKind; force?: boolean };
    const kind: AudioSummaryKind = payload.kind === "study" ? "study" : "short";
    return NextResponse.json(await generateModuleAudioSummary(id, kind, Boolean(payload.force)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar el resumen en audio." }, { status: 500 });
  }
}
