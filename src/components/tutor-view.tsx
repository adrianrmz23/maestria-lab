"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenCheck, BrainCircuit, DatabaseZap, LoaderCircle, MessageSquareText, Plus, Send, Sparkles } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { askTutor, buildRagIndex, getTutorState } from "@/lib/rag-api";
import type { TutorMessage, TutorState } from "@/lib/rag/types";

const quickPrompts = [
  "Explícame el concepto más importante de este módulo y por qué importa.",
  "¿Qué parte del documento debería repasar primero según mis debilidades?",
  "Ponme un ejemplo aplicado a Python o Machine Learning basado en la fuente.",
  "Hazme una pregunta corta para comprobar si entendí lo esencial.",
];

function CitationList({ message }: { message: TutorMessage }) {
  if (!message.citations.length) return null;
  return <div className="mt-4 flex flex-wrap gap-2">{message.citations.map((citation) => <span key={`${message.id}-${citation.chunkId}`} className="meta-font border border-line bg-canvas px-2 py-1 text-[8px] uppercase text-muted">Fuente · {citation.pageNumber ? `pág. ${citation.pageNumber}` : citation.label || `unidad ${citation.unitIndex}`}</span>)}</div>;
}

export function TutorView() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [state, setState] = useState<TutorState | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [newThread, setNewThread] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (threadId?: string) => {
    if (!studyModule) return;
    setLoading(true);
    setMessage("");
    try {
      const next = await getTutorState(studyModule.id, threadId);
      setState(next);
      setActiveThreadId(next.thread?.id);
      setNewThread(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el tutor.");
    } finally {
      setLoading(false);
    }
  }, [studyModule]);

  useEffect(() => { if (studyModule) void load(); }, [studyModule, load]);

  async function prepareRag() {
    if (!studyModule) return;
    setIndexing(true);
    setMessage("Creando embeddings y preparando la recuperación semántica…");
    try {
      const rag = await buildRagIndex(studyModule.id);
      setState((current) => current ? { ...current, rag } : current);
      setMessage(`RAG listo: ${rag.chunkCount} fragmentos indexados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo preparar el RAG.");
    } finally {
      setIndexing(false);
    }
  }

  async function send(text: string) {
    if (!studyModule || !text.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await askTutor(studyModule.id, text.trim(), newThread ? null : activeThreadId ?? null);
      setQuestion("");
      await load(result.threadId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo responder la consulta.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await send(question);
  }

  const messages = useMemo(() => newThread ? [] : state?.messages ?? [], [newThread, state]);

  if (!studyModule) return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <><h1 className="display-font text-4xl">Módulo no encontrado.</h1><Link href="/biblioteca" className="mt-5 inline-flex min-h-11 items-center font-bold text-accent">Volver a Biblioteca</Link></> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b-2 border-ink pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" /> Ficha del módulo</Link>
          <Link href={`/modulos/${studyModule.slug}/lector`} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent"><BookOpenCheck className="size-4" /> Abrir lector</Link>
        </div>
        <p className="meta-font mt-4 text-[9px] font-bold uppercase text-accent">Tutor IA · RAG verificable</p>
        <h1 className="display-font mt-2 max-w-4xl text-4xl leading-none sm:text-5xl">Pregunta al documento, no a una memoria vaga.</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">El tutor recupera primero fragmentos relevantes de tu fuente y después construye la explicación. También puede usar tus señales de dominio para priorizar lo que más te cuesta.</p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[96px] lg:self-start">
          <div className={`border-l-4 px-4 py-4 ${state?.rag.ready ? "border-moss bg-moss-soft/45" : "border-warn bg-accent-soft/35"}`}>
            <div className="flex items-center gap-2"><DatabaseZap className={`size-4 ${state?.rag.ready ? "text-moss" : "text-warn"}`} /><p className="meta-font text-[9px] font-bold uppercase">Índice RAG</p></div>
            <p className="mt-2 text-sm font-bold">{state?.rag.ready ? `${state.rag.chunkCount} fragmentos listos` : "Todavía sin indexar"}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{state?.rag.ready ? `Embeddings: ${state.rag.embeddingModel || "OpenAI"}.` : "Se crea una vez por documento y luego se reutiliza en cada pregunta."}</p>
            <button type="button" disabled={indexing} onClick={prepareRag} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-current px-3 text-xs font-bold disabled:opacity-50">
              {indexing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {state?.rag.ready ? "Reconstruir índice" : "Preparar RAG"}
            </button>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2"><p className="meta-font text-[9px] font-bold uppercase text-muted">Conversaciones</p><button type="button" onClick={() => { setNewThread(true); setActiveThreadId(undefined); setMessage(""); }} className="focus-ring grid size-10 place-items-center border border-line-strong text-muted hover:text-accent" aria-label="Nueva conversación"><Plus className="size-4" /></button></div>
            <div className="mt-2 space-y-1">
              {state?.recentThreads.map((thread) => <button key={thread.id} type="button" onClick={() => void load(thread.id)} className={`focus-ring w-full border-l-2 px-3 py-2 text-left text-xs leading-5 ${!newThread && activeThreadId === thread.id ? "border-accent bg-surface font-bold text-ink" : "border-transparent text-muted hover:border-line-strong"}`}>{thread.title}</button>)}
              {!state?.recentThreads.length && <p className="text-xs leading-5 text-muted">Tu primera pregunta creará una sesión.</p>}
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {!state?.rag.ready ? (
            <section className="paper-sheet border border-line p-6 sm:p-8">
              <BrainCircuit className="size-6 text-accent" />
              <h2 className="display-font mt-3 text-3xl">Primero prepara la memoria recuperable.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Maestría Lab convertirá el texto extraído en fragmentos semánticos y generará embeddings. El Tutor no responde desde todo el PDF pegado en el prompt: recupera únicamente las partes relevantes para cada pregunta.</p>
              <button type="button" disabled={indexing} onClick={prepareRag} className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 bg-ink px-5 text-sm font-bold text-white hover:bg-accent disabled:opacity-50">{indexing ? <LoaderCircle className="size-4 animate-spin" /> : <DatabaseZap className="size-4" />} Preparar índice RAG</button>
            </section>
          ) : (
            <>
              <section className="border-b border-line pb-5">
                <p className="meta-font text-[9px] font-bold uppercase text-muted">Puntos de partida</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">{quickPrompts.map((prompt) => <button key={prompt} type="button" disabled={busy} onClick={() => void send(prompt)} className="focus-ring min-h-14 border border-line-strong bg-surface px-4 py-3 text-left text-xs font-bold leading-5 text-muted hover:border-accent hover:text-accent disabled:opacity-45">{prompt}</button>)}</div>
              </section>

              <section className="mt-5 space-y-4" aria-live="polite">
                {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Cargando conversación…</div> : messages.length ? messages.map((item) => (
                  <article key={item.id} className={item.role === "user" ? "ml-auto max-w-[86%] border-r-4 border-accent bg-accent-soft/45 p-4" : "paper-sheet max-w-[94%] border border-line p-5 sm:p-6"}>
                    <div className="flex items-center gap-2 meta-font text-[8px] font-bold uppercase text-muted">{item.role === "user" ? "Tú" : <><MessageSquareText className="size-3.5 text-moss" /> Tutor IA</>}{item.model && <span>· {item.model}</span>}</div>
                    <p className={`mt-3 whitespace-pre-line ${item.role === "user" ? "text-sm leading-6" : "text-[15px] leading-8 sm:text-base"}`}>{item.content}</p>
                    <CitationList message={item} />
                  </article>
                )) : <div className="paper-sheet border border-line p-6"><p className="meta-font text-[9px] font-bold uppercase text-accent">Nueva sesión</p><h2 className="display-font mt-2 text-3xl">¿Qué quieres entender mejor?</h2><p className="mt-3 text-sm leading-6 text-muted">Puedes preguntar por definiciones, fórmulas, relaciones, ejemplos, código o pedir que el tutor se enfoque en tus debilidades actuales.</p></div>}
              </section>

              <form onSubmit={submit} className="sticky bottom-[76px] z-20 mt-6 border border-line-strong bg-canvas/95 p-2 backdrop-blur-lg lg:bottom-3">
                <label htmlFor="tutor-question" className="sr-only">Pregunta al tutor</label>
                <div className="flex flex-col gap-2 sm:flex-row"><textarea id="tutor-question" value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} placeholder="Pregunta algo del documento…" className="focus-ring min-h-14 min-w-0 flex-1 resize-none bg-surface px-4 py-3 text-base leading-6 outline-none" /><button type="submit" disabled={busy || !question.trim()} className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 bg-ink px-5 text-sm font-bold text-white hover:bg-accent disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Preguntar</button></div>
              </form>
            </>
          )}
          {message && <p role="status" className="mt-3 border-l-4 border-warn bg-accent-soft/35 p-3 text-sm leading-6 text-ink">{message}</p>}
        </main>
      </div>
    </div>
  );
}
