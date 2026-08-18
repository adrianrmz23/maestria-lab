import type { AcademicTaskRecord, AcademicTaskType, AcademicTaskVersion, TaskOutput, TaskProvider, TaskQuality, TaskSourceScope, TaskStudioResponse, TaskWorkMode } from "@/lib/tasks/types";

type ErrorPayload = { error?: string };
async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getAcademicTasks(moduleId: string) {
  return readJson<TaskStudioResponse>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks`, { cache: "no-store" }));
}

export async function createAcademicTask(moduleId: string, input: {
  title?: string;
  taskType: AcademicTaskType;
  instructions: string;
  rubricText?: string;
  providerPreference?: TaskProvider;
  qualityMode?: TaskQuality;
  workMode?: TaskWorkMode;
  sourceScope?: Partial<TaskSourceScope>;
}) {
  return readJson<{ task: AcademicTaskRecord; providers: TaskStudioResponse["providers"] }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));
}

export async function getAcademicTask(moduleId: string, taskId: string) {
  return readJson<{ task: AcademicTaskRecord; versions: AcademicTaskVersion[]; sources: Array<{ id: string; name: string; mime_type: string | null; metadata: Record<string, unknown>; created_at: string }>; providers: TaskStudioResponse["providers"] }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}`, { cache: "no-store" }));
}

export async function runAcademicTaskAction(moduleId: string, taskId: string, action: "generate" | "review" | "reinterpret") {
  return readJson<{ task: AcademicTaskRecord; version?: AcademicTaskVersion }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  }));
}

export async function updateAcademicTask(moduleId: string, taskId: string, patch: Partial<Pick<AcademicTaskRecord, "title" | "instructions" | "rubricText" | "providerPreference" | "qualityMode" | "workMode" | "sourceScope" | "status">>) {
  return readJson<AcademicTaskRecord>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }));
}

export async function saveAcademicTaskContent(moduleId: string, taskId: string, content: TaskOutput) {
  return readJson<{ task: AcademicTaskRecord; version: AcademicTaskVersion }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }));
}

export async function deleteAcademicTask(moduleId: string, taskId: string) {
  return readJson<{ ok: boolean }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }));
}

export async function addAcademicTaskAttachment(moduleId: string, taskId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return readJson<{ source: { id: string; name: string } }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}/sources`, { method: "POST", body: form }));
}

export async function removeAcademicTaskAttachment(moduleId: string, taskId: string, sourceId: string) {
  return readJson<{ ok: boolean }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/tasks/${encodeURIComponent(taskId)}/sources?sourceId=${encodeURIComponent(sourceId)}`, { method: "DELETE" }));
}
