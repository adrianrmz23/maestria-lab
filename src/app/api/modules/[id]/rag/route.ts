import { NextResponse } from "next/server";
import { buildRagIndex, getRagStatus } from "@/lib/rag/server";
import { getEmbeddingEnvironment } from "@/lib/openai/embeddings";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await getRagStatus(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar el RAG." }, { status: 500 });
  }
}

export async function POST(_: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!getEmbeddingEnvironment()) return NextResponse.json({ error: "Falta OPENAI_API_KEY para crear embeddings." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await buildRagIndex(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo preparar el índice RAG." }, { status: 500 });
  }
}
