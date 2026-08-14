import type { SourceReference } from "@/lib/pedagogy/types";

export type LabType = "logic_switch" | "truth_table" | "matching" | "sequence" | "code_prediction";
export type LogicOperator = "and" | "or" | "implies" | "xor" | "not";
export type PracticeLevel = 1 | 2 | 3;
export type PracticeExerciseType = "multiple_choice" | "true_false" | "short_answer" | "code_prediction";

export type LabProposition = {
  id: string;
  label: string;
  description: string;
};

export type MatchingPair = {
  id: string;
  left: string;
  right: string;
};

export type SequenceItem = {
  id: string;
  label: string;
  order: number;
};

export type LabSpec = {
  type: LabType;
  title: string;
  objective: string;
  instructions: string;
  difficulty: PracticeLevel;
  expression: string | null;
  propositions: LabProposition[];
  operator: LogicOperator | null;
  matchingPairs: MatchingPair[];
  sequenceItems: SequenceItem[];
  codeSnippet: string | null;
  codeQuestion: string | null;
  codeOptions: string[];
  codeAnswerIndex: number | null;
  sourceRefs: SourceReference[];
};

export type PracticeExercise = {
  id: string;
  level: PracticeLevel;
  type: PracticeExerciseType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  acceptedAnswers: string[];
  hint: string;
  explanation: string;
  sourceRefs: SourceReference[];
};

export type ConceptExperience = {
  schemaVersion: "1.0";
  topicId: string;
  conceptId: string;
  conceptTitle: string;
  studyNote: string;
  lab: LabSpec;
  exercises: PracticeExercise[];
};

export type ExperienceStatus = "missing" | "generating" | "ready" | "error";

export type ExperienceRecord = {
  status: ExperienceStatus;
  model?: string;
  generatedAt?: string;
  generationError?: string;
  experience?: ConceptExperience;
};

export type PracticeEvaluation = {
  correct: boolean;
  score: number;
  feedback: string;
  misconception: string | null;
  sourceRefs: SourceReference[];
};

export type StudyAssistantAction = "deeper" | "example" | "python" | "question" | "connection" | "custom";

export type StudyAssistantResult = {
  title: string;
  answer: string;
  takeaways: string[];
  code: string | null;
  challenge: string | null;
  sourceRefs: SourceReference[];
};
