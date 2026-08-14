"use client";

import { type FormEvent, useState } from "react";
import { BookOpenCheck, Braces, CircleHelp, GitBranch, LoaderCircle, MessageSquareText, RefreshCw, Send, Sparkles, WandSparkles } from "lucide-react";
import { askStudyAssistant } from "@/lib/experience-api";
import type { StudyAssistantAction, StudyAssistantResult } from "@/lib/experience/types";
import type { SourceReference } from "@/lib/pedagogy/types";

const actions: Array<{ id: Exclude<StudyAssistantAction, "custom">; label: string; icon: typeof Sparkles }> = [
  { id: "deeper", label: "Rigor claro", icon: BookOpenCheck },
  { id: "example", label: "Otro ejemplo", icon: WandSparkles },
  { id: "python", label: "Llévalo a Python", icon: Braces },
  { id: "question", label: "Ponme a prueba", icon: CircleHelp },
  { id: "connection", label: "Conecta ideas", icon: GitBranch },
];

function refLabel(ref: SourceReference) {
  return ref.pageNumber ? `pág. ${ref.pageNumber}` : ref.label || `unidad ${ref.unitIndex}`;
}

export function StudyAssistantDesk({ moduleId, topicId, conceptId }: { moduleId: string; topicId: string; conceptId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StudyAssistantResult | null>(null);
  const [model, setModel] = useState("");
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [activeAction, setActiveAction] = useState<StudyAssistantAction | null>(null);

  async function run(action: StudyAssistantAction, customQuestion?: string) {
    setBusy(true);
    setMessage("");
    setActiveAction(action);
    try {
      const response = await askStudyAssistant(moduleId, topicId, conceptId, action, customQuestion);
      setResult(response.result);
      setModel(response.model);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la consulta.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    await run("custom", value);
  }

  return (
    <section id={`study-assistant-${conceptId}`} className="mt-10 scroll-mt-24 border-y-2 border-ink py-6 sm:py-8">
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <div className="flex items-center gap-2 text-accent"><Sparkles className="size-4" aria-hidden="true" /><p className="meta-font text-[9px] font-bold uppercase">Mesa de estudio IA</p></div>
          <h3 className="display-font mt-2 text-3xl">Profundiza sin convertirlo en una pared de texto.</h3>
          <p className="mt-3 text-[16px] leading-7 text-muted md:text-[17px]">Consultas contextuales ancladas al tema y a sus unidades de fuente. No es un chat general ni modifica el Manifest.</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {actions.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" disabled={busy} onClick={() => run(id)} className={`focus-ring inline-flex min-h-11 items-center gap-2 border px-3 text-[14px] font-bold transition-colors disabled:opacity-50 md:text-[15px] ${activeAction === id && result ? "border-accent bg-accent-soft/40 text-accent" : "border-line-strong text-muted hover:border-accent hover:text-accent"}`}>
                {busy && activeAction === id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />} {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`study-question-${conceptId}`} className="sr-only">Pregunta sobre el concepto</label>
            <input id={`study-question-${conceptId}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta algo específico sobre este concepto…" className="focus-ring min-h-12 min-w-0 flex-1 border border-line-strong bg-surface px-4 text-base outline-none focus:border-accent" />
            <button type="submit" disabled={busy || !question.trim()} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-4 text-sm font-bold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45">
              {busy && activeAction === "custom" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Consultar
            </button>
          </form>

          {message && <div role="status" className="mt-3 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6 text-ink">{message}</div>}

          {result && (
            <article className="paper-sheet mt-5 border border-line p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2 text-accent"><MessageSquareText className="size-4" aria-hidden="true" /><span className="meta-font text-[9px] font-bold uppercase">Respuesta contextual</span></div>
                <span className="meta-font text-[8px] uppercase text-muted">{model || "IA"}</span>
              </div>
              <h4 className="display-font mt-5 text-2xl sm:text-3xl">{result.title}</h4>
              <p className="mt-4 whitespace-pre-line text-[19px] leading-[1.85] text-ink md:text-[18px] md:leading-[1.8]">{result.answer}</p>

              {result.takeaways.length > 0 && (
                <div className="mt-6 border-l-2 border-moss pl-4">
                  <p className="meta-font text-[9px] font-bold uppercase text-moss">Qué deberías retener</p>
                  <ul className="mt-3 space-y-2 text-[16px] leading-7 text-muted md:text-[17px]">{result.takeaways.map((item) => <li key={item} className="flex gap-2"><span className="text-moss">—</span><span>{item}</span></li>)}</ul>
                </div>
              )}

              {result.code && <pre className="mt-6 overflow-x-auto border border-line bg-ink p-4 text-sm leading-6 text-white"><code>{result.code}</code></pre>}
              {result.challenge && <div className="mt-6 border-t border-line pt-4"><p className="meta-font text-[9px] font-bold uppercase text-warn">Comprueba si lo entendiste</p><p className="mt-2 text-[16px] font-bold leading-7 text-ink md:text-[17px]">{result.challenge}</p></div>}
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">{result.sourceRefs.length ? result.sourceRefs.map((ref) => <span key={`${ref.unitIndex}-${ref.pageNumber ?? "x"}`} className="meta-font border border-line bg-canvas px-2 py-1 text-[8px] uppercase text-muted">Fuente · {refLabel(ref)}</span>) : <span className="text-[15px] leading-6 text-muted md:text-base">La respuesta no necesitó una referencia adicional a la fuente.</span>}</div>
              <button type="button" onClick={() => result && activeAction && run(activeAction, activeAction === "custom" ? question : undefined)} disabled={busy} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 text-[14px] font-bold text-muted hover:text-accent disabled:opacity-50 md:text-[15px]"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> Generar otra respuesta</button>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
