const KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions";

export function getKimiEnvironment() {
  const apiKey = process.env.KIMI_API_KEY?.trim() || process.env.MOONSHOT_API_KEY?.trim();
  const model = process.env.KIMI_MODEL?.trim() || "kimi-k2.6";
  return apiKey ? { apiKey, model } : null;
}

type KimiPayload = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  error?: { message?: string };
};

export async function requestKimiJson<T>({
  system,
  user,
  maxCompletionTokens = 2600,
}: {
  system: string;
  user: string;
  maxCompletionTokens?: number;
}): Promise<{ data: T; model: string }> {
  const environment = getKimiEnvironment();
  if (!environment) throw new Error("Kimi no está configurado. Agrega KIMI_API_KEY si quieres usar este proveedor.");

  const response = await fetch(KIMI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: environment.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      max_completion_tokens: maxCompletionTokens,
    }),
  });

  const payload = await response.json() as KimiPayload;
  if (!response.ok) throw new Error(payload.error?.message || `Kimi respondió con ${response.status}.`);
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Kimi no devolvió contenido.");

  try {
    return { data: JSON.parse(content) as T, model: environment.model };
  } catch {
    throw new Error("Kimi devolvió una respuesta que no pudo interpretarse como JSON.");
  }
}
