export type ReaderAnnotationKind = "concept" | "example" | "warning" | "formula" | "context";

export type ReaderAnnotation = {
  id: string;
  blockIndex: number | null;
  phrase: string;
  kind: ReaderAnnotationKind;
  title: string;
  explanation: string;
  example: string | null;
  provider: string;
  model: string;
};

export type ReaderUnit = {
  unitIndex: number;
  pageNumber: number | null;
  label: string;
  content: string;
  charCount: number;
  totalUnits: number;
  annotations: ReaderAnnotation[];
};
