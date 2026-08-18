import { NextResponse } from "next/server";
import { getKnowledgeMap } from "@/lib/learning-engine/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try { return NextResponse.json(await getKnowledgeMap()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo construir el mapa de conocimiento." }, { status: 500 }); }
}
