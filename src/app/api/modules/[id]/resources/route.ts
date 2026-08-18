import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { inferResourceType, mapResourceRow, type ResourceRow } from "@/lib/resources/server";
import type { CreateExternalResourceInput, ModuleResourceType } from "@/lib/resources/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function missingTable(error: { code?: string } | null | undefined) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function GET(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const topicId = url.searchParams.get("topicId")?.trim();
    const conceptId = url.searchParams.get("conceptId")?.trim();
    const supabase = getSupabaseAdmin();
    let query = supabase.from("module_resources").select("*").eq("module_id", id);
    if (topicId) query = query.eq("topic_id", topicId);
    if (conceptId) query = query.eq("concept_id", conceptId);
    const { data, error } = await query.order("pinned", { ascending: false }).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) {
      if (missingTable(error)) throw new Error("Falta ejecutar la migración 014_module_resources.sql en Supabase.");
      throw error;
    }
    return NextResponse.json({ resources: (data as ResourceRow[]).map(mapResourceRow) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron cargar los recursos." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id } = await context.params;
    const input = await request.json() as CreateExternalResourceInput;
    const externalUrl = input.externalUrl?.trim();
    if (!externalUrl) return NextResponse.json({ error: "Agrega una URL para el recurso externo." }, { status: 400 });
    let parsed: URL;
    try { parsed = new URL(externalUrl); } catch { return NextResponse.json({ error: "La URL del recurso no es válida." }, { status: 400 }); }
    if (!/^https?:$/.test(parsed.protocol)) return NextResponse.json({ error: "Solo se permiten enlaces http/https." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: moduleRow, error: moduleError } = await supabase.from("modules").select("id").eq("id", id).maybeSingle();
    if (moduleError) throw moduleError;
    if (!moduleRow) return NextResponse.json({ error: "El módulo no existe." }, { status: 404 });

    const now = new Date().toISOString();
    const resourceType: ModuleResourceType = input.resourceType || inferResourceType(parsed.pathname || "recurso");
    const { data, error } = await supabase.from("module_resources").insert({
      module_id: id,
      topic_id: input.topicId || null,
      concept_id: input.conceptId || null,
      title: input.title?.trim() || parsed.hostname,
      resource_type: resourceType === "other" ? "link" : resourceType,
      source: input.source?.trim() || "Enlace externo",
      external_url: externalUrl,
      pinned: Boolean(input.pinned),
      sort_order: 0,
      created_at: now,
      updated_at: now,
    }).select("*").single();
    if (error || !data) {
      if (missingTable(error)) throw new Error("Falta ejecutar la migración 014_module_resources.sql en Supabase.");
      throw error ?? new Error("No se pudo guardar el recurso.");
    }
    return NextResponse.json({ resource: mapResourceRow(data as ResourceRow) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el recurso." }, { status: 500 });
  }
}
