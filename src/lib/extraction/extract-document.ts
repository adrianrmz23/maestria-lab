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

function normalizeInlineText(value: string) {
  return value.replace(/[\t\u00a0]+/g, " ").replace(/ {2,}/g, " ").trim();
}

function normalizeDocumentText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/ {2,}/g, " ")
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
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const units: ExtractionUnit[] = [];
  const warnings: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = "";
      let lastY: number | null = null;

      const pushLine = () => {
        const clean = normalizeInlineText(currentLine);
        if (clean) lines.push(clean);
        currentLine = "";
      };

      for (const item of textContent.items) {
        if (!("str" in item)) continue;
        const text = String(item.str || "").trim();
        if (!text) continue;
        const transform = "transform" in item && Array.isArray(item.transform) ? item.transform : undefined;
        const y = transform && typeof transform[5] === "number" ? transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3.5 && currentLine) pushLine();
        currentLine += `${currentLine ? " " : ""}${text}`;
        lastY = y;
        if ("hasEOL" in item && item.hasEOL) pushLine();
      }
      pushLine();

      const content = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

      if (!content) warnings.push(`La página ${pageNumber} no contiene texto seleccionable.`);

      units.push({
        unitIndex: pageNumber,
        pageNumber,
        label: `Página ${pageNumber}`,
        content,
        charCount: content.length,
      });

      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  const fullText = units.map((unit) => unit.content).filter(Boolean).join("\n\n");
  return {
    fullText,
    previewText: makePreview(fullText),
    units,
    pageCount: units.length,
    charCount: fullText.length,
    wordCount: countWords(fullText),
    parser: "pdfjs-dist",
    parserVersion: "5.x",
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
