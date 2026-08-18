"use client";

import { type FormEvent, useEffect, useState } from "react";
import { BookOpenCheck, Braces, GitBranch, Lightbulb, LoaderCircle, MessageSquareText, Send, Shapes, Sparkles, WandSparkles } from "lucide-react";
import { askStudyAssistant } from "@/lib/experience-api";
import type { StudyAssistantAction, StudyAssistantResult } from "@/lib/experience/types";

const quickModes: Array<{ value: Exclude<StudyAssistantAction, "custom" | "question">; label: string; icon: typeof Lightbulb }> = [
  { value: "simple", label: "Más fácil", icon: Lightbulb },
  { value: "analogy", label: "Analogía", icon: WandSparkles },
  { value: "visual", label: "Dibújamelo", icon: Shapes },
  { value: "example", label: "Otro ejemplo", icon: Sparkles },
  { value: "python", label: "Con código", icon: Braces },
  { value: "deeper", label: "Más rigor", icon: BookOpenCheck },
  { value: "connection", label: "Conecta ideas", icon: GitBranch },
];

export function ContextTutorPanel({ moduleId, topicId, conceptId }: { moduleId: string; topicId: string; conceptId: string }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState<StudyAssistantAction | null>(null);
  const [result, setResult] = useState<StudyAssistantResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { setResult(null); setMessage(""); setQuestion(""); setActiveAction(null); }, [topicId, conceptId]);

  async function run(action: StudyAssistantAction, customQuestion?: string) {
    setBusy(true); setActiveAction(action); setMessage("");
    try { const response = await askStudyAssistant(moduleId, topicId, conceptId, action, action === "custom" ? customQuestion?.trim() : undefined); setResult(response.result); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo consultar al tutor."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (question.trim()) await run("custom", question); }

  return (
    <section className="study-panel-elevated rounded-[18px] p-4">
      <div className="flex items-center gap-2 study-accent"><Sparkles className="size-4" /><p className="meta-font text-[8px] font-black uppercase">No entendí / Tutor</p></div>
      <p className="mt-2 text-sm leading-6 study-muted">Cambia la explicación sin salir de la lección. Las analogías están limitadas a microbloques breves.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">{quickModes.map(({ value, label, icon: Icon }) => <button key={value} type="button" disabled={busy} onClick={() => run(value)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-2.5 text-left text-[11px] font-bold transition ${activeAction === value && result ? "border-[var(--study-accent)] study-accent-soft study-text" : "study-line study-muted hover:text-[var(--study-ink)]"} disabled:opacity-40`}>{busy && activeAction === value ? <LoaderCircle className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}{label}</button>)}</div>
      <form onSubmit={submit} className="mt-3 flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta algo específico…" className="min-h-10 min-w-0 flex-1 rounded-xl border study-line bg-transparent px-3 text-sm study-text outline-none" /><button type="submit" disabled={busy || !question.trim()} aria-label="Preguntar" className="study-accent-bg grid size-10 shrink-0 place-items-center rounded-xl disabled:opacity-40">{busy && activeAction === "custom" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}</button></form>
      {message && <p className="mt-3 text-sm text-warn">{message}</p>}
      {result && <article className="mt-4 rounded-xl border study-line p-4"><div className="flex items-center gap-2"><MessageSquareText className="size-4 study-accent" /><p className="text-sm font-black study-text">{result.title}</p></div><p className="mt-3 whitespace-pre-line text-sm leading-7 study-muted">{result.answer}</p>{result.code && <pre className="mt-3 overflow-x-auto rounded-xl bg-[#080b12] p-3 text-xs leading-5 text-white"><code>{result.code}</code></pre>}{result.challenge && <p className="mt-3 border-t study-line pt-3 text-xs font-bold study-accent">Pruébate: {result.challenge}</p>}</article>}
    </section>
  );
}
