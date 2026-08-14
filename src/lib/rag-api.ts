import type { RagStatus, TutorState, TutorAnswer } from "@/lib/rag/types";

type ErrorPayload = { error?: string };
async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getRagStatus(moduleId: string) {
  return readJson<RagStatus>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/rag`, { cache: "no-store" }));
}

export async function buildRagIndex(moduleId: string) {
  return readJson<RagStatus>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/rag`, { method: "POST" }));
}

export async function getTutorState(moduleId: string, threadId?: string) {
  const query = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
  return readJson<TutorState>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tutor${query}`, { cache: "no-store" }));
}

export async function askTutor(moduleId: string, message: string, threadId?: string | null) {
  return readJson<{ threadId: string; answer: TutorAnswer; model: string }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId }),
  }));
}
