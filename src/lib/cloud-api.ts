import { createClient } from "@supabase/supabase-js";
import type { SourceDocumentMeta, StudyModule } from "@/lib/mock-data";
import { documentKindFromName, validateSourceDocument } from "@/lib/document-storage";

export type CloudStatus = {
  configured: boolean;
  databaseReady: boolean;
  storageReady: boolean;
  supabaseUrl?: string;
  publishableKey?: string;
  message: string;
  detail?: string;
};

type ApiErrorPayload = { error?: string; warning?: string };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ApiErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getCloudStatus(): Promise<CloudStatus> {
  const response = await fetch("/api/system/status", { cache: "no-store" });
  return readJson<CloudStatus>(response);
}

export async function getCloudModules() {
  const response = await fetch("/api/modules", { cache: "no-store" });
  return readJson<{ configured: boolean; modules: StudyModule[] }>(response);
}

export async function createCloudModule(input: { title: string; subject: string; description?: string }) {
  const response = await fetch("/api/modules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readJson<{ module: StudyModule }>(response)).module;
}

export async function importCloudModule(module: StudyModule) {
  const response = await fetch("/api/modules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ importedModule: module }),
  });
  return (await readJson<{ module: StudyModule }>(response)).module;
}

export async function updateCloudModule(id: string, input: Partial<Pick<StudyModule, "title" | "subject" | "description" | "progress" | "topics" | "status">>) {
  const response = await fetch(`/api/modules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readJson<{ module: StudyModule }>(response)).module;
}

export async function removeCloudModule(id: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(id)}`, { method: "DELETE" });
  await readJson<{ ok: boolean }>(response);
}

export async function attachCloudDocument(
  status: CloudStatus,
  moduleId: string,
  file: File,
): Promise<{ document: SourceDocumentMeta; extractionOk: boolean; warning?: string }> {
  const validationError = validateSourceDocument(file);
  if (validationError) throw new Error(validationError);
  if (!status.supabaseUrl || !status.publishableKey) throw new Error("Falta la configuración pública necesaria para subir a Storage.");

  const kind = documentKindFromName(file.name);
  const metadata = {
    name: file.name,
    kind,
    mimeType: file.type,
    size: file.size,
    lastModified: file.lastModified,
  };

  const ticketResponse = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/document/upload-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const ticket = await readJson<{ bucket: string; path: string; token: string; contentType: string }>(ticketResponse);

  const supabase = createClient(status.supabaseUrl, status.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error: uploadError } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: ticket.contentType,
      cacheControl: "3600",
    });
  if (uploadError) throw new Error(uploadError.message);

  const completeResponse = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/document/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...metadata, path: ticket.path }),
  });
  return readJson<{ document: SourceDocumentMeta; extractionOk: boolean; warning?: string }>(completeResponse);
}

export async function detachCloudDocument(moduleId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/document`, { method: "DELETE" });
  await readJson<{ ok: boolean }>(response);
}

export async function retryCloudExtraction(moduleId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/document/retry`, { method: "POST" });
  return readJson<{ document?: SourceDocumentMeta; extractionOk: boolean; warning?: string }>(response);
}

export async function getCloudDocumentUrl(moduleId: string, download = false) {
  const suffix = download ? "?download=1" : "";
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/document/url${suffix}`, { cache: "no-store" });
  return (await readJson<{ url: string; expiresIn: number }>(response)).url;
}
