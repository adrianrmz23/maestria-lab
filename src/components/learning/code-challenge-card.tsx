"use client";

import { useState } from "react";
import { Braces, CheckCircle2, Loader2, Play, RotateCcw } from "lucide-react";
import { askStudyAssistant } from "@/lib/experience-api";
import type { StudyAssistantResult } from "@/lib/experience/types";

interface CodeChallengeCardProps { moduleId: string; topicId: string; conceptId: string; conceptTitle: string; }

export function CodeChallengeCard({ moduleId, topicId, conceptId, conceptTitle }: CodeChallengeCardProps) {
  const [challenge, setChallenge] = useState<StudyAssistantResult | null>(null);
  const [solution, setSolution] = useState("");
  const [evaluation, setEvaluation] = useState<StudyAssistantResult | null>(null);
  const [busy, setBusy] = useState<"generate" | "evaluate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy("generate"); setError(null); setEvaluation(null);
    try { const { result } = await askStudyAssistant(moduleId, topicId, conceptId, "python"); setChallenge(result); setSolution(""); }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible generar el desafío."); }
    finally { setBusy(null); }
  };

  const evaluate = async () => {
    if (!solution.trim()) return;
    setBusy("evaluate"); setError(null);
    try {
      const { result } = await askStudyAssistant(moduleId, topicId, conceptId, "custom", `Evalúa mi solución para el desafío de programación relacionado con «${conceptTitle}». No ejecutes el código: revísalo por razonamiento. Señala primero qué está bien, luego cualquier error conceptual o de implementación y termina con una versión corregida breve si hace falta. Mi solución es:\n\n${solution}`);
      setEvaluation(result);
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible evaluar tu solución."); }
    finally { setBusy(null); }
  };

  return (
    <section className="study-panel-elevated rounded-[18px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="meta-font inline-flex items-center gap-2 text-[8px] font-black uppercase study-accent"><Braces size={14} /> Desafío de código</span><p className="mt-2 text-sm leading-6 study-muted">La IA crea un reto pequeño ligado al concepto actual y revisa tu solución sin ejecutar código.</p></div><button type="button" onClick={generate} disabled={busy !== null} className="inline-flex min-h-10 items-center gap-2 rounded-xl border study-line px-3 text-xs font-bold study-text disabled:opacity-40">{busy === "generate" ? <Loader2 className="size-4 animate-spin" /> : challenge ? <RotateCcw className="size-4" /> : <Play className="size-4" />}{challenge ? "Otro reto" : "Crear reto"}</button></div>
      {challenge ? <div className="mt-5 space-y-4"><div className="rounded-xl border study-line p-4 text-sm leading-6 study-text"><strong>Reto</strong><p className="mt-2">{challenge.challenge || challenge.answer}</p>{challenge.code && <pre className="mt-3 overflow-x-auto rounded-xl bg-[#080b12] p-4 text-xs text-white"><code>{challenge.code}</code></pre>}</div><textarea value={solution} onChange={(event) => setSolution(event.target.value)} rows={7} placeholder="Escribe tu solución o pseudocódigo…" className="w-full rounded-xl border study-line bg-transparent px-4 py-3 font-mono text-sm leading-6 study-text outline-none" /><button type="button" onClick={evaluate} disabled={busy !== null || !solution.trim()} className="study-accent-bg inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40">{busy === "evaluate" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Revisar solución</button>{evaluation && <div className="rounded-xl border study-line p-4"><p className="text-sm font-black study-text">{evaluation.title}</p><p className="mt-2 whitespace-pre-line text-sm leading-7 study-muted">{evaluation.answer}</p>{evaluation.code && <pre className="mt-3 overflow-x-auto rounded-xl bg-[#080b12] p-4 text-xs text-white"><code>{evaluation.code}</code></pre>}</div>}</div> : null}
      {error && <p className="mt-3 text-sm font-bold text-warn">{error}</p>}
    </section>
  );
}
