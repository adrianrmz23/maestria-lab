"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Braces, ChevronRight, CircleAlert, FileText, Lightbulb, ListChecks, Network, Sparkles } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { StudyAssistantDesk } from "@/components/study-assistant-desk";
import { InlineConceptQuiz } from "@/components/inline-concept-quiz";
import { getLearningManifest } from "@/lib/learning-api";
import type { LearningConcept, LearningManifest, SourceReference } from "@/lib/pedagogy/types";

const layers = [
  { id: "easy", label: "Explícamelo fácil", short: "Fácil", icon: Lightbulb },
  { id: "masters", label: "Nivel Maestría", short: "Maestría", icon: BookOpen },
  { id: "quiz", label: "Cuestionario", short: "Quiz", icon: ListChecks },
  { id: "deepen", label: "Profundizar", short: "Profundizar", icon: Braces },
  { id: "applicationAI", label: "Aplicación en IA", short: "Aplicación IA", icon: Network },
] as const;

type LayerId = typeof layers[number]["id"];

function referenceLabel(ref: SourceReference) {
  if (ref.pageNumber) return `pág. ${ref.pageNumber}`;
  return ref.label || `unidad ${ref.unitIndex}`;
}


function compactDeepen(text: string, maxWords = 170) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  const candidate = words.slice(0, maxWords).join(" ");
  const matches = [...candidate.matchAll(/[.!?](?=\s|$)/g)];
  const last = matches.at(-1)?.index;
  if (last !== undefined && last > candidate.length * 0.6) return `${candidate.slice(0, last + 1)} …`;
  return `${candidate}…`;
}

function SourceRefs({ refs }: { refs: SourceReference[] }) {
  const unique = Array.from(new Map(refs.map((ref) => [`${ref.unitIndex}-${ref.pageNumber ?? "x"}`, ref])).values());
  return <div className="flex flex-wrap gap-2">{unique.map((ref) => <span key={`${ref.unitIndex}-${ref.pageNumber ?? "x"}`} className="meta-font border border-line bg-surface px-2 py-1 text-[8px] uppercase text-muted">Fuente · {referenceLabel(ref)}</span>)}</div>;
}

function ConceptReader({ concept, moduleId, topicId }: { concept: LearningConcept; moduleId: string; topicId: string }) {
  const [layer, setLayer] = useState<LayerId>("easy");
  const [fullDeepen, setFullDeepen] = useState(false);
  const active = layers.find((item) => item.id === layer)!;
  const deepenWords = concept.deepen.trim().split(/\s+/);
  const deepenIsLong = deepenWords.length > 190;
  const deepenPreview = deepenIsLong ? compactDeepen(concept.deepen) : concept.deepen;
  const ActiveIcon = active.icon;

  return (
    <article>
      <header className="border-b-2 border-ink pb-5">
        <p className="meta-font text-[9px] font-bold uppercase text-accent">Concepto</p>
        <h2 className="display-font mt-2 text-4xl leading-none sm:text-5xl">{concept.title}</h2>
        <p className="mt-4 max-w-3xl text-[18px] leading-8 text-muted md:text-[19px]">{concept.whyItMatters}</p>
      </header>

      <section className="mt-6 border-l-2 border-moss pl-4 sm:pl-5">
        <div className="flex items-center gap-2 text-moss"><FileText className="size-4" aria-hidden="true" /><span className="meta-font text-[9px] font-bold uppercase">Lo que sostiene la fuente</span></div>
        <p className="mt-3 max-w-3xl text-[18px] leading-[1.8] text-ink md:text-[19px]">{concept.sourceSummary}</p>
        <div className="mt-4"><SourceRefs refs={concept.sourceRefs} /></div>
      </section>

      <section className="mt-8">
        <p className="meta-font mb-2 text-[9px] font-bold uppercase text-muted">Capas de comprensión</p>
        <div className="flex gap-1 overflow-x-auto border-b border-line scrollbar-none">
          {layers.map((item) => {
            const Icon = item.icon;
            const selected = item.id === layer;
            return (
              <button key={item.id} type="button" onClick={() => setLayer(item.id)} className={`focus-ring relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-[15px] font-bold sm:px-4 md:text-base ${selected ? "text-accent" : "text-muted hover:text-ink"}`}>
                <Icon className="size-3.5" aria-hidden="true" /><span className="sm:hidden">{item.short}</span><span className="hidden sm:inline">{item.label}</span><span className={`absolute inset-x-0 bottom-0 h-0.5 ${selected ? "bg-accent" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        {layer === "quiz" ? (
          <div className="pt-5">
            <InlineConceptQuiz moduleId={moduleId} topicId={topicId} conceptId={concept.id} onContinue={() => { setLayer("deepen"); setFullDeepen(false); }} />
          </div>
        ) : (
          <div className="paper-sheet border-x border-b border-line p-5 sm:p-7 md:p-8">
            <div className="flex items-center gap-2 text-accent"><ActiveIcon className="size-4" aria-hidden="true" /><span className="meta-font text-[9px] font-bold uppercase">Explicación IA · {active.label}</span></div>
            {layer === "deepen" ? (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                  <p className="meta-font text-[8px] font-bold uppercase text-muted">Profundización esencial · lectura breve</p>
                  <span className="meta-font text-[8px] uppercase text-muted">{Math.max(1, Math.ceil((fullDeepen ? deepenWords.length : Math.min(deepenWords.length, 170)) / 180))} min aprox.</span>
                </div>
                <p className="mt-4 whitespace-pre-line text-[19px] leading-[1.85] text-ink md:text-[18px] md:leading-[1.8]">{fullDeepen ? concept.deepen : deepenPreview}</p>
                {deepenIsLong && (
                  <button type="button" onClick={() => setFullDeepen((value) => !value)} className="focus-ring mt-5 inline-flex min-h-11 items-center border border-line-strong px-3 text-sm font-bold text-muted hover:border-accent hover:text-accent">
                    {fullDeepen ? "Volver a versión resumida" : "Ver desarrollo completo"}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-4 whitespace-pre-line text-[19px] leading-[1.85] text-ink md:text-[18px] md:leading-[1.8]">{concept[layer]}</p>
            )}
            <p className="mt-5 border-t border-line pt-3 text-[15px] leading-6 text-muted md:text-base">Esta capa es una reformulación pedagógica generada a partir de la fuente; no es una cita textual del documento.</p>
          </div>
        )}
      </section>

      {concept.examples.length > 0 && (
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-ink pb-3"><div><p className="meta-font text-[9px] font-bold uppercase text-muted">Ejemplos</p><h3 className="display-font mt-1 text-3xl">Verlo en acción</h3></div></div>
          <div className="divide-y divide-line border-b border-line">
            {concept.examples.map((example, index) => (
              <div key={`${example.title}-${index}`} className="grid gap-3 py-5 sm:grid-cols-[130px_minmax(0,1fr)]">
                <div><span className={`meta-font text-[8px] font-bold uppercase ${example.origin === "source" ? "text-moss" : "text-accent"}`}>{example.origin === "source" ? "Ejemplo de fuente" : "Ejemplo generado"}</span><p className="mt-2 text-base font-bold md:text-[17px]">{example.title}</p></div>
                <p className="text-[16px] leading-7 text-muted md:text-[17px]">{example.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="border-t-2 border-ink pt-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Antes de esto</p><h3 className="display-font mt-1 text-2xl">Prerrequisitos</h3>{concept.prerequisites.length ? <ul className="mt-4 space-y-2 text-[16px] leading-7 text-muted md:text-[17px]">{concept.prerequisites.map((item) => <li key={item} className="flex gap-2"><span className="text-accent">—</span>{item}</li>)}</ul> : <p className="mt-4 text-[16px] leading-7 text-muted md:text-[17px]">No se detectaron prerrequisitos explícitos.</p>}</div>
        <div className="border-t-2 border-warn pt-4"><div className="flex items-center gap-2 text-warn"><CircleAlert className="size-4" aria-hidden="true" /><p className="meta-font text-[9px] font-bold uppercase">Errores comunes</p></div><h3 className="display-font mt-1 text-2xl">Dónde suele confundirse</h3>{concept.commonMistakes.length ? <ul className="mt-4 space-y-2 text-[16px] leading-7 text-muted md:text-[17px]">{concept.commonMistakes.map((item) => <li key={item} className="flex gap-2"><span className="text-warn">—</span>{item}</li>)}</ul> : <p className="mt-4 text-[16px] leading-7 text-muted md:text-[17px]">Sin errores comunes registrados.</p>}</div>
      </section>

      <StudyAssistantDesk moduleId={moduleId} topicId={topicId} conceptId={concept.id} />
    </article>
  );
}

export function LearnView() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [manifest, setManifest] = useState<LearningManifest | null>(null);
  const [status, setStatus] = useState("Cargando contenido…");
  const [topicIndex, setTopicIndex] = useState(0);
  const [conceptIndex, setConceptIndex] = useState(0);
  const [queryApplied, setQueryApplied] = useState(false);

  useEffect(() => {
    if (!studyModule) return;
    let cancelled = false;
    getLearningManifest(studyModule.id).then((record) => {
      if (cancelled) return;
      if (record.status === "ready" && record.manifest) {
        setManifest(record.manifest);
        setStatus("");
      } else {
        setStatus(record.status === "error" ? record.generationError || "El contenido pedagógico requiere atención." : "Este módulo todavía no tiene un Learning Manifest listo.");
      }
    }).catch((error) => { if (!cancelled) setStatus(error instanceof Error ? error.message : "No se pudo cargar Aprende."); });
    return () => { cancelled = true; };
  }, [studyModule]);

  useEffect(() => {
    if (!manifest || queryApplied || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const requestedTopicId = query.get("topicId");
    const requestedConceptId = query.get("conceptId");
    if (requestedTopicId) {
      const nextTopicIndex = manifest.topics.findIndex((item) => item.id === requestedTopicId);
      if (nextTopicIndex >= 0) {
        const nextConceptIndex = requestedConceptId ? manifest.topics[nextTopicIndex].concepts.findIndex((item) => item.id === requestedConceptId) : 0;
        setTopicIndex(nextTopicIndex);
        setConceptIndex(nextConceptIndex >= 0 ? nextConceptIndex : 0);
      }
    }
    setQueryApplied(true);
  }, [manifest, queryApplied]);

  const topic = manifest?.topics[topicIndex];
  const concept = topic?.concepts[conceptIndex];
  const totalConcepts = useMemo(() => manifest?.topics.reduce((sum, item) => sum + item.concepts.length, 0) ?? 0, [manifest]);

  if (!studyModule) {
    return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <><h1 className="display-font text-4xl">Módulo no encontrado.</h1><Link href="/biblioteca" className="mt-5 inline-flex min-h-11 items-center font-bold text-accent">Volver a Biblioteca</Link></> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;
  }

  if (!manifest || !topic || !concept) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 lg:px-10">
        <Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" aria-hidden="true" /> Volver al módulo</Link>
        <div className="paper-sheet mt-7 border border-line p-6 sm:p-8"><p className="meta-font text-[9px] font-bold uppercase text-accent">Modo Aprende</p><h1 className="display-font mt-2 text-4xl">Todavía no hay una ruta lista.</h1><p className="mt-4 text-base leading-7 text-muted">{status}</p><Link href={`/modulos/${studyModule.slug}`} className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-bold text-white hover:bg-accent">Ir al motor pedagógico <ChevronRight className="size-4" aria-hidden="true" /></Link></div>
      </div>
    );
  }

  function selectTopic(index: number) { setTopicIndex(index); setConceptIndex(0); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 md:py-9 lg:px-10">
      <header className="border-b-2 border-ink pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" aria-hidden="true" /> Ficha del módulo</Link><div className="flex gap-2"><Link href={`/modulos/${studyModule.slug}/laboratorio`} className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent">Laboratorio</Link><Link href={`/modulos/${studyModule.slug}/practica`} className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent">Practica</Link></div></div>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end"><div><p className="meta-font text-[9px] font-bold uppercase text-accent">Aprende / {studyModule.subject}</p><h1 className="display-font mt-2 text-4xl leading-none sm:text-5xl">{manifest.moduleTitle}</h1><p className="mt-3 max-w-3xl text-[17px] leading-8 text-muted md:text-[18px]">{manifest.overview}</p></div><dl className="border-l-2 border-accent pl-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">Temas</dt><dd className="font-bold">{manifest.topics.length}</dd></div><div className="mt-2 flex justify-between gap-4"><dt className="text-muted">Conceptos</dt><dd className="font-bold">{totalConcepts}</dd></div><div className="mt-2 flex justify-between gap-4"><dt className="text-muted">Fuente</dt><dd className="max-w-[150px] truncate font-bold" title={manifest.sourceDocumentName}>{manifest.sourceDocumentName}</dd></div></dl></div>
      </header>

      <div className="mt-7 grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <p className="meta-font text-[9px] font-bold uppercase text-muted">Mapa del módulo</p>
          <ol className="mt-3 border-y border-line">
            {manifest.topics.map((item, index) => <li key={item.id} className="border-t border-line first:border-t-0"><button type="button" onClick={() => selectTopic(index)} className={`focus-ring grid min-h-14 w-full grid-cols-[30px_minmax(0,1fr)] items-center gap-3 px-2 text-left ${index === topicIndex ? "bg-accent-soft/45 text-ink" : "text-muted hover:text-ink"}`}><span className={`display-font text-lg ${index === topicIndex ? "text-accent" : "text-line-strong"}`}>{String(index + 1).padStart(2, "0")}</span><span className={`text-[15px] leading-6 md:text-base ${index === topicIndex ? "font-bold" : "font-medium"}`}>{item.title}</span></button></li>)}
          </ol>
          <div className="mt-6 border-l-2 border-moss pl-4"><div className="flex items-center gap-2 text-moss"><Sparkles className="size-4" aria-hidden="true" /><span className="meta-font text-[9px] font-bold uppercase">Fidelidad visible</span></div><p className="mt-2 text-[15px] leading-6 text-muted md:text-base">Las referencias de fuente y el contenido generado se muestran como capas distintas.</p></div>
        </aside>

        <main className="min-w-0">
          <section className="mb-7 border-b border-line pb-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="meta-font text-[9px] font-bold uppercase text-muted">Tema {String(topicIndex + 1).padStart(2, "0")}</p><h2 className="display-font mt-1 text-3xl">{topic.title}</h2></div><SourceRefs refs={topic.sourceRefs} /></div><p className="mt-3 max-w-3xl text-[17px] leading-8 text-muted md:text-[18px]">{topic.summary}</p></section>

          <div className="mb-7 flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Conceptos del tema">
            {topic.concepts.map((item, index) => <button key={item.id} type="button" onClick={() => setConceptIndex(index)} className={`focus-ring min-h-12 shrink-0 border px-3 text-[14px] font-bold md:text-[15px] ${index === conceptIndex ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:border-accent hover:text-accent"}`}>{String(index + 1).padStart(2, "0")} · {item.title}</button>)}
          </div>
          <ConceptReader key={`${topic.id}-${concept.id}`} concept={concept} moduleId={studyModule.id} topicId={topic.id} />
        </main>
      </div>
    </div>
  );
}
