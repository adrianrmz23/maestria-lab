export type SourceReference = {
  unitIndex: number;
  pageNumber: number | null;
  label: string;
};

export type LearningExample = {
  title: string;
  content: string;
  origin: "source" | "generated";
};

export type LearningConcept = {
  id: string;
  title: string;
  sourceSummary: string;
  easy: string;
  masters: string;
  deepen: string;
  applicationAI: string;
  whyItMatters: string;
  prerequisites: string[];
  commonMistakes: string[];
  examples: LearningExample[];
  sourceRefs: SourceReference[];
};

export type LearningTopic = {
  id: string;
  title: string;
  summary: string;
  order: number;
  concepts: LearningConcept[];
  sourceRefs: SourceReference[];
};

export type LearningManifest = {
  schemaVersion: "1.0";
  moduleTitle: string;
  subject: string;
  sourceDocumentName: string;
  overview: string;
  learningGoals: string[];
  prerequisites: string[];
  topics: LearningTopic[];
};

export type LearningManifestStatus = "pending" | "generating" | "ready" | "error" | "missing";

export type LearningManifestRecord = {
  status: LearningManifestStatus;
  schemaVersion?: string;
  model?: string;
  topicCount: number;
  conceptCount: number;
  sourceUnitCount: number;
  sourceCharCount: number;
  generationError?: string;
  generatedAt?: string;
  manifest?: LearningManifest;
};
