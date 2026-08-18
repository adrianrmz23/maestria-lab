"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, BrainCircuit, CheckCircle2, Clock3, FlaskConical, ListChecks, LoaderCircle, Play, RotateCcw, TestTubeDiagonal } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { createStudySession, getStudySession, setStudySessionStatus } from "@/lib/mastery-api";
import type { StudyDuration, StudyPlanStep, StudySessionRecord } from "@/lib/mastery/types";

const durations: StudyDuration[] = [10, 20, 40];

function stepIcon(kind: StudyPlanStep["kind"]) {
  if (kind === "learn") return BookOpen;
  if (kind === "lab") return FlaskConical;
  if (kind === "practice") return ListChecks;
  if (kind === "exam") return TestTubeDiagonal;
  return BrainCircuit;
}

function stepHref(slug: string, step: StudyPlanStep) {
  const query = step.topicId && step.conceptId ? `?topicId=${encodeURIComponent(step.topicId)}&conceptId=${encodeURIComponent(step.conceptId)}` : "";
  if (step.kind === "learn") return `/modulos/${slug}/aprende${query}`;
  if (step.kind === "lab") return `/modulos/${slug}/laboratorio${query}`;
  if (step.kind === "practice") return `/modulos/${slug}/practica${query}`;
  if (step.kind === "exam") return `/modulos/${slug}/evaluacion`;
  return null;
}

export function AdaptiveStudyView() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [duration, setDuration] = useState<StudyDuration>(20);
  const [session, setSession] = useState<StudySessionRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("sessionId");
    if (!studyModule || !sessionId || session?.id === sessionId) return;
    let cancelled = false;
    setBusy(true);
    getStudySession(studyModule.id, sessionId).then((result) => { if (!cancelled) { setSession(result); setDuration(result.durationMinutes); setMessage(""); } }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "No se pudo cargar la sesión."); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [searchParams, studyModule, session?.id]);

  async function generate() {
    if (!studyModule) return;
    setBusy(true); setMessage("Leyendo tu dominio actual y distribuyendo el tiempo…");
    try { setSession(await createStudySession(studyModule.id, duration)); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo preparar la sesión."); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: "in_progress" | "completed") {
    if (!studyModule || !session) return;
    setBusy(true);
    try { setSession(await setStudySessionStatus(studyModule.id, session.id, status)); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar la sesión."); }
    finally { setBusy(false); }
  }

  if (!studyModule) return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <h1 className="display-font text-4xl">Módulo no encontrado.</h1> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;

  return (
    <div className="mx-auto max-w-[1050px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b-2 border-ink pb-7"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted"><ArrowLeft className="size-4" /> Ficha del módulo</Link><p className="meta-font mt-4 text-[9px] font-bold uppercase text-accent">Sesión adaptativa · Bloque 7</p><h1 className="display-font mt-2 text-4xl leading-none sm:text-5xl">Dime cuánto tiempo tienes. El sistema decide dónde invertirlo.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-muted">La sesión no recorre temas al azar: utiliza el índice de dominio para priorizar debilidades, confusiones detectadas y conceptos con poca evidencia.</p></header>

      {!session ? <section className="mt-8"><p className="meta-font text-[9px] font-bold uppercase text-muted">Tiempo disponible</p><div className="mt-3 flex flex-wrap gap-2">{durations.map((value) => <button key={value} type="button" onClick={() => setDuration(value)} className={`focus-ring min-h-12 min-w-20 border px-4 text-sm font-bold ${duration === value ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-muted hover:border-accent hover:text-accent"}`}>{value} min</button>)}</div><div className="paper-sheet mt-6 border border-line p-6 sm:p-8"><div className="flex gap-3"><Clock3 className="mt-1 size-5 text-accent" /><div><h2 className="display-font text-3xl">Sesión de {duration} minutos</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Se calculará en ese momento con tus intentos y exámenes actuales. Si estudias y vuelves mañana, la prioridad puede cambiar.</p></div></div><button type="button" onClick={generate} disabled={busy} className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />} Preparar sesión</button></div>{message && <div className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm">{message}</div>}</section> : <>
        <section className="mt-8 grid gap-7 border-b border-line pb-7 lg:grid-cols-[minmax(0,1fr)_290px]"><div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="meta-font text-[9px] font-bold uppercase text-accent">Plan · {session.durationMinutes} minutos</p><h2 className="display-font mt-2 text-4xl">Refuerzo deliberado</h2></div><span className="meta-font border border-line px-2 py-1 text-[8px] uppercase text-muted">{session.status === "planned" ? "Preparada" : session.status === "in_progress" ? "En curso" : "Completada"}</span></div><p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{session.plan.rationale}</p></div><aside className="border-l-2 border-accent pl-4"><p className="meta-font text-[9px] font-bold uppercase text-accent">Foco</p>{session.plan.focusConcepts.map((item) => <div key={item.conceptId} className="border-b border-line py-3"><div className="flex justify-between gap-3"><p className="text-sm font-bold">{item.conceptTitle}</p><strong className="text-sm text-accent">{item.masteryScore}%</strong></div><p className="mt-1 text-xs leading-5 text-muted">{item.reason}</p></div>)}</aside></section>

        <section className="mt-7"><div className="divide-y divide-line border-y border-line">{session.plan.steps.map((step, index) => { const Icon = stepIcon(step.kind); const href = stepHref(studyModule.slug, step); return <article key={step.id} className="grid gap-4 py-5 sm:grid-cols-[48px_70px_minmax(0,1fr)_auto] sm:items-center"><span className="display-font text-2xl text-line-strong">{String(index + 1).padStart(2, "0")}</span><div><p className="display-font text-2xl">{step.minutes}</p><p className="meta-font text-[7px] uppercase text-muted">min</p></div><div><div className="flex items-center gap-2"><Icon className="size-4 text-accent" /><h3 className="font-bold">{step.title}</h3></div><p className="mt-2 text-sm leading-6 text-muted">{step.instruction}</p>{step.conceptTitle && <p className="meta-font mt-2 text-[8px] uppercase text-moss">{step.conceptTitle}</p>}</div>{href ? <Link href={href} className="focus-ring inline-flex min-h-11 items-center justify-center border border-line-strong px-4 text-xs font-bold text-muted hover:border-accent hover:text-accent">Abrir</Link> : <span className="meta-font text-[8px] uppercase text-muted">Sin pantalla</span>}</article>; })}</div></section>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-5"><div>{session.status === "completed" ? <div className="flex items-center gap-2 text-moss"><CheckCircle2 className="size-5" /><strong>Sesión marcada como completada.</strong></div> : <p className="text-xs text-muted">El cronómetro no bloquea la sesión: esta estructura sirve para orientar, no para castigarte si tardas un poco más.</p>}</div><div className="flex gap-2">{session.status === "planned" && <button type="button" disabled={busy} onClick={() => changeStatus("in_progress")} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white"><Play className="size-3.5" /> Iniciar</button>}{session.status === "in_progress" && <button type="button" disabled={busy} onClick={() => changeStatus("completed")} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-moss px-4 text-xs font-bold text-white"><CheckCircle2 className="size-3.5" /> Terminar sesión</button>}<button type="button" onClick={() => setSession(null)} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-4 text-xs font-bold text-muted"><RotateCcw className="size-3.5" /> Recalcular</button></div></div>
        {message && <div className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm">{message}</div>}
      </>}
    </div>
  );
}
