import type { LearningManifestRecord } from "@/lib/pedagogy/types";

type ErrorPayload = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getLearningManifest(moduleId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/manifest`, { cache: "no-store" });
  return readJson<LearningManifestRecord>(response);
}

export async function generateLearningManifest(moduleId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/manifest/generate`, { method: "POST" });
  return readJson<{ ok: boolean }>(response);
}
