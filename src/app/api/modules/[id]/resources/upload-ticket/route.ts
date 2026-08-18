import { NextResponse } from "next/server";
import { RESOURCE_BUCKET, RESOURCE_MAX_BYTES, ensureResourceBucket, getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { inferResourceType, normalizeResourceMime, safeResourceFileName } from "@/lib/resources/server";
import type { ModuleResourceType } from "@/lib/resources/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type TicketPayload = { name?: string; mimeType?: string; size?: number; lastModified?: number; resourceType?: ModuleResourceType };

export async function POST(request: Request, context: RouteContext) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { id: moduleId } = await context.params;
    const input = await request.json() as TicketPayload;
    if (!input.name || !input.size || !input.lastModified) return NextResponse.json({ error: "Metadatos del recurso incompletos." }, { status: 400 });
    if (input.size > RESOURCE_MAX_BYTES) return NextResponse.json({ error: "El recurso supera el límite de 100 MB." }, { status: 413 });

    const supabase = getSupabaseAdmin();
    const { data: moduleRow, error: moduleError } = await supabase.from("modules").select("id").eq("id", moduleId).maybeSingle();
    if (moduleError) throw moduleError;
    if (!moduleRow) return NextResponse.json({ error: "El módulo no existe." }, { status: 404 });

    await ensureResourceBucket();
    const storagePath = `${moduleId}/${crypto.randomUUID()}-${safeResourceFileName(input.name)}`;
    const { data, error } = await supabase.storage.from(RESOURCE_BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data) throw error ?? new Error("No se pudo crear el permiso temporal de subida.");
    return NextResponse.json({
      bucket: RESOURCE_BUCKET,
      path: storagePath,
      token: data.token,
      contentType: normalizeResourceMime(input.name, input.mimeType),
      inferredType: input.resourceType || inferResourceType(input.name, input.mimeType),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo preparar la subida del recurso." }, { status: 500 });
  }
}
