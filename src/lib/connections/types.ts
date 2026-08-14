import type { SourceReference } from "@/lib/pedagogy/types";

export type ConnectionType = "prerequisite" | "analogy" | "application" | "shared_principle" | "contrast" | "extension";

export type KnowledgeConnection = {
  id: string;
  sourceModuleId: string;
  sourceModuleTitle: string;
  sourceTopicId: string;
  sourceTopicTitle: string;
  sourceConceptId: string;
  sourceConceptTitle: string;
  targetModuleId: string;
  targetModuleTitle: string;
  targetTopicId: string;
  targetTopicTitle: string;
  targetConceptId: string;
  targetConceptTitle: string;
  relationshipType: ConnectionType;
  title: string;
  explanation: string;
  bridgeExample: string;
  strength: number;
  sourceRefs: SourceReference[];
  targetRefs: SourceReference[];
  provider: string;
  model: string;
};

export type ConnectionGraph = {
  connections: KnowledgeConnection[];
  generatedAt?: string;
  provider?: string;
  model?: string;
};
