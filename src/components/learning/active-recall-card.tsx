"use client";

import { useEffect, useState } from "react";
import { Brain, CheckCircle2, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { submitRecall } from "@/lib/learning-engine-api";
import type { RecallEvaluation } from "@/lib/learning-engine/types";

function nextReviewLabel(value: string) {
  const date = new Date(value);
  const days = Math.max(1, Math.round((date.getTime() - Date.now()) / 86_400_000));
  return days <= 1 ? "mañana" : `en ${days} días`;
}

export function ActiveRecallCard({ moduleId, topicId, conceptId, conceptTitle, due, onUpdated }: { moduleId: string; topicId: string; conceptId: string; conceptTitle: string; due?: boolean; onUpdated?: () => void }) {
  const [response, setResponse] = useState("");
  const [evaluation, setEvaluation] = useState<RecallEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setResponse(""); setEvaluation(null); setMessage(""); }, [topicId, conceptId]);

  async function evaluate() {
    if (!response.trim()) return;
    setBusy(true); setMessage("");
    try { const result = await submitRecall(moduleId, topicId, conceptId, response.trim()); setEvaluation(result); onUpdated?.(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo evaluar el recuerdo activo."); }
    finally { setBusy(false); }
  }

  return (
    <section className="recall-card study-panel-elevated rounded-[18px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><span className="study-accent-soft grid size-10 shrink-0 place-items-center rounded-xl study-accent"><Brain className="size-5" /></span><div><div className="flex flex-wrap items-center gap-2"><p className="meta-font text-[8px] font-black uppercase study-accent">Recupera antes de releer</p>{due && <span className="rounded-full study-accent-soft px-2 py-1 text-[10px] font-black study-accent">REPASO HOY</span>}</div><p className="mt-1 text-sm font-extrabold study-text">¿Qué recuerdas de “{conceptTitle}”?</p></div></div>{!evaluation && <span className="meta-font text-[8px] uppercase study-muted">2–3 min · sin mirar</span>}</div>
      {!evaluation ? <><p className="mt-3 text-sm leading-6 study-muted">Explícalo con tus palabras: idea central, cómo funciona y un ejemplo.</p><textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={3} placeholder="Escribe lo que recuerdas…" className="mt-3 w-full rounded-xl border study-line bg-transparent px-4 py-3 text-sm leading-6 study-text outline-none" /><div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={evaluate} disabled={busy || !response.trim()} className="study-accent-bg inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Comprobar recuerdo</button><p className="text-xs study-muted">No bloquea la lección.</p></div></> : <div className="mt-4 grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)]"><div className="rounded-xl border study-line p-4 text-center"><p className="meta-font text-[8px] uppercase study-muted">Recuperación</p><p className="mt-1 text-4xl font-black study-text">{evaluation.score}</p><p className="text-xs study-muted">/100</p><p className="mt-2 text-[11px] font-bold text-moss">Retención {evaluation.retentionScore}%</p></div><div><div className="flex items-center gap-2 text-moss"><CheckCircle2 className="size-4" /><p className="text-sm font-black">Próximo repaso {nextReviewLabel(evaluation.nextReviewAt)}</p></div><p className="mt-2 text-sm leading-6 study-text">{evaluation.feedback}</p>{evaluation.missingIdeas.length > 0 && <div className="mt-3"><p className="meta-font text-[8px] font-black uppercase text-warn">Completa estas ideas</p><ul className="mt-2 space-y-1 text-sm leading-6 study-muted">{evaluation.missingIdeas.map((item) => <li key={item}>— {item}</li>)}</ul></div>}<button type="button" onClick={() => { setEvaluation(null); setResponse(""); }} className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-bold study-accent"><RotateCcw className="size-3.5" /> Intentar de nuevo</button></div></div>}
      {message && <p className="mt-3 text-sm font-bold text-warn">{message}</p>}
    </section>
  );
}
