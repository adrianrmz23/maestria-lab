import { NextResponse } from "next/server";
import { calculateAndPersistMastery } from "@/lib/mastery/server";
import { getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await calculateAndPersistMastery(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo calcular el dominio." }, { status: 500 });
  }
}
