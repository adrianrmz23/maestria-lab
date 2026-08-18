const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export function getDeepSeekEnvironment() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const model = process.env.DEEPSEEK_TASK_MODEL?.trim() || process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  return apiKey ? { apiKey, model } : null;
}

type DeepSeekPayload = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  error?: { message?: string };
};

export async function requestDeepSeekJson<T>({
  system,
  user,
  maxTokens = 5000,
}: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ data: T; model: string }> {
  const environment = getDeepSeekEnvironment();
  if (!environment) throw new Error("DeepSeek no está configurado. Agrega DEEPSEEK_API_KEY si quieres usar este proveedor.");

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: environment.model,
      messages: [
        { role: "system", content: `${system}\n\nIMPORTANTE: responde exclusivamente con JSON válido.` },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  const payload = await response.json() as DeepSeekPayload;
  if (!response.ok) throw new Error(payload.error?.message || `DeepSeek respondió con ${response.status}.`);
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek no devolvió contenido.");

  try {
    return { data: JSON.parse(content) as T, model: environment.model };
  } catch {
    throw new Error("DeepSeek devolvió una respuesta que no pudo interpretarse como JSON.");
  }
}
