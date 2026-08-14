"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, BrainCircuit, CircleAlert, Gauge, LoaderCircle, Target, TestTubeDiagonal } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { getModuleMastery } from "@/lib/mastery-api";
import type { ConceptMastery, ModuleMasterySummary } from "@/lib/mastery/types";

function scoreTone(score: number, evidence: number) {
  if (!evidence) return "bg-line-strong";
  if (score < 50) return "bg-accent";
  if (score < 70) return "bg-warn";
  return "bg-moss";
}

function statusText(item: ConceptMastery) {
  if (!item.evidenceCount) return "Sin evidencia";
  return `${item.status} · ${item.evidenceCount} intento${item.evidenceCount === 1 ? "" : "s"}`;
}

export function MasteryDashboard({ initialModuleId }: { initialModuleId?: string }) {
  const { modules, hydrated } = useModules();
  const activeModules = useMemo(() => modules.filter((module) => module.status !== "Archivado"), [modules]);
  const [moduleId, setModuleId] = useState(initialModuleId || "");
  const [summary, setSummary] = useState<ModuleMasterySummary | null>(null);
  const [message, setMessage] = useState("Selecciona un módulo con Learning Manifest para calcular el dominio.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated || moduleId) return;
    const preferred = activeModules.find((module) => module.sourceDocument?.extractionStatus === "ready") ?? activeModules[0];
    if (preferred) setModuleId(preferred.id);
  }, [activeModules, hydrated, moduleId]);

  useEffect(() => {
    if (!moduleId) return;
    let cancelled = false;
    setBusy(true);
    setMessage("Calculando evidencia de dominio…");
    getModuleMastery(moduleId)
      .then((result) => { if (!cancelled) { setSummary(result); setMessage(""); } })
      .catch((error) => { if (!cancelled) { setSummary(null); setMessage(error instanceof Error ? error.message : "No se pudo calcular el dominio."); } })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [moduleId]);

  const selectedModule = activeModules.find((module) => module.id === moduleId);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 md:py-12 lg:px-10 lg:py-14">
      <header className="border-b-2 border-ink pb-7">
        <p className="meta-font text-[10px] font-bold uppercase text-accent">Dominio · evidencia real</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
          <div>
            <h1 className="display-font max-w-4xl text-4xl leading-[0.98] sm:text-5xl md:text-6xl">No mide cuánto viste.<br />Mide qué puedes recuperar y aplicar.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">El índice combina práctica, dificultad, exámenes, cantidad de evidencia y recencia. Por diseño, un único acierto no basta para declarar un concepto dominado.</p>
          </div>
          <label className="text-xs font-bold text-muted">Módulo
            <select value={moduleId} onChange={(event) => setModuleId(event.target.value)} className="focus-ring mt-2 min-h-12 w-full border border-line-strong bg-surface px-3 text-base font-medium text-ink">
              <option value="">Selecciona…</option>
              {activeModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
          </label>
        </div>
      </header>

      {busy && <div className="mt-7 flex min-h-24 items-center gap-3 border-y border-line text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> {message}</div>}
      {!busy && message && !summary && <div className="mt-7 border-l-4 border-warn bg-accent-soft/35 p-5 text-sm leading-6 text-ink">{message}</div>}

      {summary && selectedModule && (
        <>
          <section className="mt-8 grid gap-7 border-b border-line pb-8 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="meta-font text-[9px] font-bold uppercase text-muted">Lectura del módulo</p><h2 className="display-font mt-1 text-3xl sm:text-4xl">{summary.moduleTitle}</h2></div>
                <div className="flex items-baseline gap-1"><span className="display-font text-5xl">{summary.overallScore}</span><span className="text-sm text-muted">/100</span></div>
              </div>
              <div className="mt-4 h-[7px] bg-surface-strong" aria-label={`Dominio global ${summary.overallScore}%`}><div className={`h-full ${scoreTone(summary.overallScore, summary.evidenceCount)}`} style={{ width: `${summary.overallScore}%` }} /></div>
              <dl className="mt-5 grid gap-4 border-y border-line py-4 sm:grid-cols-3">
                <div><dt className="meta-font text-[8px] uppercase text-muted">Lectura</dt><dd className="mt-1 text-sm font-bold">{summary.readiness}</dd></div>
                <div><dt className="meta-font text-[8px] uppercase text-muted">Evidencia</dt><dd className="mt-1 text-sm font-bold">{summary.evidenceCount} respuestas registradas</dd></div>
                <div><dt className="meta-font text-[8px] uppercase text-muted">Cobertura</dt><dd className="mt-1 text-sm font-bold">{summary.attemptedConcepts}/{summary.totalConcepts} conceptos con evidencia</dd></div>
              </dl>
            </div>
            <aside className="border-l-2 border-moss pl-5">
              <div className="flex items-center gap-2 text-moss"><BrainCircuit className="size-4" /><p className="meta-font text-[9px] font-bold uppercase">Siguiente movimiento</p></div>
              <h3 className="display-font mt-3 text-2xl">Estudia donde la evidencia lo pide.</h3>
              <p className="mt-3 text-sm leading-6 text-muted">La sesión adaptativa usa los conceptos más débiles o con poca evidencia para distribuir el tiempo disponible.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/modulos/${selectedModule.slug}/refuerzo`} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent">Preparar refuerzo <ArrowRight className="size-3.5" /></Link>
                <Link href={`/modulos/${selectedModule.slug}/evaluacion`} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-4 text-xs font-bold text-muted hover:border-accent hover:text-accent"><TestTubeDiagonal className="size-3.5" /> Evaluación</Link>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.45fr)_320px] lg:items-start">
            <div className="paper-sheet border border-line">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6"><div className="flex items-center gap-2"><Target className="size-4 text-accent" /><span className="text-sm font-bold">Índice de conceptos</span></div><span className="meta-font hidden text-[9px] uppercase text-muted sm:block">Práctica + examen + confianza</span></div>
              <div className="divide-y divide-line">
                {summary.concepts.map((item, index) => (
                  <article key={`${item.topicId}:${item.conceptId}`} className="grid gap-4 px-5 py-5 sm:grid-cols-[42px_minmax(0,1fr)_84px] sm:items-center sm:px-6">
                    <span className="display-font text-2xl text-line-strong">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="meta-font text-[8px] uppercase text-muted">{item.topicTitle}</p>
                      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className="font-bold text-ink">{item.conceptTitle}</h3><span className="text-xs text-muted sm:hidden">{item.score}%</span></div>
                      <p className="mt-1 text-xs text-muted">{statusText(item)} · práctica {item.practiceCount} · examen {item.examCount}</p>
                      <div className="mt-3 h-[5px] bg-surface-strong"><div className={`h-full ${scoreTone(item.score, item.evidenceCount)}`} style={{ width: `${item.score}%` }} /></div>
                      {item.weakestMisconception && <p className="mt-2 text-xs leading-5 text-warn"><strong>Señal:</strong> {item.weakestMisconception}</p>}
                    </div>
                    <div className="hidden text-right sm:block"><span className="display-font text-3xl">{item.score}</span><span className="ml-0.5 text-sm text-muted">%</span><p className="meta-font mt-1 text-[7px] uppercase text-muted">{item.status}</p></div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="border-l-4 border-accent bg-accent-soft/45 p-5 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 text-accent"><CircleAlert className="size-4" /><p className="meta-font text-[9px] font-bold uppercase">Foco prioritario</p></div>
              <h2 className="display-font mt-4 text-3xl leading-tight">{summary.weakest[0]?.conceptTitle || "Aún sin señales"}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{summary.weakest[0]?.evidenceCount ? `Actualmente registra ${summary.weakest[0].score}% de dominio con ${summary.weakest[0].evidenceCount} evidencias.` : "Todavía no existe evidencia suficiente. Una primera sesión corta puede establecer la línea base."}</p>
              <div className="mt-6 border-y border-accent/20 py-3">
                {summary.weakest.slice(0, 3).map((item) => <div key={item.conceptId} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate text-muted">{item.conceptTitle}</span><strong className="shrink-0 text-accent">{item.score}%</strong></div>)}
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-muted"><Gauge className="size-4" /><span>La confianza aumenta gradualmente hasta seis evidencias por concepto.</span></div>
              <Link href={`/modulos/${selectedModule.slug}/refuerzo`} className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-accent">Crear sesión adaptativa <ArrowRight className="size-4" /></Link>
            </aside>
          </section>

          <section className="mt-8 border-t-2 border-ink pt-5">
            <div className="flex gap-3"><BookOpenCheck className="mt-1 size-5 text-moss" /><div><p className="meta-font text-[9px] font-bold uppercase text-moss">Cómo leer el porcentaje</p><p className="mt-2 max-w-4xl text-sm leading-7 text-muted">El porcentaje no es una media cruda. Las respuestas de mayor dificultad pesan más, los exámenes aportan una señal independiente y la evidencia reciente tiene una ligera prioridad. Además se aplica una penalización de confianza cuando existen pocos intentos, para evitar falsos 100% después de una sola respuesta correcta.</p></div></div>
          </section>
        </>
      )}
    </div>
  );
}
