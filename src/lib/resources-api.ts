import { createClient } from "@supabase/supabase-js";
import { getCloudStatus } from "@/lib/cloud-api";
import type { CreateExternalResourceInput, ModuleResource, ModuleResourceType, UpdateModuleResourceInput } from "@/lib/resources/types";

type ErrorPayload = { error?: string };
async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getModuleResources(moduleId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources`, { cache: "no-store" });
  return readJson<{ resources: ModuleResource[] }>(response);
}

export async function createExternalModuleResource(moduleId: string, input: CreateExternalResourceInput) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readJson<{ resource: ModuleResource }>(response)).resource;
}

export async function uploadModuleResource(moduleId: string, file: File, options?: {
  title?: string;
  source?: string;
  resourceType?: ModuleResourceType;
  topicId?: string | null;
  conceptId?: string | null;
  pinned?: boolean;
}) {
  const status = await getCloudStatus();
  if (!status.configured || !status.databaseReady || !status.storageReady || !status.supabaseUrl || !status.publishableKey) {
    throw new Error("Los recursos adicionales requieren Supabase activo para guardarse en Storage.");
  }
  const metadata = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified,
    title: options?.title?.trim() || file.name.replace(/\.[^.]+$/, ""),
    source: options?.source?.trim() || "NotebookLM",
    resourceType: options?.resourceType,
    topicId: options?.topicId || null,
    conceptId: options?.conceptId || null,
    pinned: options?.pinned ?? false,
  };

  const ticketResponse = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources/upload-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const ticket = await readJson<{ bucket: string; path: string; token: string; contentType: string; inferredType: ModuleResourceType }>(ticketResponse);

  const supabase = createClient(status.supabaseUrl, status.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: uploadError } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, {
    contentType: ticket.contentType,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(uploadError.message);

  const completeResponse = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...metadata, path: ticket.path, resourceType: metadata.resourceType || ticket.inferredType }),
  });
  return (await readJson<{ resource: ModuleResource }>(completeResponse)).resource;
}

export async function updateModuleResource(moduleId: string, resourceId: string, input: UpdateModuleResourceInput) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources/${encodeURIComponent(resourceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readJson<{ resource: ModuleResource }>(response)).resource;
}

export async function deleteModuleResource(moduleId: string, resourceId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources/${encodeURIComponent(resourceId)}`, { method: "DELETE" });
  return readJson<{ ok: boolean }>(response);
}

export async function getModuleResourceUrl(moduleId: string, resourceId: string, download = false) {
  const suffix = download ? "?download=1" : "";
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/resources/${encodeURIComponent(resourceId)}/url${suffix}`, { cache: "no-store" });
  return readJson<{ url: string; expiresIn: number; external: boolean }>(response);
}
