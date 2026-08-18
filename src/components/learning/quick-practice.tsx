"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleHelp, LoaderCircle, PanelsTopLeft } from "lucide-react";
import { evaluateExercise } from "@/lib/experience-api";
import type { ConceptExperience, PracticeEvaluation, PracticeExercise } from "@/lib/experience/types";

function exercisesFrom(experience: ConceptExperience) {
  const inline = experience.inlineQuiz?.length ? experience.inlineQuiz : [];
  return inline.length ? inline : experience.exercises;
}

export function QuickPractice({ moduleId, topicId, conceptId, experience, onEvaluated }: { moduleId: string; topicId: string; conceptId: string; experience: ConceptExperience; onEvaluated?: (evaluation: PracticeEvaluation) => void }) {
  const exercises = useMemo(() => exercisesFrom(experience), [experience]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setIndex(0); setAnswer(""); setEvaluation(null); setHintOpen(false); setMessage(""); }, [conceptId, experience]);
  if (!exercises.length) return null;

  const exercise: PracticeExercise = exercises[index % exercises.length];
  const choiceExercise = exercise.type !== "short_answer";

  async function verify() {
    if (!answer.trim()) return;
    setBusy(true); setMessage("");
    try { const result = await evaluateExercise(moduleId, topicId, conceptId, exercise.id, answer, exercise.type); setEvaluation(result); onEvaluated?.(result); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo evaluar la respuesta."); }
    finally { setBusy(false); }
  }

  function next() { setIndex((current) => (current + 1) % exercises.length); setAnswer(""); setEvaluation(null); setHintOpen(false); setMessage(""); }

  return (
    <section className="study-panel-elevated overflow-hidden rounded-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b study-line px-4 py-3"><div className="flex items-center gap-2 study-accent"><PanelsTopLeft className="size-4" /><p className="meta-font text-[8px] font-black uppercase">Caso rápido</p></div><span className="rounded-full border study-line px-2.5 py-1 text-[8px] font-black uppercase study-muted">Reto {(index % exercises.length) + 1}/{exercises.length}</span></div>
      <div className="p-4 sm:p-5">
        <p className="text-[15px] font-bold leading-7 study-text">{exercise.prompt}</p>
        {choiceExercise ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{exercise.options.map((option, optionIndex) => <button key={`${option}-${optionIndex}`} type="button" disabled={Boolean(evaluation)} onClick={() => { setAnswer(option); setMessage(""); }} className={`min-h-12 rounded-xl border px-4 py-3 text-left text-[14px] leading-6 transition ${answer === option ? "border-[var(--study-accent)] study-accent-soft study-text" : "study-line study-muted hover:text-[var(--study-ink)]"} disabled:cursor-default`}><span className="meta-font mr-2 text-[9px] study-muted">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div> : <textarea value={answer} disabled={Boolean(evaluation)} onChange={(event) => setAnswer(event.target.value)} rows={3} placeholder="Razona con tus propias palabras…" className="mt-4 w-full rounded-xl border study-line bg-transparent px-4 py-3 text-base leading-7 study-text outline-none" />}
        {!evaluation && <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={verify} disabled={busy || !answer.trim()} className="study-accent-bg inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Comprobar</button><button type="button" onClick={() => setHintOpen((current) => !current)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border study-line px-3 text-sm font-bold study-muted"><CircleHelp className="size-4" /> {hintOpen ? "Ocultar pista" : "Pista"}</button></div>}
        {hintOpen && !evaluation && <p className="study-accent-soft mt-3 rounded-xl border study-line p-4 text-sm leading-6 study-text"><strong>Pista:</strong> {exercise.hint}</p>}
        {evaluation && <div className="mt-4 rounded-xl border study-line p-4"><p className={`text-sm font-black ${evaluation.correct ? "text-moss" : "text-warn"}`}>{evaluation.correct ? "Correcto" : "Todavía no"}</p><p className="mt-2 text-sm leading-6 study-text">{evaluation.feedback}</p><p className="mt-2 text-sm leading-6 study-muted">{exercise.explanation}</p>{evaluation.misconception && <p className="mt-3 text-xs font-bold leading-5 text-warn">Revisa: {evaluation.misconception}</p>}<button type="button" onClick={next} className="study-accent-bg mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black">Siguiente reto <ChevronRight className="size-4" /></button></div>}
        {message && <p className="mt-3 text-sm font-medium text-warn">{message}</p>}
      </div>
    </section>
  );
}
