import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENT_BUCKET = "maestria-documents";
export const AUDIO_BUCKET = "maestria-audio";
export const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;

let adminClient: SupabaseClient | null = null;

export type SupabaseEnvironment = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

export function getSupabaseEnvironment(): SupabaseEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !publishableKey || !secretKey) return null;
  return { url, publishableKey, secretKey };
}

export function getSupabaseAdmin() {
  const environment = getSupabaseEnvironment();
  if (!environment) {
    throw new Error("Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY.");
  }

  if (!adminClient) {
    adminClient = createClient(environment.url, environment.secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}

export async function ensureDocumentBucket() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.getBucket(DOCUMENT_BUCKET);

  if (!error && data) return data;

  const message = error?.message?.toLowerCase() ?? "";
  const missing = message.includes("not found") || message.includes("does not exist") || message.includes("404");
  if (error && !missing) throw error;

  const { data: created, error: createError } = await supabase.storage.createBucket(DOCUMENT_BUCKET, {
    public: false,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    fileSizeLimit: DOCUMENT_MAX_BYTES,
  });

  if (createError) throw createError;
  return created;
}
export async function ensureAudioBucket() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.getBucket(AUDIO_BUCKET);

  if (!error && data) return data;

  const message = error?.message?.toLowerCase() ?? "";
  const missing = message.includes("not found") || message.includes("does not exist") || message.includes("404");
  if (error && !missing) throw error;

  const { data: created, error: createError } = await supabase.storage.createBucket(AUDIO_BUCKET, {
    public: false,
    allowedMimeTypes: ["audio/mpeg"],
    fileSizeLimit: AUDIO_MAX_BYTES,
  });

  if (createError) throw createError;
  return created;
}

