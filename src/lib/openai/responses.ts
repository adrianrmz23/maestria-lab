import type { LearningManifest } from "@/lib/pedagogy/types";
import { learningManifestJsonSchema } from "@/lib/pedagogy/schema";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

export function getOpenAIEnvironment() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  return apiKey ? { apiKey, model } : null;
}

type ResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function extractOutputText(payload: ResponsePayload) {
  if (payload.output_text) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

type StructuredRequest = {
  name: string;
  schema: object;
  developer: string;
  user: string;
  reasoning?: "minimal" | "low" | "medium" | "high";
  verbosity?: "low" | "medium" | "high";
};

export async function requestStructuredOutput<T>({
  name,
  schema,
  developer,
  user,
  reasoning = "medium",
  verbosity = "medium",
}: StructuredRequest): Promise<{ data: T; model: string }> {
  const environment = getOpenAIEnvironment();
  if (!environment) throw new Error("Falta OPENAI_API_KEY. Agrégala a .env.local para usar las funciones de IA.");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: environment.model,
      store: false,
      reasoning: { effort: reasoning },
      text: {
        verbosity,
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
      input: [
        { role: "developer", content: [{ type: "input_text", text: developer }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
    }),
  });

  const payload = await response.json() as ResponsePayload;
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI respondió con ${response.status}.`);
  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI no devolvió contenido estructurado.");

  try {
    return { data: JSON.parse(text) as T, model: environment.model };
  } catch {
    throw new Error("La respuesta de IA no pudo interpretarse como JSON estructurado.");
  }
}

export async function generateStructuredLearningManifest(input: string): Promise<{ manifest: LearningManifest; model: string }> {
  const developer = [
    "Eres el motor pedagógico de Maestría Lab para una Maestría en Inteligencia Artificial y Ciencia de Datos.",
    "Tu principio es: simplificar la explicación, no simplificar el temario.",
    "La fuente académica proporcionada manda. No atribuyas contenido externo al documento.",
    "sourceSummary, topic.summary y cualquier ejemplo origin=source deben poder sostenerse en las unidades citadas.",
    "easy, masters, deepen, applicationAI, whyItMatters y ejemplos origin=generated pueden ser explicaciones pedagógicas o contexto generado, pero no deben presentarse como citas del documento.",
    "Cada concepto debe incluir sourceRefs reales usando únicamente unitIndex/pageNumber/label presentes en la fuente.",
    "No inventes páginas. En DOCX pageNumber debe ser null si la fuente no trae páginas estables.",
    "Cubre todo el temario relevante de la fuente, incluyendo conceptos difíciles. Elimina solamente ruido editorial o redundancia.",
    "Usa español claro, técnico cuando corresponde, con conexiones útiles a IA, Data Science, programación o ingeniería de datos.",
    "Los ids deben ser slugs breves y únicos dentro de su nivel.",
    "La capa easy debe ser intuitiva pero no superficial: idealmente 100-180 palabras si el concepto lo requiere.",
    "La capa masters debe desarrollar definición formal, mecanismo, matices y terminología técnica; idealmente 220-380 palabras cuando exista material suficiente.",
    "La capa deepen debe ser compacta y de alta densidad: 120-180 palabras como máximo. Organízala en exactamente tres microbloques separados por salto de línea y etiquetados Fundamento:, Matiz: y Caso límite:. No repitas Nivel Maestría ni hagas recorridos históricos extensos.",
    "La capa applicationAI debe conectar el concepto con al menos un escenario concreto de IA, Data Science o software, evitando ejemplos decorativos.",
    "Cuando haya notación, fórmulas o código relevantes, descríbelos textualmente de forma legible. No omitas profundidad solo para ser breve.",
  ].join("\n");

  const result = await requestStructuredOutput<LearningManifest>({
    name: "learning_manifest",
    schema: learningManifestJsonSchema,
    developer,
    user: input,
    reasoning: "medium",
    verbosity: "medium",
  });

  return { manifest: result.data, model: result.model };
}
