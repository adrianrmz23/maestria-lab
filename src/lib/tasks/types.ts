export type AcademicTaskType = "concept_map" | "synoptic" | "summary" | "essay" | "report" | "research" | "infographic" | "presentation" | "questions" | "custom";
export type TaskProvider = "auto" | "openai" | "kimi" | "deepseek";
export type TaskQuality = "fast" | "quality" | "max";
export type TaskWorkMode = "guided" | "generate";
export type TaskStatus = "draft" | "generating" | "ready" | "reviewing" | "completed" | "error";

export type TaskSourceScope = {
  document: boolean;
  manifest: boolean;
  notes: boolean;
  externalResearch: boolean;
  topicId?: string | null;
  conceptId?: string | null;
};

export type TaskRequirements = {
  inferredTitle: string;
  taskType: AcademicTaskType;
  theme: string;
  objective: string;
  length: string;
  format: string;
  citationStyle: string;
  structure: string[];
  requiredElements: string[];
  constraints: string[];
  dueDate: string | null;
  ambiguities: string[];
};

export type TaskSourceRef = {
  kind: "document" | "manifest" | "note" | "web";
  label: string;
  unitIndex: number | null;
  pageNumber: number | null;
  url: string | null;
};

export type TaskSection = {
  id: string;
  heading: string;
  body: string;
  sourceRefs: TaskSourceRef[];
};

export type VisualNode = {
  id: string;
  label: string;
  detail: string;
  level: number;
  parentId: string | null;
};

export type VisualEdge = {
  source: string;
  target: string;
  label: string;
};

export type TaskVisual = {
  enabled: boolean;
  type: "concept_map" | "synoptic" | "infographic" | "none";
  orientation: "horizontal" | "vertical";
  nodes: VisualNode[];
  edges: VisualEdge[];
};

export type TaskOutput = {
  schemaVersion: "1.0";
  taskType: AcademicTaskType;
  title: string;
  subtitle: string;
  introduction: string;
  sections: TaskSection[];
  conclusion: string;
  bibliography: TaskSourceRef[];
  visual: TaskVisual;
  studyTakeaways: string[];
  submissionChecklist: string[];
};

export type TaskReviewItem = {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
};

export type TaskReview = {
  score: number;
  verdict: string;
  rubricItems: TaskReviewItem[];
  strengths: string[];
  improvements: string[];
  unsupportedClaims: string[];
  revisionInstructions: string[];
};

export type ProviderTrace = {
  role: "interpreter" | "generator" | "reviewer" | "polisher" | "research";
  provider: Exclude<TaskProvider, "auto">;
  model: string;
};

export type AcademicTaskVersion = {
  id: string;
  taskId: string;
  versionNumber: number;
  content: TaskOutput;
  providerTrace: ProviderTrace[];
  review: TaskReview | null;
  createdAt: string;
};

export type AcademicTaskRecord = {
  id: string;
  moduleId: string;
  title: string;
  taskType: AcademicTaskType;
  instructions: string;
  rubricText: string;
  status: TaskStatus;
  providerPreference: TaskProvider;
  qualityMode: TaskQuality;
  workMode: TaskWorkMode;
  sourceScope: TaskSourceScope;
  requirements: TaskRequirements | null;
  currentVersion: number;
  generationError: string | null;
  createdAt: string;
  updatedAt: string;
  latestVersion?: AcademicTaskVersion | null;
};

export type TaskProviderStatus = {
  provider: Exclude<TaskProvider, "auto">;
  configured: boolean;
  model: string;
};

export type TaskStudioResponse = {
  tasks: AcademicTaskRecord[];
  providers: TaskProviderStatus[];
};
