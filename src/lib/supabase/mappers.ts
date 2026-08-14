import type { SourceDocumentMeta, StudyModule } from "@/lib/mock-data";

export type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  description: string;
  progress: number;
  topics: number;
  status: StudyModule["status"];
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  module_id: string;
  name: string;
  kind: SourceDocumentMeta["kind"];
  mime_type: string;
  size_bytes: number;
  last_modified: number;
  storage_bucket: string;
  storage_path: string;
  extraction_status: SourceDocumentMeta["extractionStatus"];
  page_count: number | null;
  unit_count: number;
  char_count: number;
  word_count: number;
  parser: string | null;
  preview_text: string | null;
  extraction_error: string | null;
  extracted_at: string | null;
  created_at: string;
};

export function mapDocumentRow(row: DocumentRow): SourceDocumentMeta {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    mimeType: row.mime_type,
    size: Number(row.size_bytes),
    lastModified: Number(row.last_modified),
    addedAt: row.created_at,
    storage: "cloud",
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    extractionStatus: row.extraction_status,
    pageCount: row.page_count ?? undefined,
    unitCount: row.unit_count,
    charCount: row.char_count,
    wordCount: row.word_count,
    parser: row.parser ?? undefined,
    previewText: row.preview_text ?? undefined,
    extractionError: row.extraction_error ?? undefined,
    extractedAt: row.extracted_at ?? undefined,
  };
}

export function mapModuleRow(row: ModuleRow, document?: DocumentRow): StudyModule {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subject: row.subject,
    description: row.description,
    progress: row.progress,
    topics: row.topics,
    status: row.status,
    sourceDocument: document ? mapDocumentRow(document) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
