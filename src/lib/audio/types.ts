export type AudioSummaryKind = "short" | "study";
export type AudioSummaryStatus = "generating" | "ready" | "error";

export type AudioSummaryRecord = {
  kind: AudioSummaryKind;
  status: AudioSummaryStatus;
  title: string;
  script: string;
  scriptCharCount: number;
  estimatedSeconds: number;
  estimatedCredits: number;
  provider: string;
  model: string;
  voiceId: string;
  generatedAt?: string;
  manifestGeneratedAt?: string;
  stale: boolean;
  error?: string;
  audioUrl?: string;
};

export type AudioSummaryResponse = {
  configured: boolean;
  voiceConfigured: boolean;
  model: string;
  manifestReady: boolean;
  summaries: AudioSummaryRecord[];
};

export type ConceptAudioKind = "lesson";

export type ConceptAudioRecord = {
  topicId: string;
  conceptId: string;
  kind: ConceptAudioKind;
  status: AudioSummaryStatus;
  title: string;
  script: string;
  scriptCharCount: number;
  estimatedSeconds: number;
  estimatedCredits: number;
  provider: string;
  model: string;
  voiceId: string;
  generatedAt?: string;
  manifestGeneratedAt?: string;
  stale: boolean;
  error?: string;
  audioUrl?: string;
};

export type ConceptAudioResponse = {
  configured: boolean;
  voiceConfigured: boolean;
  model: string;
  manifestReady: boolean;
  summary: ConceptAudioRecord | null;
};
