export type ReaderBlockType = "heading" | "subheading" | "paragraph" | "list";

export type ReaderBlock = {
  index: number;
  type: ReaderBlockType;
  text: string;
};

function normalizeLine(value: string) {
  return value.replace(/[\t\u00a0]+/g, " ").replace(/ {2,}/g, " ").trim();
}

function uppercaseRatio(value: string) {
  const letters = value.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? [];
  if (!letters.length) return 0;
  const uppercase = letters.filter((letter) => letter === letter.toUpperCase()).length;
  return uppercase / letters.length;
}

function startsLikeSection(value: string) {
  return /^(?:\d+(?:\.\d+){0,4}[.)]?|[IVXLCDM]+[.)])\s+/i.test(value);
}

function startsLikeList(value: string) {
  return /^(?:[-•▪◦*–—]\s+|\(?[a-z0-9]+\)[.)]?\s+)/i.test(value);
}

function looksLikeHeading(value: string) {
  const text = normalizeLine(value);
  if (!text || text.length > 150) return false;
  if (startsLikeSection(text)) return true;
  if (/^(introducci[oó]n|conclusiones?|resumen|objetivos?|ejemplos?|definici[oó]n|teorema|proposici[oó]n|actividad|ejercicio|referencias?)\b/i.test(text)) return true;
  return text.length <= 90 && uppercaseRatio(text) >= 0.62;
}

function looksLikeSubheading(value: string) {
  const text = normalizeLine(value);
  if (!text || text.length > 190 || looksLikeHeading(text)) return false;
  if (/^[A-ZÁÉÍÓÚÜÑ][^.!?]{3,110}:?$/.test(text) && !/[.!?]$/.test(text)) return true;
  return false;
}

function sentenceFallback(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return [] as string[];
  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÜÑ0-9¿¡])/u).filter(Boolean);
  if (sentences.length <= 1) return [normalized];
  const paragraphs: string[] = [];
  let bucket = "";
  for (const sentence of sentences) {
    const next = bucket ? `${bucket} ${sentence}` : sentence;
    if (bucket && next.length > 560) {
      paragraphs.push(bucket);
      bucket = sentence;
    } else {
      bucket = next;
    }
  }
  if (bucket) paragraphs.push(bucket);
  return paragraphs;
}

export function structureReaderContent(content: string): ReaderBlock[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const rawLines = normalized.split("\n");
  const hasStructure = rawLines.some((line) => !line.trim()) || rawLines.length >= 3;
  if (!hasStructure) {
    return sentenceFallback(normalized).map((text, index) => ({ index, type: "paragraph" as const, text }));
  }

  const blocks: Array<Omit<ReaderBlock, "index">> = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const text = normalizeLine(paragraph.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  }

  for (const rawLine of rawLines) {
    const line = normalizeLine(rawLine);
    if (!line) {
      flushParagraph();
      continue;
    }

    if (looksLikeHeading(line)) {
      flushParagraph();
      const previous = blocks.at(-1);
      if (previous?.type === "heading" && `${previous.text} ${line}`.length <= 190) previous.text = `${previous.text} ${line}`;
      else blocks.push({ type: "heading", text: line });
      continue;
    }

    if (looksLikeSubheading(line)) {
      flushParagraph();
      blocks.push({ type: "subheading", text: line.replace(/:$/, "") });
      continue;
    }

    if (startsLikeList(line)) {
      flushParagraph();
      blocks.push({ type: "list", text: line.replace(/^[-•▪◦*–—]\s+/, "") });
      continue;
    }

    paragraph.push(line);
    const joined = paragraph.join(" ");
    if (/[.!?…]$/.test(line) && joined.length >= 150) flushParagraph();
    else if (joined.length >= 700) flushParagraph();
  }
  flushParagraph();

  return blocks.map((block, index) => ({ ...block, index }));
}

export function readerParagraphBlocks(content: string) {
  return structureReaderContent(content).filter((block) => block.type === "paragraph" || block.type === "list");
}
