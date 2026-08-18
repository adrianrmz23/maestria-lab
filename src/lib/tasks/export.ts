"use client";

import type { TaskOutput } from "@/lib/tasks/types";

function safeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "tarea";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function outputToPlainText(output: TaskOutput) {
  const refs = (refs: TaskOutput["bibliography"]) => refs.map((ref) => ref.kind === "web" ? `${ref.label}: ${ref.url}` : `${ref.label}${ref.pageNumber ? `, pág. ${ref.pageNumber}` : ""}`).join("; ");
  return [
    output.title,
    output.subtitle,
    "",
    output.introduction,
    "",
    ...output.sections.flatMap((section) => [section.heading, section.body, section.sourceRefs.length ? `Fuentes: ${refs(section.sourceRefs)}` : "", ""]),
    output.conclusion ? "Conclusión\n" + output.conclusion : "",
    output.bibliography.length ? `\nFuentes\n${output.bibliography.map((ref) => `- ${ref.kind === "web" ? `${ref.label}: ${ref.url}` : `${ref.label}${ref.pageNumber ? `, pág. ${ref.pageNumber}` : ""}`}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

async function visualToPngDataUrl() {
  const svg = document.getElementById("academic-task-visual") as SVGSVGElement | null;
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("No se pudo convertir la visualización a imagen."));
    image.src = url;
  });
  const viewBox = svg.viewBox.baseVal;
  const scale = Math.max(2, 1200 / Math.max(1, viewBox.width), 700 / Math.max(1, viewBox.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewBox.width * scale);
  canvas.height = Math.round(viewBox.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no pudo crear el lienzo de exportación.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/png");
}

export function exportTaskMarkdown(output: TaskOutput) {
  const text = outputToPlainText(output);
  triggerDownload(new Blob([text], { type: "text/markdown;charset=utf-8" }), `${safeName(output.title)}.md`);
}

export async function exportTaskDocx(output: TaskOutput) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: output.title, heading: HeadingLevel.TITLE }),
  ];
  if (output.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: output.subtitle, italics: true })] }));
  if (output.introduction) {
    children.push(new Paragraph({ text: "Introducción", heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: output.introduction }));
  }
  for (const section of output.sections) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    for (const block of section.body.split(/\n+/).filter(Boolean)) children.push(new Paragraph({ text: block }));
    if (section.sourceRefs.length) children.push(new Paragraph({ children: [new TextRun({ text: `Fuentes: ${section.sourceRefs.map((ref) => ref.kind === "web" ? `${ref.label} (${ref.url})` : `${ref.label}${ref.pageNumber ? `, pág. ${ref.pageNumber}` : ""}`).join("; ")}`, italics: true })] }));
  }
  if (output.visual.enabled && output.visual.nodes.length) {
    children.push(new Paragraph({ text: "Estructura visual", heading: HeadingLevel.HEADING_1 }));
    output.visual.nodes.forEach((node) => children.push(new Paragraph({ text: `${"  ".repeat(Math.max(0, node.level))}${node.label}${node.detail ? ` — ${node.detail}` : ""}` })));
  }
  if (output.conclusion) {
    children.push(new Paragraph({ text: "Conclusión", heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: output.conclusion }));
  }
  if (output.bibliography.length) {
    children.push(new Paragraph({ text: "Fuentes", heading: HeadingLevel.HEADING_1 }));
    output.bibliography.forEach((ref) => children.push(new Paragraph({ text: ref.kind === "web" ? `${ref.label}: ${ref.url}` : `${ref.label}${ref.pageNumber ? `, pág. ${ref.pageNumber}` : ""}`, bullet: { level: 0 } })));
  }
  const doc = new Document({ sections: [{ properties: {}, children }] });
  triggerDownload(await Packer.toBlob(doc), `${safeName(output.title)}.docx`);
}

export async function exportTaskPdf(output: TaskOutput) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const width = 612 - margin * 2;
  let y = 56;

  function ensure(lines = 1, size = 12) {
    if (y + lines * (size + 6) > 742) {
      pdf.addPage();
      y = 56;
    }
  }
  function text(value: string, size = 11, bold = false, gap = 8) {
    if (!value) return;
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(value, width) as string[];
    ensure(lines.length, size);
    pdf.text(lines, margin, y);
    y += lines.length * (size + 4) + gap;
  }

  text(output.title, 20, true, 10);
  text(output.subtitle, 11, false, 16);
  if (output.visual.enabled) {
    try {
      const visual = await visualToPngDataUrl();
      if (visual) {
        pdf.addPage();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("Visualización", margin, 48);
        pdf.addImage(visual, "PNG", margin, 70, width, 330, undefined, "FAST");
        pdf.addPage();
        y = 56;
      }
    } catch {
      // Si el navegador no puede rasterizar el SVG, el PDF textual sigue siendo válido.
    }
  }
  if (output.introduction) { text("Introducción", 14, true, 6); text(output.introduction, 11, false, 14); }
  for (const section of output.sections) {
    text(section.heading, 14, true, 6);
    text(section.body, 11, false, 10);
    if (section.sourceRefs.length) text(`Fuentes: ${section.sourceRefs.map((ref) => ref.kind === "web" ? `${ref.label} — ${ref.url}` : `${ref.label}${ref.pageNumber ? `, pág. ${ref.pageNumber}` : ""}`).join("; ")}`, 8, false, 12);
  }
  if (output.conclusion) { text("Conclusión", 14, true, 6); text(output.conclusion, 11, false, 12); }
  if (output.bibliography.length) {
    text("Fuentes", 14, true, 6);
    output.bibliography.forEach((ref) => text(`• ${ref.kind === "web" ? `${ref.label}: ${ref.url}` : `${ref.label}${ref.pageNumber ? `, pág. ${ref.pageNumber}` : ""}`}`, 9, false, 4));
  }
  pdf.save(`${safeName(output.title)}.pdf`);
}

export async function exportTaskPptx(output: TaskOutput) {
  const mod = await import("pptxgenjs");
  const PptxGenJS = mod.default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Maestría Lab";
  pptx.subject = output.subtitle;
  pptx.title = output.title;
  pptx.company = "Maestría Lab";

  const titleSlide = pptx.addSlide();
  titleSlide.addText(output.title, { x: 0.8, y: 1.6, w: 11.7, h: 1.0, fontFace: "Aptos Display", fontSize: 30, bold: true, color: "12253A" });
  if (output.subtitle) titleSlide.addText(output.subtitle, { x: 0.85, y: 2.8, w: 11, h: 0.6, fontFace: "Aptos", fontSize: 16, color: "5E7185" });

  if (output.introduction) {
    const slide = pptx.addSlide();
    slide.addText("Introducción", { x: 0.7, y: 0.55, w: 12, h: 0.5, fontSize: 24, bold: true, color: "12253A" });
    slide.addText(output.introduction, { x: 0.8, y: 1.4, w: 11.7, h: 5.4, fontSize: 17, color: "334A60", margin: 0.05, valign: "top" });
  }

  for (const section of output.sections) {
    const slide = pptx.addSlide();
    slide.addText(section.heading, { x: 0.7, y: 0.55, w: 12, h: 0.55, fontSize: 24, bold: true, color: "12253A" });
    const bulletLines = section.body.split(/\n+/).filter(Boolean).slice(0, 7).map((line) => `• ${line.replace(/^[-•]\s*/, "")}`).join("\n");
    slide.addText(bulletLines || section.body, { x: 0.9, y: 1.4, w: 11.4, h: 5.2, fontSize: 17, color: "334A60", margin: 0.05, valign: "top" });
  }

  if (output.conclusion) {
    const slide = pptx.addSlide();
    slide.addText("Conclusión", { x: 0.7, y: 0.55, w: 12, h: 0.55, fontSize: 24, bold: true, color: "12253A" });
    slide.addText(output.conclusion, { x: 0.9, y: 1.4, w: 11.4, h: 5.2, fontSize: 17, color: "334A60", margin: 0.05, valign: "top" });
  }

  await pptx.writeFile({ fileName: `${safeName(output.title)}.pptx` });
}

export async function exportVisualPng(output: TaskOutput) {
  const dataUrl = await visualToPngDataUrl();
  if (!dataUrl) throw new Error("No hay una visualización disponible para exportar.");
  const response = await fetch(dataUrl);
  const png = await response.blob();
  triggerDownload(png, `${safeName(output.title)}.png`);
}
