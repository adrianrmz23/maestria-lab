import type { ConnectionGraph } from "@/lib/connections/types";

type ErrorPayload = { error?: string };
async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getKnowledgeConnections() {
  return readJson<ConnectionGraph>(await fetch("/api/connections", { cache: "no-store" }));
}

export async function generateKnowledgeConnections() {
  return readJson<ConnectionGraph>(await fetch("/api/connections", { method: "POST" }));
}
