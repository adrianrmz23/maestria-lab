"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, ChevronLeft, ChevronRight, Info, Lightbulb, LoaderCircle, RefreshCw, Sparkles, TriangleAlert, X } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { generateReaderAnnotation, getReaderUnit } from "@/lib/reader-api";
import { structureReaderContent, type ReaderBlock } from "@/lib/reader/structure";
import type { ReaderAnnotation, ReaderUnit } from "@/lib/reader/types";

type TextSize = "compact" | "comfortable" | "large";

const kindMeta = {
  concept: { label: "Concepto", icon: Info },
  example: { label: "Ejemplo", icon: Lightbulb },
  warning: { label: "Ojo", icon: TriangleAlert },
  formula: { label: "Notación", icon: Sparkles },
  context: { label: "Contexto", icon: BookOpenText },
} as const;

function textSizeClass(textSize: TextSize) {
  if (textSize === "compact") return "text-[17px] leading-[1.8] sm:text-[18px]";
  if (textSize === "large") return "text-[21px] leading-[1.92] sm:text-[23px]";
  return "text-[19px] leading-[1.88] sm:text-[20px]";
}

function annotationForBlock(block: ReaderBlock, annotations: ReaderAnnotation[]) {
  const direct = annotations.find((annotation) => annotation.blockIndex === block.index);
  if (direct) return direct;
  const normalized = block.text.replace(/\s+/g, " ").toLowerCase();
  return annotations.find((annotation) => annotation.blockIndex === null && normalized.includes(annotation.phrase.replace(/\s+/g, " ").toLowerCase()));
}

function ReaderHelpPanel({ annotation, onClose }: { annotation: ReaderAnnotation; onClose: () => void }) {
  const meta = kindMeta[annotation.kind];
  const Icon = meta.icon;
  return (
    <div className="mt-3 border border-line-strong bg-surface px-4 py-4 shadow-[0_12px_34px_rgba(52,43,30,0.07)] sm:px-5" role="region" aria-label={`Ayuda: ${annotation.title}`}>
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div>
          <p className="meta-font inline-flex items-center gap-2 text-[9px] font-bold uppercase text-accent"><Icon className="size-3.5" aria-hidden="true" /> Ayuda IA · {meta.label}</p>
          <h4 className="display-font mt-2 text-2xl leading-tight text-ink">{annotation.title}</h4>
        </div>
        <button type="button" onClick={onClose} className="focus-ring grid size-10 shrink-0 place-items-center text-muted hover:text-accent" aria-label="Cerrar ayuda"><X className="size-4" /></button>
      </div>
      <p className="mt-4 text-[15px] leading-7 text-ink">{annotation.explanation}</p>
      {annotation.example && (
        <div className="mt-4 border-l-2 border-moss bg-moss-soft/35 px-4 py-3">
          <p className="meta-font text-[8px] font-bold uppercase text-moss">Ejemplo para aterrizarlo</p>
          <p className="mt-2 text-sm leading-6 text-ink">{annotation.example}</p>
        </div>
      )}
      <p className="meta-font mt-4 text-[8px] uppercase text-muted">Generado con {annotation.provider} · {annotation.model} · no sustituye la fuente</p>
    </div>
  );
}

function ReadingBlock({
  block,
  annotation,
  active,
  busy,
  textSize,
  onToggle,
  onGenerate,
}: {
  block: ReaderBlock;
  annotation?: ReaderAnnotation;
  active: boolean;
  busy: boolean;
  textSize: TextSize;
  onToggle: () => void;
  onGenerate: () => void;
}) {
  if (block.type === "heading") {
    return (
      <section className="mt-10 border-t-2 border-ink pt-6 first:mt-2 first:border-t-0 first:pt-0">
        <p className="meta-font mb-2 text-[9px] font-bold uppercase text-accent">Nueva sección</p>
        <h2 className="display-font text-[30px] leading-[1.08] text-ink sm:text-[36px]">{block.text}</h2>
      </section>
    );
  }

  if (block.type === "subheading") {
    return <h3 className="display-font mt-8 border-l-2 border-accent pl-4 text-[24px] leading-tight text-ink sm:text-[28px]">{block.text}</h3>;
  }

  const isList = block.type === "list";
  return (
    <section className={`mt-6 ${isList ? "border-l-2 border-line-strong pl-4" : ""}`}>
      <div className={`${textSizeClass(textSize)} font-normal text-ink ${isList ? "relative pl-4 before:absolute before:left-0 before:top-[0.82em] before:size-1.5 before:rounded-full before:bg-accent" : ""}`}>
        {block.text}
      </div>
      <div className="mt-3 flex items-center gap-3 border-b border-line pb-4">
        <button
          type="button"
          onClick={annotation ? onToggle : onGenerate}
          disabled={busy}
          className={`focus-ring inline-flex min-h-10 items-center gap-2 text-xs font-bold transition-colors disabled:opacity-45 ${annotation ? "text-moss hover:text-accent" : "text-accent hover:text-accent-ink"}`}
        >
          {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
          {busy ? "Preparando ayuda…" : annotation ? (active ? "Ocultar ayuda" : "Ver ayuda IA") : "Entender mejor este párrafo"}
        </button>
        <span className="meta-font hidden text-[8px] uppercase text-muted sm:inline">explicación + ejemplo · bajo demanda</span>
      </div>
      {annotation && active && <ReaderHelpPanel annotation={annotation} onClose={onToggle} />}
    </section>
  );
}

export function DocumentReader() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated, retrySourceExtraction } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [unitIndex, setUnitIndex] = useState(1);
  const [unit, setUnit] = useState<ReaderUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [helpBusy, setHelpBusy] = useState<number | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [textSize, setTextSize] = useState<TextSize>("comfortable");

  const blocks = useMemo(() => structureReaderContent(unit?.content || ""), [unit?.content]);
  const legacyFlatText = Boolean(unit && unit.content.length > 900 && !unit.content.includes("\n"));

  useEffect(() => {
    if (!studyModule) return;
    try {
      const remembered = Number(window.localStorage.getItem(`maestria-lab.reader.${studyModule.id}`) || "1");
      if (Number.isFinite(remembered) && remembered > 1) setUnitIndex(Math.floor(remembered));
      const savedSize = window.localStorage.getItem(`maestria-lab.reader-size.${studyModule.id}`) as TextSize | null;
      if (savedSize === "compact" || savedSize === "comfortable" || savedSize === "large") setTextSize(savedSize);
    } catch { /* lectura disponible sin preferencias */ }
  }, [studyModule]);

  useEffect(() => {
    if (!studyModule) return;
    try { window.localStorage.setItem(`maestria-lab.reader.${studyModule.id}`, String(unitIndex)); } catch { /* opcional */ }
    setLoading(true);
    setMessage("");
    setActiveBlock(null);
    getReaderUnit(studyModule.id, unitIndex)
      .then((next) => { setUnit(next); if (next.unitIndex !== unitIndex) setUnitIndex(next.unitIndex); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo abrir el documento."))
      .finally(() => setLoading(false));
  }, [studyModule, unitIndex]);

  function chooseTextSize(size: TextSize) {
    setTextSize(size);
    if (studyModule) try { window.localStorage.setItem(`maestria-lab.reader-size.${studyModule.id}`, size); } catch { /* opcional */ }
  }

  async function generateHelp(blockIndex: number) {
    if (!studyModule || !unit) return;
    setHelpBusy(blockIndex);
    setMessage("");
    try {
      const result = await generateReaderAnnotation(studyModule.id, unit.unitIndex, blockIndex);
      setUnit(result.unit);
      setActiveBlock(blockIndex);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la ayuda para este párrafo.");
    } finally {
      setHelpBusy(null);
    }
  }

  async function rebuildReadingStructure() {
    if (!studyModule) return;
    const confirmed = window.confirm("Esto volverá a extraer el documento para conservar mejor títulos, líneas y párrafos. Las ayudas del lector y el índice RAG anteriores se invalidarán y podrán regenerarse después. ¿Continuar?");
    if (!confirmed) return;
    setRebuilding(true);
    setMessage("Reconstruyendo el formato de lectura desde el documento original…");
    try {
      const result = await retrySourceExtraction(studyModule.id);
      if (result?.extractionStatus !== "ready") throw new Error(result?.extractionError || "No se pudo reconstruir la extracción.");
      const next = await getReaderUnit(studyModule.id, unitIndex);
      setUnit(next);
      setMessage("Formato del lector actualizado. Ahora se conservan mejor títulos, líneas y párrafos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el formato de lectura.");
    } finally {
      setRebuilding(false);
    }
  }

  if (!studyModule) return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <><h1 className="display-font text-4xl">Módulo no encontrado.</h1><Link href="/biblioteca" className="mt-5 inline-flex min-h-11 items-center font-bold text-accent">Volver a Biblioteca</Link></> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;

  return (
    <div className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="border-b-2 border-ink pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" /> Ficha del módulo</Link>
          <div className="flex items-center gap-1 border border-line-strong bg-surface p-1" aria-label="Tamaño de lectura">
            {(["compact", "comfortable", "large"] as TextSize[]).map((size, index) => <button key={size} type="button" onClick={() => chooseTextSize(size)} aria-pressed={textSize === size} className={`focus-ring min-h-10 min-w-10 px-2 font-bold ${textSize === size ? "bg-ink text-white" : "text-muted"}`}>{index === 0 ? "A−" : index === 1 ? "A" : "A+"}</button>)}
          </div>
        </div>
        <p className="meta-font mt-4 text-[9px] font-bold uppercase text-accent">Lector académico · fuente original</p>
        <h1 className="display-font mt-2 max-w-4xl text-4xl leading-none sm:text-5xl">Una lectura que respeta la estructura del documento.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">Temas, subtemas y párrafos se separan visualmente. La fuente permanece intacta y cada ayuda IA aparece después del párrafo, solo cuando tú la pides.</p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[96px] lg:self-start">
          <div className="border-l-2 border-moss pl-4">
            <p className="meta-font text-[9px] font-bold uppercase text-moss">Documento</p>
            <p className="mt-2 text-sm font-bold leading-5">{studyModule.sourceDocument?.name || "Fuente del módulo"}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{unit?.pageNumber ? `Página ${unit.pageNumber}` : unit ? `Unidad ${unit.unitIndex}` : "Cargando…"}</p>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="meta-font text-[8px] font-bold uppercase text-muted">Cómo funciona</p>
            <p className="mt-2 text-xs leading-5 text-muted">Lee primero la fuente. Al terminar cada párrafo puedes pedir una aclaración breve y un ejemplo sin abandonar la lectura.</p>
          </div>
          {legacyFlatText && (
            <button type="button" onClick={rebuildReadingStructure} disabled={rebuilding} className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-warn px-3 text-xs font-bold text-warn hover:bg-warn hover:text-white disabled:opacity-45">
              {rebuilding ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Actualizar formato
            </button>
          )}
        </aside>

        <main className="min-w-0">
          {loading ? (
            <div className="paper-sheet grid min-h-[420px] place-items-center border border-line"><div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-accent" /><p className="mt-3 text-sm text-muted">Preparando la página…</p></div></div>
          ) : unit ? (
            <article className="paper-sheet border border-line px-5 py-6 sm:px-8 sm:py-9 lg:px-12">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                <div>
                  <p className="meta-font text-[9px] font-bold uppercase text-accent">{unit.pageNumber ? "Página del documento" : "Unidad de lectura"}</p>
                  <h2 className="display-font mt-1 text-3xl text-ink">{unit.pageNumber ? `Página ${unit.pageNumber}` : unit.label}</h2>
                </div>
                <div className="text-right"><p className="meta-font text-[8px] uppercase text-muted">{unit.charCount.toLocaleString("es-MX")} caracteres</p><p className="meta-font mt-1 text-[8px] uppercase text-moss">{Math.round((unit.unitIndex / Math.max(1, unit.totalUnits)) * 100)}% recorrido</p></div>
              </div>
              <div className="mt-1 h-[3px] bg-surface-strong" aria-hidden="true"><div className="h-full bg-moss transition-[width]" style={{ width: `${Math.round((unit.unitIndex / Math.max(1, unit.totalUnits)) * 100)}%` }} /></div>

              <div className="mx-auto mt-7 max-w-[70ch]">
                {blocks.length ? blocks.map((block) => {
                  const annotation = annotationForBlock(block, unit.annotations);
                  return <ReadingBlock key={`${unit.unitIndex}-${block.index}`} block={block} annotation={annotation} active={activeBlock === block.index} busy={helpBusy === block.index} textSize={textSize} onToggle={() => setActiveBlock((current) => current === block.index ? null : block.index)} onGenerate={() => generateHelp(block.index)} />;
                }) : <p className={`${textSizeClass(textSize)} text-muted`}>[Sin texto seleccionable]</p>}
              </div>

              <div className="mx-auto mt-10 max-w-[70ch] border-t-2 border-ink pt-5">
                <p className="meta-font text-[9px] font-bold uppercase text-moss">Fin de {unit.pageNumber ? `la página ${unit.pageNumber}` : "la unidad"}</p>
                <p className="mt-2 text-sm leading-6 text-muted">Las ayudas IA son opcionales y están separadas de la fuente. Puedes leer todo el documento sin generar ninguna.</p>
              </div>
            </article>
          ) : <div className="paper-sheet border border-line p-7"><h2 className="display-font text-3xl">No pudimos cargar esta unidad.</h2></div>}

          {message && <p role="status" className={`mt-3 border-l-4 p-3 text-sm leading-6 text-ink ${message.includes("actualizado") ? "border-moss bg-moss-soft/45" : "border-warn bg-accent-soft/35"}`}>{message}</p>}

          {unit && <div className="mt-4 flex items-center justify-between gap-3 border-y border-line py-3">
            <button type="button" disabled={unit.unitIndex <= 1 || loading} onClick={() => setUnitIndex((value) => Math.max(1, value - 1))} className="focus-ring inline-flex min-h-11 items-center gap-1 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:opacity-30"><ChevronLeft className="size-4" /> Anterior</button>
            <label className="meta-font inline-flex items-center gap-2 text-[9px] uppercase text-muted"><span className="hidden sm:inline">Ir a</span><input aria-label="Ir a unidad o página" type="number" min={1} max={unit.totalUnits} value={unit.unitIndex} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) setUnitIndex(Math.min(unit.totalUnits, Math.max(1, Math.floor(next)))); }} className="focus-ring h-10 w-14 border border-line-strong bg-surface px-2 text-center text-xs font-bold text-ink" /><span>/ {unit.totalUnits}</span></label>
            <button type="button" disabled={unit.unitIndex >= unit.totalUnits || loading} onClick={() => setUnitIndex((value) => Math.min(unit.totalUnits, value + 1))} className="focus-ring inline-flex min-h-11 items-center gap-1 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:opacity-30">Siguiente <ChevronRight className="size-4" /></button>
          </div>}
        </main>
      </div>
    </div>
  );
}
