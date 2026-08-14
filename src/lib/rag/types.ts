export type RagStatus = {
  ready: boolean;
  chunkCount: number;
  unitCount: number;
  embeddingModel?: string;
  indexedAt?: string;
};

export type TutorCitation = {
  chunkId: number;
  unitIndex: number;
  pageNumber: number | null;
  label: string;
  note: string;
};

export type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: TutorCitation[];
  model?: string;
  createdAt: string;
};

export type TutorThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type TutorState = {
  thread: TutorThread | null;
  messages: TutorMessage[];
  recentThreads: TutorThread[];
  rag: RagStatus;
};

export type TutorAnswer = {
  title: string;
  answer: string;
  keyPoints: string[];
  checkQuestion: string | null;
  citations: TutorCitation[];
};
