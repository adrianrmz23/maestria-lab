import { NextResponse } from "next/server";
import { ensureDocumentBucket, getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getSupabaseEnvironment();
  if (!environment) {
    return NextResponse.json({
      appVersion: "1.0.4",
      pdfParser: "unpdf-serverless",
      configured: false,
      databaseReady: false,
      storageReady: false,
      message: "Faltan variables de Supabase. La app continuará en modo local.",
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error: databaseError } = await supabase.from("modules").select("id", { head: true, count: "exact" });
    if (databaseError) {
      return NextResponse.json({
        appVersion: "1.0.4",
        pdfParser: "unpdf-serverless",
        configured: true,
        databaseReady: false,
        storageReady: false,
        supabaseUrl: environment.url,
        publishableKey: environment.publishableKey,
        message: "Supabase responde, pero falta aplicar la migración SQL del Bloque 4.",
        detail: databaseError.message,
      });
    }

    await ensureDocumentBucket();
    return NextResponse.json({
      appVersion: "1.0.4",
      pdfParser: "unpdf-serverless",
      configured: true,
      databaseReady: true,
      storageReady: true,
      supabaseUrl: environment.url,
      publishableKey: environment.publishableKey,
      message: "Supabase conectado. Persistencia y Storage están listos.",
    });
  } catch (error) {
    return NextResponse.json({
      appVersion: "1.0.4",
      pdfParser: "unpdf-serverless",
      configured: true,
      databaseReady: false,
      storageReady: false,
      supabaseUrl: environment.url,
      publishableKey: environment.publishableKey,
      message: "No se pudo completar la comprobación de Supabase.",
      detail: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}
