"use client";

import { BrainCircuit, CheckCircle2, Flame, RefreshCw, Target } from "lucide-react";
import type { LearningDashboard } from "@/lib/learning-engine/types";

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Target }) {
  return (
    <div className="rounded-2xl border border-[#dfe5f2] bg-white/90 p-3">
      <div className="flex items-center justify-between gap-2"><p className="meta-font text-[8px] font-black uppercase text-muted">{label}</p><Icon className="size-3.5 text-accent" /></div>
      <div className="mt-2 flex items-end gap-2"><strong className="display-font text-3xl text-[#1d285b]">{value}</strong><span className="pb-1 text-xs font-bold text-muted">%</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-gradient-to-r from-[#5f54e7] to-[#25b8b0]" style={{ width: `${Math.max(2, value)}%` }} /></div>
    </div>
  );
}

export function LearningPulse({ dashboard }: { dashboard: LearningDashboard }) {
  return (
    <section className="learning-pulse rounded-[22px] border border-[#dfe5f2] bg-gradient-to-br from-white to-[#f8faff] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="meta-font text-[9px] font-black uppercase text-accent">Tu aprendizaje real</p><p className="mt-1 text-sm font-black text-[#1b2757]">No solo cuánto viste: qué comprendes, aplicas y retienes.</p></div>
        <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3e7] px-2.5 py-1.5 text-[#c86622]"><Flame className="size-3.5" /> {dashboard.currentStreak} días</span><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf8f6] px-2.5 py-1.5 text-moss"><RefreshCw className="size-3.5" /> {dashboard.dueReviewCount} repasos</span></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Metric label="Visto" value={dashboard.dimensions.completion} icon={CheckCircle2} />
        <Metric label="Comprensión" value={dashboard.dimensions.comprehension} icon={BrainCircuit} />
        <Metric label="Aplicación" value={dashboard.dimensions.application} icon={Target} />
        <Metric label="Retención" value={dashboard.dimensions.retention} icon={RefreshCw} />
      </div>
    </section>
  );
}
