import type { ExamEvaluation, ExamMode, ExamSessionRecord, ModuleMasterySummary, StudyDuration, StudySessionRecord } from "@/lib/mastery/types";

type ErrorPayload = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getModuleMastery(moduleId: string) {
  return readJson<ModuleMasterySummary>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/mastery`, { cache: "no-store" }));
}

export async function createExam(moduleId: string, mode: ExamMode) {
  return readJson<ExamSessionRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/exam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  }));
}

export async function getExam(moduleId: string, sessionId: string) {
  const query = new URLSearchParams({ sessionId });
  return readJson<ExamSessionRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/exam?${query.toString()}`, { cache: "no-store" }));
}

export async function answerExamQuestion(moduleId: string, sessionId: string, questionId: string, answer: string) {
  return readJson<ExamEvaluation>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/exam/${encodeURIComponent(sessionId)}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, answer }),
  }));
}

export async function createStudySession(moduleId: string, durationMinutes: StudyDuration) {
  return readJson<StudySessionRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/study-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ durationMinutes }),
  }));
}

export async function getStudySession(moduleId: string, sessionId: string) {
  const query = new URLSearchParams({ sessionId });
  return readJson<StudySessionRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/study-session?${query.toString()}`, { cache: "no-store" }));
}

export async function setStudySessionStatus(moduleId: string, sessionId: string, status: "in_progress" | "completed") {
  return readJson<StudySessionRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/study-session/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }));
}
