import { NextResponse } from "next/server";
import { slugifyModuleTitle } from "@/lib/module-utils";
import { getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";
import { mapModuleRow, type DocumentRow, type ModuleRow } from "@/lib/supabase/mappers";
import type { ModuleStatus, StudyModule } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function uniqueSlug(title: string, preferred?: string) {
  const supabase = getSupabaseAdmin();
  const base = (preferred?.trim() || slugifyModuleTitle(title)) || "modulo";
  let slug = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase.from("modules").select("id").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!data) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function GET() {
  if (!getSupabaseEnvironment()) return NextResponse.json({ configured: false, modules: [] }, { status: 503 });

  try {
    const supabase = getSupabaseAdmin();
    const [{ data: moduleRows, error: moduleError }, { data: documentRows, error: documentError }] = await Promise.all([
      supabase.from("modules").select("*").order("updated_at", { ascending: false }),
      supabase.from("documents").select("*"),
    ]);

    if (moduleError) throw moduleError;
    if (documentError) throw documentError;

    const documentsByModule = new Map((documentRows as DocumentRow[] | null)?.map((row) => [row.module_id, row]) ?? []);
    const modules = ((moduleRows as ModuleRow[] | null) ?? []).map((row) => mapModuleRow(row, documentsByModule.get(row.id)));
    return NextResponse.json({ configured: true, modules });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron cargar los módulos." }, { status: 500 });
  }
}

type CreatePayload = {
  title?: string;
  subject?: string;
  description?: string;
  importedModule?: StudyModule;
};

export async function POST(request: Request) {
  if (!getSupabaseEnvironment()) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  try {
    const payload = await request.json() as CreatePayload;
    const imported = payload.importedModule;
    const title = (imported?.title ?? payload.title ?? "").trim();
    const subject = (imported?.subject ?? payload.subject ?? "").trim();
    if (!title || !subject) return NextResponse.json({ error: "Título y materia son obligatorios." }, { status: 400 });

    const supabase = getSupabaseAdmin();

    if (imported?.id) {
      const { data: existing, error: existingError } = await supabase.from("modules").select("*").eq("id", imported.id).maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        const current = existing as ModuleRow;
        const importedTime = new Date(imported.updatedAt).getTime();
        const currentTime = new Date(current.updated_at).getTime();
        if (Number.isFinite(importedTime) && importedTime > currentTime) {
          const { data: updated, error: updateError } = await supabase.from("modules").update({
            title: imported.title.trim(),
            subject: imported.subject.trim(),
            description: imported.description.trim(),
            progress: imported.progress,
            topics: imported.topics,
            status: imported.status,
            updated_at: imported.updatedAt,
          }).eq("id", imported.id).select("*").single();
          if (updateError) throw updateError;
          return NextResponse.json({ module: mapModuleRow(updated as ModuleRow) });
        }
        return NextResponse.json({ module: mapModuleRow(current) });
      }
    }

    const now = new Date().toISOString();
    const id = imported?.id || crypto.randomUUID();
    const slug = await uniqueSlug(title, imported?.slug);
    const row = {
      id,
      slug,
      title,
      subject,
      description: (imported?.description ?? payload.description ?? "").trim() || "Módulo académico preparado para recibir contenido, práctica y seguimiento de dominio.",
      progress: imported?.progress ?? 0,
      topics: imported?.topics ?? 0,
      status: (imported?.status ?? "Nuevo") as ModuleStatus,
      created_at: imported?.createdAt ?? now,
      updated_at: imported?.updatedAt ?? now,
    };

    const { data, error } = await supabase.from("modules").insert(row).select("*").single();
    if (error) throw error;
    return NextResponse.json({ module: mapModuleRow(data as ModuleRow) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el módulo." }, { status: 500 });
  }
}
