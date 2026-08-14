import { NextResponse } from "next/server";
import { generateReaderAnnotation, getReaderUnit } from "@/lib/reader/server";
import { getOpenAIEnvironment } from "@/lib/openai/responses";
import { getKimiEnvironment } from "@/lib/kimi/chat";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const raw = Number(new URL(request.url).searchParams.get("unitIndex") || 1);
    return NextResponse.json(await getReaderUnit(id, Number.isFinite(raw) ? raw : 1));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir el lector." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getKimiEnvironment() && !getOpenAIEnvironment()) return NextResponse.json({ error: "Configura KIMI_API_KEY u OPENAI_API_KEY para generar ayudas de lectura." }, { status: 503 });
  try {
    const { id } = await context.params;
    const payload = await request.json() as { unitIndex?: number; blockIndex?: number };
    if (!payload.unitIndex || payload.unitIndex < 1) return NextResponse.json({ error: "Unidad inválida." }, { status: 400 });
    if (payload.blockIndex === undefined || payload.blockIndex < 0) return NextResponse.json({ error: "Párrafo inválido." }, { status: 400 });
    return NextResponse.json(await generateReaderAnnotation(id, Math.floor(payload.unitIndex), Math.floor(payload.blockIndex)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron generar las ayudas de lectura." }, { status: 500 });
  }
}
