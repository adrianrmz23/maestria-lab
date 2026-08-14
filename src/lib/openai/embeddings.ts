const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export function getEmbeddingEnvironment() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  return apiKey ? { apiKey, model } : null;
}

type EmbeddingPayload = {
  data?: Array<{ index: number; embedding: number[] }>;
  error?: { message?: string };
};

export async function createEmbeddings(input: string[]) {
  const environment = getEmbeddingEnvironment();
  if (!environment) throw new Error("Falta OPENAI_API_KEY. Se necesita para crear el índice RAG.");
  if (input.length === 0) return { embeddings: [] as number[][], model: environment.model };

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: environment.model,
      input,
      dimensions: 1536,
      encoding_format: "float",
    }),
  });

  const payload = await response.json() as EmbeddingPayload;
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI Embeddings respondió con ${response.status}.`);

  const ordered = [...(payload.data ?? [])].sort((a, b) => a.index - b.index).map((item) => item.embedding);
  if (ordered.length !== input.length) throw new Error("OpenAI no devolvió todos los embeddings solicitados.");
  return { embeddings: ordered, model: environment.model };
}

export async function createEmbedding(input: string) {
  const result = await createEmbeddings([input]);
  const embedding = result.embeddings[0];
  if (!embedding) throw new Error("No se pudo crear el embedding de la consulta.");
  return { embedding, model: result.model };
}
