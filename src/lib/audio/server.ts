import { audioSummaryScriptSchema } from "@/lib/audio/schema";
import type { AudioSummaryKind, AudioSummaryRecord, AudioSummaryResponse } from "@/lib/audio/types";
import { requestStructuredOutput } from "@/lib/openai/responses";
import type { LearningManifest } from "@/lib/pedagogy/types";
import { AUDIO_BUCKET, ensureAudioBucket, getSupabaseAdmin } from "@/lib/supabase/admin";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const SIGNED_URL_SECONDS = 60 * 60 * 6;
const MAX_TTS_CHARS = 9_500;

type AudioScript = {
  title: string;
  script: string;
  topicsCovered: string[];
};

type AudioRow = {
  module_id: string;
  kind: AudioSummaryKind;
  status: "generating" | "ready" | "error";
  title: string | null;
  script_text: string | null;
  script_char_count: number | null;
  estimated_seconds: number | null;
  estimated_credits: number | null;
  provider: string | null;
  model: string | null;
  voice_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  manifest_generated_at: string | null;
  generated_at: string | null;
  generation_error: string | null;
};

export function getElevenLabsEnvironment() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const model = process.env.ELEVENLABS_MODEL?.trim() || "eleven_flash_v2_5";
  return {
    configured: Boolean(apiKey),
    voiceConfigured: Boolean(voiceId),
    apiKey: apiKey || "",
    voiceId: voiceId || "",
    model,
  };
}

function estimatedSeconds(script: string) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(30, Math.round((words / 145) * 60));
}

function estimatedCredits(charCount: number, model: string) {
  return model === "eleven_flash_v2_5" || model === "eleven_flash_v2"
    ? Math.ceil(charCount * 0.5)
    : charCount;
}

function formatManifestForAudio(manifest: LearningManifest) {
  const sections = manifest.topics.map((topic, topicIndex) => {
    const concepts = topic.concepts.map((concept, conceptIndex) => [
      `${topicIndex + 1}.${conceptIndex + 1} ${concept.title}`,
      `Fuente: ${concept.sourceSummary}`,
      `Importancia: ${concept.whyItMatters}`,
      `Explicación accesible: ${concept.easy}`,
      `Aplicación IA: ${concept.applicationAI}`,
    ].join("\n")).join("\n\n");
    return `TEMA ${topicIndex + 1}: ${topic.title}\nResumen: ${topic.summary}\n${concepts}`;
  }).join("\n\n---\n\n");

  return [
    `MÓDULO: ${manifest.moduleTitle}`,
    `MATERIA: ${manifest.subject}`,
    `PANORAMA: ${manifest.overview}`,
    `OBJETIVOS: ${manifest.learningGoals.join("; ")}`,
    "",
    sections,
  ].join("\n");
}

async function generateScript(manifest: LearningManifest, kind: AudioSummaryKind) {
  const short = kind === "short";
  const target = short
    ? "entre 320 y 430 palabras; duración aproximada de 2 a 3 minutos"
    : "entre 720 y 920 palabras; duración aproximada de 5 a 7 minutos";
  const developer = [
    "Eres el editor de audio educativo de Maestría Lab.",
    "Convierte un Learning Manifest académico en un guion oral en español mexicano neutro, claro, preciso y agradable de escuchar.",
    "El guion debe ser autosuficiente: no menciones tablas, botones, páginas ni la interfaz.",
    "No uses Markdown, listas con viñetas, símbolos lógicos sin pronunciar ni abreviaturas difíciles de narrar.",
    "Cuando aparezca notación como p ∧ q, verbalízala de forma natural, por ejemplo: p y q.",
    "No inventes contenido que contradiga el Manifest. Puedes enlazar ideas y usar analogías breves, pero distingue mentalmente explicación de fuente.",
    "Prioriza comprensión: frases relativamente cortas, transiciones naturales y recapitulaciones breves.",
    short
      ? "Haz un resumen ejecutivo de estudio: idea central, conceptos imprescindibles, 1 o 2 aplicaciones y cierre con lo que no debe olvidarse."
      : "Haz un resumen de estudio completo: recorre TODOS los temas del Manifest, explica los conceptos nucleares, relaciones, errores frecuentes y aplicaciones; termina con una recapitulación útil para examen.",
    `Longitud objetivo: ${target}.`,
    `El campo script no puede superar ${MAX_TTS_CHARS} caracteres.`,
  ].join("\n");

  const result = await requestStructuredOutput<AudioScript>({
    name: `audio_summary_${kind}`,
    schema: audioSummaryScriptSchema,
    developer,
    user: formatManifestForAudio(manifest),
    reasoning: "low",
    verbosity: "medium",
  });

  const script = result.data.script.trim();
  if (!script) throw new Error("La IA no generó un guion de audio.");
  if (script.length > MAX_TTS_CHARS) {
    throw new Error(`El guion generado excedió ${MAX_TTS_CHARS.toLocaleString("es-MX")} caracteres. Vuelve a intentarlo.`);
  }
  return { ...result.data, script, openAIModel: result.model };
}

async function synthesizeSpeech(script: string) {
  const environment = getElevenLabsEnvironment();
  if (!environment.configured) throw new Error("Falta ELEVENLABS_API_KEY en las variables de entorno.");
  if (!environment.voiceConfigured) throw new Error("Falta ELEVENLABS_VOICE_ID. Elige una voz de ElevenLabs y agrega su ID a las variables de entorno.");

  const url = `${ELEVENLABS_API_URL}/${encodeURIComponent(environment.voiceId)}?output_format=mp3_44100_128`;
  const body: Record<string, unknown> = {
    text: script,
    model_id: environment.model,
  };
  if (environment.model !== "eleven_multilingual_v2") body.language_code = "es";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": environment.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: { message?: string } | string; message?: string };
    const detail = typeof payload.detail === "string" ? payload.detail : payload.detail?.message;
    throw new Error(detail || payload.message || `ElevenLabs respondió con ${response.status}.`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function currentManifest(moduleId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("learning_manifests")
    .select("status,manifest,generated_at")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "ready" || !data.manifest) {
    throw new Error("Genera primero el Learning Manifest del módulo antes de crear su resumen en audio.");
  }
  return {
    manifest: data.manifest as LearningManifest,
    generatedAt: data.generated_at as string | null,
  };
}

async function rowToRecord(row: AudioRow, manifestGeneratedAt: string | null): Promise<AudioSummaryRecord> {
  const supabase = getSupabaseAdmin();
  let audioUrl: string | undefined;
  if (row.status === "ready" && row.storage_bucket && row.storage_path) {
    const { data, error } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
    if (!error) audioUrl = data?.signedUrl;
  }
  const stale = Boolean(
    manifestGeneratedAt && row.manifest_generated_at &&
    new Date(manifestGeneratedAt).getTime() > new Date(row.manifest_generated_at).getTime()
  );
  return {
    kind: row.kind,
    status: row.status,
    title: row.title || (row.kind === "short" ? "Resumen breve" : "Resumen de estudio"),
    script: row.script_text || "",
    scriptCharCount: Number(row.script_char_count || 0),
    estimatedSeconds: Number(row.estimated_seconds || 0),
    estimatedCredits: Number(row.estimated_credits || 0),
    provider: row.provider || "elevenlabs",
    model: row.model || getElevenLabsEnvironment().model,
    voiceId: row.voice_id || "",
    generatedAt: row.generated_at || undefined,
    manifestGeneratedAt: row.manifest_generated_at || undefined,
    stale,
    error: row.generation_error || undefined,
    audioUrl,
  };
}

export async function getModuleAudioSummaries(moduleId: string): Promise<AudioSummaryResponse> {
  const supabase = getSupabaseAdmin();
  const env = getElevenLabsEnvironment();
  const { data: manifestRow } = await supabase.from("learning_manifests").select("status,generated_at").eq("module_id", moduleId).maybeSingle();
  const { data, error } = await supabase.from("module_audio_summaries").select("*").eq("module_id", moduleId).order("kind");
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("Falta ejecutar la migración 010_module_audio_summaries.sql en Supabase.");
    }
    throw error;
  }
  const summaries = await Promise.all((data as AudioRow[]).map((row) => rowToRecord(row, manifestRow?.generated_at || null)));
  return { configured: env.configured, voiceConfigured: env.voiceConfigured, model: env.model, manifestReady: manifestRow?.status === "ready", summaries };
}

export async function generateModuleAudioSummary(moduleId: string, kind: AudioSummaryKind, force = false) {
  const supabase = getSupabaseAdmin();
  const env = getElevenLabsEnvironment();
  if (!env.configured) throw new Error("Falta ELEVENLABS_API_KEY en Vercel/.env.local.");
  if (!env.voiceConfigured) throw new Error("Falta ELEVENLABS_VOICE_ID en Vercel/.env.local.");
  await ensureAudioBucket();

  const { data: existing, error: existingError } = await supabase.from("module_audio_summaries").select("*").eq("module_id", moduleId).eq("kind", kind).maybeSingle();
  if (existingError && existingError.code !== "PGRST116") {
    if (existingError.code === "42P01" || existingError.code === "PGRST205") throw new Error("Falta ejecutar la migración 010_module_audio_summaries.sql en Supabase.");
    throw existingError;
  }
  const manifest = await currentManifest(moduleId);
  const existingRow = existing as AudioRow | null;
  const stale = Boolean(existingRow?.manifest_generated_at && manifest.generatedAt && new Date(manifest.generatedAt).getTime() > new Date(existingRow.manifest_generated_at).getTime());
  if (existingRow?.status === "ready" && !force && !stale) return getModuleAudioSummaries(moduleId);

  const now = new Date().toISOString();
  const { error: markError } = await supabase.from("module_audio_summaries").upsert({
    module_id: moduleId,
    kind,
    status: "generating",
    generation_error: null,
    updated_at: now,
  }, { onConflict: "module_id,kind" });
  if (markError) throw markError;

  try {
    const generated = await generateScript(manifest.manifest, kind);
    const audio = await synthesizeSpeech(generated.script);
    const stamp = Date.now();
    const storagePath = `${moduleId}/${kind}-${stamp}.mp3`;
    const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(storagePath, audio, {
      contentType: "audio/mpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const charCount = generated.script.length;
    const seconds = estimatedSeconds(generated.script);
    const credits = estimatedCredits(charCount, env.model);
    const generatedAt = new Date().toISOString();
    const { error: saveError } = await supabase.from("module_audio_summaries").upsert({
      module_id: moduleId,
      kind,
      status: "ready",
      title: generated.title,
      script_text: generated.script,
      script_char_count: charCount,
      estimated_seconds: seconds,
      estimated_credits: credits,
      provider: "elevenlabs",
      model: env.model,
      voice_id: env.voiceId,
      storage_bucket: AUDIO_BUCKET,
      storage_path: storagePath,
      manifest_generated_at: manifest.generatedAt,
      generated_at: generatedAt,
      generation_error: null,
      updated_at: generatedAt,
    }, { onConflict: "module_id,kind" });
    if (saveError) throw saveError;

    if (existingRow?.storage_path && existingRow.storage_bucket && existingRow.storage_path !== storagePath) {
      await supabase.storage.from(existingRow.storage_bucket).remove([existingRow.storage_path]);
    }
    return getModuleAudioSummaries(moduleId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el resumen en audio.";
    await supabase.from("module_audio_summaries").upsert({
      module_id: moduleId,
      kind,
      status: "error",
      generation_error: message,
      updated_at: new Date().toISOString(),
    }, { onConflict: "module_id,kind" });
    throw new Error(message);
  }
}

export async function removeModuleAudioFiles(moduleId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("module_audio_summaries").select("storage_bucket,storage_path").eq("module_id", moduleId);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return;
    throw error;
  }
  const grouped = new Map<string, string[]>();
  for (const row of data ?? []) {
    if (!row.storage_bucket || !row.storage_path) continue;
    const paths = grouped.get(row.storage_bucket) ?? [];
    paths.push(row.storage_path);
    grouped.set(row.storage_bucket, paths);
  }
  for (const [bucket, paths] of grouped) {
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) throw removeError;
    }
  }
}
