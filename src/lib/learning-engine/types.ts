import type { MasteryStatus } from "@/lib/mastery/types";

export type LearningDimensions = {
  completion: number;
  comprehension: number;
  application: number;
  retention: number;
};

export type ConceptLearningState = {
  topicId: string;
  topicTitle: string;
  conceptId: string;
  conceptTitle: string;
  masteryScore: number;
  masteryStatus: MasteryStatus;
  evidenceCount: number;
  completionScore: number;
  retentionScore: number;
  dueAt: string;
  due: boolean;
  viewed: boolean;
  labCompleted: boolean;
  practiceCompleted: boolean;
  reason: string;
};

export type LearningDashboard = {
  moduleId: string;
  moduleTitle: string;
  dimensions: LearningDimensions;
  currentStreak: number;
  studiedDaysLast30: number;
  dueReviewCount: number;
  dueReviews: ConceptLearningState[];
  recommended: ConceptLearningState | null;
  concepts: ConceptLearningState[];
};

export type RecallEvaluation = {
  score: number;
  feedback: string;
  missingIdeas: string[];
  misconception: string | null;
  nextReviewAt: string;
  retentionScore: number;
  model: string;
};

export type StudyNote = {
  id: string;
  moduleId: string;
  topicId: string;
  conceptId: string;
  noteText: string;
  recallQuestion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CapstoneProjectPayload = {
  schemaVersion: "1.0";
  title: string;
  scenario: string;
  objective: string;
  deliverables: string[];
  constraints: string[];
  rubric: Array<{ criterion: string; weight: number; description: string }>;
  starterPrompt: string;
};

export type CapstoneEvaluation = {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  nextStep: string;
};

export type CapstoneProjectRecord = {
  id: string;
  moduleId: string;
  title: string;
  status: "ready" | "in_progress" | "submitted" | "evaluated";
  project: CapstoneProjectPayload;
  submission: string | null;
  evaluation: CapstoneEvaluation | null;
  model?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeMapNode = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  subject: string;
  topicId: string;
  topicTitle: string;
  conceptId: string;
  conceptTitle: string;
  masteryScore: number;
  retentionScore: number;
  state: "dominated" | "progress" | "review" | "new";
};

export type KnowledgeMapEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  title: string;
};

export type KnowledgeMap = {
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
};
