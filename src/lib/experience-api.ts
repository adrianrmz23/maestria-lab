import type { ExperienceRecord, PracticeEvaluation, StudyAssistantAction, StudyAssistantResult } from "@/lib/experience/types";

type ErrorPayload = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getConceptExperience(moduleId: string, topicId: string, conceptId: string) {
  const query = new URLSearchParams({ topicId, conceptId });
  return readJson<ExperienceRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/experience?${query.toString()}`, { cache: "no-store" }));
}

export async function generateConceptExperience(moduleId: string, topicId: string, conceptId: string) {
  return readJson<{ ok: boolean } & ExperienceRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/experience`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId, conceptId }),
  }));
}

export async function askStudyAssistant(moduleId: string, topicId: string, conceptId: string, action: StudyAssistantAction, question?: string) {
  return readJson<{ result: StudyAssistantResult; model: string }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/study-assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId, conceptId, action, question }),
  }));
}

export async function evaluateExercise(moduleId: string, topicId: string, conceptId: string, exerciseId: string, answer: string, exerciseType: string) {
  return readJson<PracticeEvaluation>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/practice/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId, conceptId, exerciseId, answer, exerciseType }),
  }));
}
