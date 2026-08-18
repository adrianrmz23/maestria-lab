import type { PracticeExerciseType } from "@/lib/experience/types";
import type { SourceReference } from "@/lib/pedagogy/types";

export type MasteryStatus = "Sin evidencia" | "Inicial" | "En desarrollo" | "Sólido" | "Dominado";

export type ConceptMastery = {
  topicId: string;
  topicTitle: string;
  conceptId: string;
  conceptTitle: string;
  score: number;
  weightedAccuracy: number;
  evidenceCount: number;
  practiceCount: number;
  examCount: number;
  status: MasteryStatus;
  weakestMisconception: string | null;
  lastActivityAt: string | null;
};

export type ModuleMasterySummary = {
  moduleId: string;
  moduleTitle: string;
  overallScore: number;
  readiness: "Sin evidencia" | "Construyendo base" | "En progreso" | "Listo para examen";
  evidenceCount: number;
  attemptedConcepts: number;
  totalConcepts: number;
  lastActivityAt: string | null;
  concepts: ConceptMastery[];
  weakest: ConceptMastery[];
};

export type ExamMode = "quick" | "review" | "full" | "reinforcement";

export type ExamQuestion = {
  id: string;
  topicId: string;
  topicTitle: string;
  conceptId: string;
  conceptTitle: string;
  difficulty: 1 | 2 | 3;
  type: PracticeExerciseType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
  sourceRefs: SourceReference[];
};

export type ExamPayload = {
  schemaVersion: "1.0";
  title: string;
  instructions: string;
  mode: ExamMode;
  questions: ExamQuestion[];
};

export type ExamSessionRecord = {
  id: string;
  moduleId: string;
  mode: ExamMode;
  status: "ready" | "in_progress" | "completed";
  questionCount: number;
  exam: ExamPayload;
  model?: string;
  score?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  answers: Array<{
    questionId: string;
    correct: boolean;
    score: number;
    feedback: string;
    misconception: string | null;
  }>;
};

export type ExamEvaluation = {
  correct: boolean;
  score: number;
  feedback: string;
  misconception: string | null;
  sourceRefs: SourceReference[];
  sessionCompleted: boolean;
  sessionScore: number | null;
};

export type StudyDuration = 5 | 10 | 15 | 20 | 30 | 40 | 45;
export type StudyStepKind = "learn" | "lab" | "practice" | "exam" | "recall";

export type StudyPlanStep = {
  id: string;
  kind: StudyStepKind;
  minutes: number;
  title: string;
  instruction: string;
  topicId: string | null;
  topicTitle: string | null;
  conceptId: string | null;
  conceptTitle: string | null;
};

export type AdaptiveStudyPlan = {
  schemaVersion: "1.0";
  durationMinutes: StudyDuration;
  rationale: string;
  focusConcepts: Array<{
    topicId: string;
    topicTitle: string;
    conceptId: string;
    conceptTitle: string;
    masteryScore: number;
    status: MasteryStatus;
    reason: string;
  }>;
  steps: StudyPlanStep[];
};

export type StudySessionRecord = {
  id: string;
  moduleId: string;
  durationMinutes: StudyDuration;
  status: "planned" | "in_progress" | "completed";
  plan: AdaptiveStudyPlan;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
};
