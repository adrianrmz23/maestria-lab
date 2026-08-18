import { RESOURCE_BUCKET, ensureResourceBucket, getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ModuleResource, ModuleResourceType } from "@/lib/resources/types";

export type ResourceRow = {
  id: string;
  module_id: string;
  topic_id: string | null;
  concept_id: string | null;
  title: string;
  resource_type: ModuleResourceType;
  source: string | null;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
  duration_seconds: number | null;
  pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const RESOURCE_MAX_BYTES = 100 * 1024 * 1024;

const EXTENSION_TYPES: Record<string, ModuleResourceType> = {
  mp3: "audio", m4a: "audio", wav: "audio", ogg: "audio",
  pdf: "pdf",
  doc: "document", docx: "document", txt: "document", md: "document",
  ppt: "presentation", pptx: "presentation",
  png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image",
  mp4: "video", webm: "video", mov: "video",
};

export function inferResourceType(name: string, mimeType?: string): ModuleResourceType {
  const lowerMime = (mimeType || "").toLowerCase();
  if (lowerMime.startsWith("audio/")) return "audio";
  if (lowerMime === "application/pdf") return "pdf";
  if (lowerMime.includes("presentation") || lowerMime.includes("powerpoint")) return "presentation";
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime.startsWith("video/")) return "video";
  if (lowerMime.includes("wordprocessingml") || lowerMime.startsWith("text/")) return "document";
  const extension = name.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TYPES[extension] || "other";
}

export function normalizeResourceMime(name: string, mimeType?: string) {
  if (mimeType?.trim()) return mimeType.trim();
  const extension = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
    mp4: "video/mp4", webm: "video/webm",
    txt: "text/plain", md: "text/markdown",
  };
  return map[extension || ""] || "application/octet-stream";
}

export function safeResourceFileName(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  const extension = dot >= 0 ? fileName.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  const rawBase = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const base = rawBase
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100) || "recurso";
  return `${base}${extension.slice(0, 12)}`;
}

export function mapResourceRow(row: ResourceRow): ModuleResource {
  return {
    id: row.id,
    moduleId: row.module_id,
    topicId: row.topic_id,
    conceptId: row.concept_id,
    title: row.title,
    resourceType: row.resource_type,
    source: row.source || "Recurso externo",
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    externalUrl: row.external_url,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    pinned: Boolean(row.pinned),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function removeModuleResourceFiles(moduleId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("module_resources").select("storage_bucket,storage_path").eq("module_id", moduleId);
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
    if (!paths.length) continue;
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) throw removeError;
  }
}

export async function removeResourceFile(bucket?: string | null, path?: string | null) {
  if (!bucket || !path) return;
  await ensureResourceBucket();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket || RESOURCE_BUCKET).remove([path]);
  if (error) throw error;
}
