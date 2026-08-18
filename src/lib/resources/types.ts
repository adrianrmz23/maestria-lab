export type ModuleResourceType =
  | "audio"
  | "pdf"
  | "document"
  | "presentation"
  | "image"
  | "video"
  | "map"
  | "summary"
  | "quiz"
  | "link"
  | "other";

export type ModuleResource = {
  id: string;
  moduleId: string;
  topicId: string | null;
  conceptId: string | null;
  title: string;
  resourceType: ModuleResourceType;
  source: string;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  storageBucket: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  durationSeconds: number | null;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateExternalResourceInput = {
  title: string;
  resourceType?: ModuleResourceType;
  source?: string;
  externalUrl: string;
  topicId?: string | null;
  conceptId?: string | null;
  pinned?: boolean;
};

export type UpdateModuleResourceInput = Partial<Pick<ModuleResource, "title" | "resourceType" | "source" | "topicId" | "conceptId" | "pinned" | "sortOrder">>;
