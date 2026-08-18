"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Clock3,
  Flame,
  Gauge,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";
import { getLearningDashboard } from "@/lib/learning-engine-api";
import type { LearningDashboard } from "@/lib/learning-engine/types";
import { createStudySession } from "@/lib/mastery-api";
import type { StudyDuration } from "@/lib/mastery/types";
import { useModules } from "@/components/module-provider";
import { formatModuleUpdated, sortModulesByUpdated } from "@/lib/module-utils";

const durations = [10, 20, 40] as const;
type Duration = typeof durations[number];

function LearningOrbit() {
  return (
    <div className="relative mx-auto size-[270px] max-w-full sm:size-[300px]" aria-hidden="true">
      <div className="lab-orbit absolute inset-0 rounded-full" />
      <div className="absolute inset-[38px] rounded-full border border-dashed border-accent/30" />
      <div className="absolute inset-[80px] rounded-full border border-dashed border-accent/40" />
      <div className="absolute left-1/2 top-1/2 grid size-[98px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[28px] bg-gradient-to-br from-[#0f6cbd] to-[#12a7a0] text-center text-white shadow-[0_20px_48px_rgba(15,108,189,.30)]">
        <div><p className="text-2xl font-black tracking-tight">ML</p><p className="meta-font mt-1 text-[7px] font-bold uppercase text-white/75">LAB</p></div>
      </div>
      {[['IA','50%','1%'],['DATA','100%','50%'],['MATH','50%','96%'],['LOGIC','1%','50%']].map(([label,left,top]) => (
        <span key={label} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-extrabold text-ink shadow-sm" style={{ left, top }}>{label}</span>
      ))}
    </div>
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const { modules } = useModules();
  const [minutes, setMinutes] = useState<Duration>(20);
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");

  const visible = useMemo(() => sortModulesByUpdated(modules.filter((module) => module.status !== "Archivado")), [modules]);
  const active = visible.find((module) => module.status === "En curso") ?? visible[0];
  const nextModule = visible.find((module) => module.id !== active?.id);
  const visibleProgress = dashboard?.dimensions.completion ?? active?.progress ?? 0;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    getLearningDashboard(active.id).then((result) => { if (!cancelled) setDashboard(result); }).catch(() => { if (!cancelled) setDashboard(null); });
    return () => { cancelled = true; };
  }, [active?.id]);

  async function startSmartSession() {
    if (!active) return;
    setSessionBusy(true);
    setSessionMessage("");
    try {
      const session = await createStudySession(active.id, minutes as StudyDuration);
      router.push(`/modulos/${active.slug}/refuerzo?sessionId=${encodeURIComponent(session.id)}`);
    } catch (error) {
      setSessionMessage(error instanceof Error ? error.message : "No se pudo preparar la sesión.");
    } finally {
      setSessionBusy(false);
    }
  }

  if (!active) {
    return (
      <div className="app-frame py-7 lg:py-8">
        <section className="lab-hero rounded-[26px] p-6 sm:p-8 lg:p-10">
          <p className="meta-font text-[9px] font-black uppercase text-accent">Maestría Lab</p>
          <h1 className="display-font mt-3 max-w-3xl text-4xl sm:text-6xl">Convierte tus documentos en práctica.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Crea tu primer módulo, vincula el documento y deja que la plataforma construya la ruta de aprendizaje.</p>
          <Link href="/modulos/nuevo" className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white">Crear primer módulo <ArrowRight className="size-4" /></Link>
        </section>
      </div>
    );
  }

  return (
    <div className="app-frame py-6 lg:py-8">
      <section className="lab-hero lab-enter grid gap-6 rounded-[26px] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:p-10">
        <div>
          <span className="meta-font inline-flex rounded-full bg-[#0b4167] px-3 py-1.5 text-[8px] font-black uppercase text-[#d7efff]">Maestría Lab · {visible.length} módulos disponibles</span>
          <h1 className="display-font mt-5 max-w-4xl text-[clamp(2.35rem,4vw,4.2rem)] leading-[1.01] text-ink">Aprende tu maestría <span className="text-accent">construyendo.</span></h1>
          <p className="mt-4 max-w-3xl text-[17px] leading-7 text-muted">Teoría, práctica, laboratorios, audio por lección y repaso adaptativo viven en un mismo lugar. El PDF queda como respaldo.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/modulos/${active.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,108,189,.22)]">Continuar {active.title.split(" ").slice(0,2).join(" ")} <ArrowRight className="size-4" /></Link>
            <button type="button" onClick={startSmartSession} disabled={sessionBusy} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-bold text-ink hover:border-accent disabled:opacity-50"><BookOpen className="size-4" /> {sessionBusy ? "Preparando…" : `Sesión ${minutes} min`}</button>
          </div>
          {sessionMessage && <p className="mt-3 text-xs font-bold text-warn">{sessionMessage}</p>}
        </div>
        <LearningOrbit />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="lab-stat rounded-[16px] px-4 py-4"><div className="flex items-center gap-3"><Flame className="size-5 text-accent" /><div><p className="text-xl font-black text-ink">{dashboard?.currentStreak ?? 0} <span className="text-sm font-semibold text-muted">días</span></p><p className="text-[12px] text-muted">racha actual</p></div></div></div>
        <div className="lab-stat rounded-[16px] px-4 py-4"><div className="flex items-center gap-3"><Target className="size-5 text-accent" /><div><p className="text-xl font-black text-ink">{visibleProgress}%</p><p className="text-[12px] text-muted">módulo activo</p></div></div></div>
        <div className="lab-stat rounded-[16px] px-4 py-4"><div className="flex items-center gap-3"><BrainCircuit className="size-5 text-accent" /><div><p className="text-xl font-black text-ink">{dashboard?.dimensions.comprehension ?? 0}%</p><p className="text-[12px] text-muted">comprensión</p></div></div></div>
        <div className="lab-stat rounded-[16px] px-4 py-4"><div className="flex items-center gap-3"><Gauge className="size-5 text-accent" /><div><p className="text-xl font-black text-ink">{dashboard?.dimensions.retention ?? 0}%</p><p className="text-[12px] text-muted">retención</p></div></div></div>
        <div className="lab-stat rounded-[16px] px-4 py-4"><div className="flex items-center gap-3"><Layers3 className="size-5 text-accent" /><div><p className="text-xl font-black text-ink">{dashboard?.dueReviewCount ?? 0}</p><p className="text-[12px] text-muted">repasos hoy</p></div></div></div>
      </section>

      {nextModule && (
        <section className="lab-card mt-3 grid gap-5 rounded-[20px] p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="meta-font text-[8px] font-black uppercase text-muted">Siguiente módulo</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-.025em] text-ink">{nextModule.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{nextModule.description}</p>
            <div className="mt-4 max-w-xl"><div className="lab-progress-track h-1.5 overflow-hidden rounded-full"><div className="lab-progress-fill h-full rounded-full" style={{ width: `${nextModule.progress}%` }} /></div><p className="mt-2 text-[10px] text-muted">{nextModule.progress}% completado</p></div>
          </div>
          <Link href={`/modulos/${nextModule.slug}`} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white">Abrir módulo <ArrowRight className="size-4" /></Link>
        </section>
      )}

      <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
        <article className="lab-card rounded-[20px] p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="meta-font text-[8px] font-black uppercase text-muted">Módulo activo</p><h2 className="mt-2 text-xl font-extrabold text-ink">Continúa donde lo dejaste</h2></div><BookOpen className="size-5 text-muted" /></div>
          <Link href={`/modulos/${active.slug}`} className="mt-4 flex items-center gap-4 rounded-[16px] border border-line bg-surface-strong p-4 transition hover:border-accent">
            <span className="text-3xl font-black text-accent">01</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-ink">{dashboard?.recommended?.conceptTitle || active.title}</p><p className="mt-1 truncate text-xs text-muted">{dashboard?.recommended?.reason || active.description}</p><div className="lab-progress-track mt-3 h-1.5 overflow-hidden rounded-full"><div className="lab-progress-fill h-full rounded-full" style={{ width: `${visibleProgress}%` }} /></div></div>
            <ArrowRight className="size-5 shrink-0 text-ink" />
          </Link>
        </article>

        <aside className="lab-card rounded-[20px] p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="meta-font text-[8px] font-black uppercase text-muted">Hoy</p><h2 className="mt-2 text-xl font-extrabold text-ink">Sesión recomendada</h2></div><Clock3 className="size-5 text-muted" /></div>
          <p className="mt-5 text-sm font-black text-accent">{minutes} min</p>
          <h3 className="mt-2 text-lg font-extrabold text-ink">Aprendizaje adaptativo</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Repasa lo débil, aprende el siguiente concepto y termina con práctica.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {durations.map((duration) => <button key={duration} type="button" onClick={() => setMinutes(duration)} className={`min-h-9 rounded-lg border text-xs font-bold ${minutes === duration ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted"}`}>{duration} min</button>)}
          </div>
          <button type="button" onClick={startSmartSession} disabled={sessionBusy} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">Comenzar sesión <ArrowRight className="size-4" /></button>
        </aside>
      </section>

      <section className="lab-card mt-3 rounded-[20px] p-5">
        <div className="flex items-start justify-between gap-4"><div><p className="meta-font text-[8px] font-black uppercase text-muted">Mapa de la maestría</p><h2 className="mt-2 text-xl font-extrabold text-ink">{visible.length} módulos · aprendizaje conectado</h2></div><Sparkles className="size-5 text-muted" /></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.slice(0, 6).map((item, index) => (
            <Link key={item.id} href={`/modulos/${item.slug}`} className="rounded-[16px] border border-line bg-surface-strong p-4 transition hover:border-accent">
              <div className="flex items-center justify-between gap-3"><span className="meta-font text-[9px] font-black text-muted">{String(index + 1).padStart(2,"0")}</span><span className="text-xs font-bold text-accent">{item.progress}%</span></div>
              <p className="mt-3 text-sm font-extrabold leading-5 text-ink">{item.title}</p>
              <p className="mt-2 text-xs text-muted">{item.topics} temas · {formatModuleUpdated(item.updatedAt)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
