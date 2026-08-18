import type { AudioSummaryKind, AudioSummaryResponse, ConceptAudioKind, ConceptAudioResponse } from "@/lib/audio/types";

type ErrorPayload = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getAudioSummaries(moduleId: string) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/audio`, { cache: "no-store" });
  return readJson<AudioSummaryResponse>(response);
}

export async function generateAudioSummary(moduleId: string, kind: AudioSummaryKind, force = false) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, force }),
  });
  return readJson<AudioSummaryResponse>(response);
}

export async function getConceptAudio(moduleId: string, topicId: string, conceptId: string) {
  const query = new URLSearchParams({ topicId, conceptId });
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/audio/concept?${query.toString()}`, { cache: "no-store" });
  return readJson<ConceptAudioResponse>(response);
}

export async function generateConceptAudio(moduleId: string, topicId: string, conceptId: string, kind: ConceptAudioKind = "lesson", force = false) {
  const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/audio/concept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId, conceptId, kind, force }),
  });
  return readJson<ConceptAudioResponse>(response);
}
