"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, Gauge, LoaderCircle, Target, TestTubeDiagonal } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { KnowledgeMapPanel } from "@/components/learning/knowledge-map-panel";
import { getLearningDashboard } from "@/lib/learning-engine-api";
import type { LearningDashboard } from "@/lib/learning-engine/types";
import { getModuleMastery } from "@/lib/mastery-api";
import type { ModuleMasterySummary } from "@/lib/mastery/types";

export function MasteryDashboard({ initialModuleId }: { initialModuleId?: string }) {
  const { modules, hydrated } = useModules();
  const activeModules = useMemo(() => modules.filter((module) => module.status !== "Archivado"), [modules]);
  const [moduleId, setModuleId] = useState(initialModuleId || "");
  const [summary, setSummary] = useState<ModuleMasterySummary | null>(null);
  const [learning, setLearning] = useState<LearningDashboard | null>(null);
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
    setBusy(true); setMessage("Calculando evidencia de dominio…");
    Promise.all([getModuleMastery(moduleId), getLearningDashboard(moduleId).catch(() => null)])
      .then(([result, learningResult]) => { if (!cancelled) { setSummary(result); setLearning(learningResult); setMessage(""); } })
      .catch((error) => { if (!cancelled) { setSummary(null); setLearning(null); setMessage(error instanceof Error ? error.message : "No se pudo calcular el dominio."); } })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [moduleId]);

  const selectedModule = activeModules.find((module) => module.id === moduleId);

  return (
    <div className="app-frame py-6 lg:py-8">
      <section className="lab-hero rounded-[24px] p-6 sm:p-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div><p className="meta-font text-[8px] font-black uppercase text-accent">Dominio · evidencia real</p><h1 className="display-font mt-3 max-w-4xl text-4xl sm:text-5xl">Mide lo que puedes recuperar y aplicar.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-muted">El índice combina práctica, dificultad, exámenes, cantidad de evidencia y recencia. Un único acierto no basta para declarar un concepto dominado.</p></div>
          <label className="text-xs font-bold text-muted">Módulo<select value={moduleId} onChange={(event) => setModuleId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink"><option value="">Selecciona…</option>{activeModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
        </div>
      </section>

      {busy && <div className="lab-card mt-3 flex min-h-24 items-center gap-3 rounded-[18px] p-5 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> {message}</div>}
      {!busy && message && !summary && <div className="lab-card mt-3 rounded-[18px] p-5 text-sm text-warn">{message}</div>}

      {summary && selectedModule && <>
        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[8px] font-black uppercase text-muted">Dominio global</p><p className="mt-2 text-3xl font-black text-ink">{summary.overallScore}%</p></div>
          <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[8px] font-black uppercase text-muted">Lectura</p><p className="mt-2 text-lg font-black text-ink">{summary.readiness}</p></div>
          <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[8px] font-black uppercase text-muted">Evidencia</p><p className="mt-2 text-3xl font-black text-ink">{summary.evidenceCount}</p><p className="text-xs text-muted">respuestas</p></div>
          <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[8px] font-black uppercase text-muted">Cobertura</p><p className="mt-2 text-3xl font-black text-ink">{summary.attemptedConcepts}/{summary.totalConcepts}</p></div>
          <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[8px] font-black uppercase text-muted">Repasos</p><p className="mt-2 text-3xl font-black text-ink">{learning?.dueReviewCount ?? 0}</p><p className="text-xs text-muted">pendientes</p></div>
        </section>

        {learning && <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Contenido visto", learning.dimensions.completion],["Comprensión", learning.dimensions.comprehension],["Aplicación", learning.dimensions.application],["Retención", learning.dimensions.retention]].map(([label,value]) => <div key={String(label)} className="lab-card rounded-[16px] p-4"><p className="meta-font text-[8px] font-black uppercase text-muted">{label}</p><p className="mt-2 text-3xl font-black text-ink">{value}%</p><div className="lab-progress-track mt-3 h-1.5 overflow-hidden rounded-full"><div className="lab-progress-fill h-full rounded-full" style={{ width: `${value}%` }} /></div></div>)}</section>}

        <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="lab-card rounded-[18px] p-5"><div className="flex items-center justify-between gap-4"><div><p className="meta-font text-[8px] font-black uppercase text-muted">Índice de conceptos</p><h2 className="mt-2 text-xl font-extrabold text-ink">Qué sabes y qué necesita repaso</h2></div><Target className="size-5 text-accent" /></div><div className="mt-4 space-y-2">{summary.concepts.map((item,index) => <article key={`${item.topicId}:${item.conceptId}`} className="rounded-[14px] border border-line bg-surface-strong p-4"><div className="flex items-start gap-3"><span className="meta-font text-[9px] font-black text-muted">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-ink">{item.conceptTitle}</p><p className="mt-1 text-xs text-muted">{item.status} · {item.evidenceCount} evidencias</p><div className="lab-progress-track mt-3 h-1.5 overflow-hidden rounded-full"><div className="lab-progress-fill h-full rounded-full" style={{ width: `${item.score}%` }} /></div></div><strong className="text-sm text-accent">{item.score}%</strong></div>{item.weakestMisconception && <p className="mt-3 text-xs leading-5 text-warn">Señal: {item.weakestMisconception}</p>}</article>)}</div></div>
          <aside className="lab-card rounded-[18px] p-5 xl:sticky xl:top-24"><div className="flex items-center gap-2 text-accent"><BrainCircuit className="size-4" /><p className="meta-font text-[8px] font-black uppercase">Foco prioritario</p></div><h3 className="mt-3 text-xl font-extrabold text-ink">{summary.weakest[0]?.conceptTitle || "Aún sin señales"}</h3><p className="mt-3 text-sm leading-6 text-muted">{summary.weakest[0]?.evidenceCount ? `Registra ${summary.weakest[0].score}% de dominio con ${summary.weakest[0].evidenceCount} evidencias.` : "Todavía no existe evidencia suficiente."}</p><div className="mt-4 space-y-2">{summary.weakest.slice(0,3).map((item) => <div key={item.conceptId} className="flex items-center justify-between rounded-xl bg-surface-strong px-3 py-2 text-sm"><span className="truncate text-muted">{item.conceptTitle}</span><strong className="text-accent">{item.score}%</strong></div>)}</div><div className="mt-4 flex gap-2"><Link href={`/modulos/${selectedModule.slug}/refuerzo`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-bold text-white">Refuerzo <ArrowRight className="size-3.5" /></Link><Link href={`/modulos/${selectedModule.slug}/evaluacion`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-xs font-bold text-muted"><TestTubeDiagonal className="size-3.5" /> Examen</Link></div><div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted"><Gauge className="mt-0.5 size-4 shrink-0" /> La confianza aumenta conforme acumulas evidencia variada.</div></aside>
        </section>

        <div className="mt-3"><KnowledgeMapPanel /></div>
      </>}
    </div>
  );
}
