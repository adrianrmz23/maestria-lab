import { NextResponse } from "next/server";
import { ensureDocumentBucket, getSupabaseAdmin, getSupabaseEnvironment } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getSupabaseEnvironment();
  const audioConfigured = Boolean(process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim());
  const audioModel = process.env.ELEVENLABS_MODEL?.trim() || "eleven_flash_v2_5";
  if (!environment) {
    return NextResponse.json({
      appVersion: "1.0.8",
      pdfParser: "unpdf-serverless",
      configured: false,
      audioConfigured,
      audioModel,
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
        appVersion: "1.0.8",
        pdfParser: "unpdf-serverless",
        configured: true,
        audioConfigured,
        audioModel,
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
      appVersion: "1.0.8",
      pdfParser: "unpdf-serverless",
      configured: true,
      audioConfigured,
      audioModel,
      databaseReady: true,
      storageReady: true,
      supabaseUrl: environment.url,
      publishableKey: environment.publishableKey,
      message: "Supabase conectado. Persistencia y Storage están listos.",
    });
  } catch (error) {
    return NextResponse.json({
      appVersion: "1.0.8",
      pdfParser: "unpdf-serverless",
      configured: true,
      audioConfigured,
      audioModel,
      databaseReady: false,
      storageReady: false,
      supabaseUrl: environment.url,
      publishableKey: environment.publishableKey,
      message: "No se pudo completar la comprobación de Supabase.",
      detail: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}
