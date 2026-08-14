import type { ReaderUnit } from "@/lib/reader/types";

type ErrorPayload = { error?: string };
async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new Error(payload.error || `La solicitud falló (${response.status}).`);
  return payload;
}

export async function getReaderUnit(moduleId: string, unitIndex: number) {
  const query = new URLSearchParams({ unitIndex: String(unitIndex) });
  return readJson<ReaderUnit>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/reader?${query.toString()}`, { cache: "no-store" }));
}

export async function generateReaderAnnotation(moduleId: string, unitIndex: number, blockIndex: number) {
  return readJson<{ cached: boolean; provider: string; model: string; annotation: unknown; unit: ReaderUnit }>(await fetch(`/api/modules/${encodeURIComponent(moduleId)}/reader`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unitIndex, blockIndex }),
  }));
}
