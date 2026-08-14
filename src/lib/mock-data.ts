export type ModuleStatus = "Nuevo" | "En curso" | "Completado" | "Archivado";

export type ExtractionStatus = "pending" | "extracting" | "ready" | "error";

export type SourceDocumentMeta = {
  id?: string;
  name: string;
  kind: "PDF" | "DOCX";
  mimeType: string;
  size: number;
  lastModified: number;
  addedAt: string;
  storage?: "local" | "cloud";
  storageBucket?: string;
  storagePath?: string;
  extractionStatus?: ExtractionStatus;
  pageCount?: number;
  unitCount?: number;
  charCount?: number;
  wordCount?: number;
  parser?: string;
  previewText?: string;
  extractionError?: string;
  extractedAt?: string;
};

export type StudyModule = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  description: string;
  progress: number;
  topics: number;
  status: ModuleStatus;
  sourceDocument?: SourceDocumentMeta;
  createdAt: string;
  updatedAt: string;
};

export const seedModules: StudyModule[] = [
  {
    id: "module-logic",
    slug: "logica-proposicional",
    title: "Lógica proposicional y de predicados",
    subject: "Bases Científicas de la Inteligencia Artificial",
    description:
      "Fundamentos formales para representar proposiciones, relaciones lógicas, predicados e inferencia aplicados a sistemas inteligentes.",
    progress: 32,
    topics: 11,
    status: "En curso",
    createdAt: "2026-08-10T16:00:00.000Z",
    updatedAt: "2026-08-13T20:00:00.000Z",
  },
  {
    id: "module-statistics",
    slug: "estadistica-descriptiva",
    title: "Estadística descriptiva",
    subject: "Fundamentos de Ciencia de Datos",
    description:
      "Medidas, distribuciones y formas de describir datos antes de construir modelos o realizar inferencias.",
    progress: 0,
    topics: 8,
    status: "Nuevo",
    createdAt: "2026-08-11T16:00:00.000Z",
    updatedAt: "2026-08-11T16:00:00.000Z",
  },
  {
    id: "module-algebra",
    slug: "algebra-lineal-ia",
    title: "Álgebra lineal para IA",
    subject: "Matemáticas para Inteligencia Artificial",
    description:
      "Vectores, matrices y transformaciones como lenguaje matemático base de múltiples técnicas de inteligencia artificial.",
    progress: 67,
    topics: 12,
    status: "En curso",
    createdAt: "2026-08-09T16:00:00.000Z",
    updatedAt: "2026-08-12T20:00:00.000Z",
  },
];

// Alias temporal para componentes pedagógicos que todavía consumen los datos base.
export const modules = seedModules;

export const logicTopics = [
  { title: "Introducción", state: "done" },
  { title: "Proposiciones", state: "done" },
  { title: "Conectivos", state: "current" },
  { title: "Tablas de verdad", state: "next" },
  { title: "Clasificación", state: "next" },
  { title: "Equivalencias", state: "next" },
  { title: "Predicados", state: "next" },
  { title: "Cuantificadores", state: "next" },
  { title: "Inferencia", state: "next" },
  { title: "Aplicaciones en IA", state: "next" },
  { title: "Evaluación", state: "next" },
] as const;

export const mastery = [
  { concept: "Proposiciones", value: 94, hint: "Dominio sólido" },
  { concept: "Conectivos", value: 88, hint: "Buen dominio" },
  { concept: "Tablas de verdad", value: 63, hint: "Conviene practicar" },
  { concept: "Equivalencias", value: 48, hint: "Prioridad de repaso" },
  { concept: "Predicados", value: 71, hint: "En progreso" },
  { concept: "Cuantificadores", value: 42, hint: "Prioridad de repaso" },
];
