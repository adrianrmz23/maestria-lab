import type { SourceDocumentMeta } from "@/lib/mock-data";

export type ExtractionUnit = {
  unitIndex: number;
  pageNumber?: number;
  label: string;
  content: string;
  charCount: number;
};

export type DocumentExtraction = {
  fullText: string;
  previewText: string;
  units: ExtractionUnit[];
  pageCount?: number;
  charCount: number;
  wordCount: number;
  parser: string;
  parserVersion: string;
  warnings: string[];
};

function normalizeDocumentText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function makePreview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 900 ? `${compact.slice(0, 900).trimEnd()}…` : compact;
}

async function extractPdf(buffer: Buffer): Promise<DocumentExtraction> {
  // unpdf incluye un build serverless de PDF.js con el worker embebido.
  // Para extracción de texto no necesita DOMMatrix, canvas ni binarios nativos,
  // por lo que funciona de forma consistente en Node local y Vercel Functions.
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buffer), { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [result.text];
  const warnings: string[] = [];

  const units = pages.map((pageText, index) => {
    const pageNumber = index + 1;
    const content = normalizeDocumentText(pageText || "");
    if (!content) warnings.push(`La página ${pageNumber} no contiene texto seleccionable.`);
    return {
      unitIndex: pageNumber,
      pageNumber,
      label: `Página ${pageNumber}`,
      content,
      charCount: content.length,
    } satisfies ExtractionUnit;
  });

  // totalPages viene del parser; si por cualquier razón el array fuera menor,
  // conservamos las unidades devueltas y dejamos constancia en warnings.
  if (result.totalPages !== units.length) {
    warnings.push(`El PDF reportó ${result.totalPages} páginas y se recibieron ${units.length} unidades de texto.`);
  }

  const fullText = units.map((unit) => unit.content).filter(Boolean).join("\n\n");
  return {
    fullText,
    previewText: makePreview(fullText),
    units,
    pageCount: result.totalPages,
    charCount: fullText.length,
    wordCount: countWords(fullText),
    parser: "unpdf-serverless",
    parserVersion: "1.8.x",
    warnings,
  };
}

function splitDocxIntoUnits(text: string) {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => normalizeDocumentText(paragraph)).filter(Boolean);
  const units: ExtractionUnit[] = [];
  let bucket: string[] = [];
  let bucketChars = 0;

  function flush() {
    if (!bucket.length) return;
    const content = bucket.join("\n\n");
    const index = units.length + 1;
    units.push({
      unitIndex: index,
      label: `Fragmento ${index}`,
      content,
      charCount: content.length,
    });
    bucket = [];
    bucketChars = 0;
  }

  for (const paragraph of paragraphs) {
    if (bucketChars + paragraph.length > 6000 && bucket.length) flush();
    bucket.push(paragraph);
    bucketChars += paragraph.length;
  }
  flush();

  return units;
}

async function extractDocx(buffer: Buffer): Promise<DocumentExtraction> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const fullText = normalizeDocumentText(result.value);
  const units = splitDocxIntoUnits(fullText);

  return {
    fullText,
    previewText: makePreview(fullText),
    units,
    charCount: fullText.length,
    wordCount: countWords(fullText),
    parser: "mammoth",
    parserVersion: "1.x",
    warnings: result.messages.map((message) => message.message),
  };
}

export async function extractDocument(buffer: Buffer, kind: SourceDocumentMeta["kind"]): Promise<DocumentExtraction> {
  const result = kind === "PDF" ? await extractPdf(buffer) : await extractDocx(buffer);
  if (!result.fullText.trim()) {
    throw new Error(kind === "PDF"
      ? "El PDF no contiene texto seleccionable. Puede ser un documento escaneado; OCR se incorporará más adelante."
      : "No se pudo extraer texto útil del documento DOCX.");
  }
  return result;
}
