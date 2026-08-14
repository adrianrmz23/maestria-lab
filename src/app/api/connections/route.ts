import { NextResponse } from "next/server";
import { generateKnowledgeConnections, getKnowledgeConnections } from "@/lib/connections/server";
import { getKimiEnvironment } from "@/lib/kimi/chat";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    return NextResponse.json(await getKnowledgeConnections());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron consultar las conexiones." }, { status: 500 });
  }
}

export async function POST() {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getKimiEnvironment() && !getOpenAIEnvironment()) return NextResponse.json({ error: "Configura KIMI_API_KEY u OPENAI_API_KEY para descubrir conexiones." }, { status: 503 });
  try {
    return NextResponse.json(await generateKnowledgeConnections());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron generar las conexiones." }, { status: 500 });
  }
}
