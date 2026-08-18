import type { CapstoneProjectRecord, KnowledgeMap, LearningDashboard, RecallEvaluation, StudyNote } from "@/lib/learning-engine/types";

type ErrorPayload = { error?: string };
async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getLearningDashboard(moduleId: string) {
  return readJson<LearningDashboard>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/learning-engine`, { cache: "no-store" }));
}

export async function trackLearningProgress(moduleId: string, topicId: string, conceptId: string, event: "view" | "lab" | "practice", score?: number) {
  return readJson<{ ok: boolean; completionScore: number }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/learning-engine`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, conceptId, event, score }),
  }));
}

export async function submitRecall(moduleId: string, topicId: string, conceptId: string, response: string) {
  return readJson<RecallEvaluation>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/recall`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, conceptId, response }),
  }));
}

export async function getStudyNotes(moduleId: string, topicId?: string, conceptId?: string) {
  const query = new URLSearchParams();
  if (topicId) query.set("topicId", topicId);
  if (conceptId) query.set("conceptId", conceptId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return readJson<{ notes: StudyNote[] }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/notes${suffix}`, { cache: "no-store" }));
}

export async function saveStudyNote(moduleId: string, topicId: string, conceptId: string, noteText: string) {
  return readJson<StudyNote>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/notes`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, conceptId, noteText }),
  }));
}

export async function removeStudyNote(moduleId: string, noteId: string) {
  return readJson<{ ok: boolean }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/notes?noteId=${encodeURIComponent(noteId)}`, { method: "DELETE" }));
}

export async function getCapstoneProjects(moduleId: string) {
  return readJson<{ projects: CapstoneProjectRecord[] }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/projects`, { cache: "no-store" }));
}

export async function generateCapstoneProject(moduleId: string) {
  return readJson<CapstoneProjectRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/projects`, { method: "POST" }));
}

export async function evaluateCapstoneProject(moduleId: string, projectId: string, submission: string) {
  return readJson<CapstoneProjectRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/projects/${encodeURIComponent(projectId)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission }),
  }));
}

export async function getKnowledgeMap() {
  return readJson<KnowledgeMap>(await fetch("/api/knowledge-map", { cache: "no-store" }));
}
