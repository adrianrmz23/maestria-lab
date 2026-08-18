"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, FileQuestion, GraduationCap, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Target, XCircle } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { answerExamQuestion, createExam, getModuleMastery } from "@/lib/mastery-api";
import type { ExamEvaluation, ExamMode, ExamSessionRecord, ModuleMasterySummary } from "@/lib/mastery/types";

const modes: Array<{ id: ExamMode; title: string; count: number; description: string; note: string }> = [
  { id: "quick", title: "Examen rápido", count: 5, description: "Una lectura corta del estado actual.", note: "Ideal al terminar una sesión." },
  { id: "review", title: "Repaso", count: 10, description: "Cobertura distribuida entre varios temas.", note: "Mezcla fundamento y aplicación." },
  { id: "full", title: "Simulación de examen", count: 20, description: "Evaluación amplia, sin pistas ni corrección visible entre preguntas.", note: "Feedback global al terminar · señal fuerte para dominio." },
  { id: "reinforcement", title: "Refuerzo", count: 5, description: "Preguntas concentradas en tus conceptos débiles.", note: "Se adapta a la evidencia actual." },
];

export function EvaluationView() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [session, setSession] = useState<ExamSessionRecord | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null);
  const [mastery, setMastery] = useState<ModuleMasterySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const question = session?.exam.questions[questionIndex];
  const answeredCount = session?.answers.length ?? 0;
  const progress = session ? Math.round(((answeredCount + (evaluation && !session.answers.some((item) => item.questionId === question?.id) ? 1 : 0)) / session.questionCount) * 100) : 0;
  const modeMeta = useMemo(() => modes.find((item) => item.id === session?.mode), [session?.mode]);

  async function start(mode: ExamMode) {
    if (!studyModule) return;
    setBusy(true); setMessage("Diseñando una evaluación anclada al módulo…"); setEvaluation(null); setMastery(null);
    try {
      const created = await createExam(studyModule.id, mode);
      setSession(created); setQuestionIndex(0); setAnswer(""); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear la evaluación."); }
    finally { setBusy(false); }
  }

  async function submitAnswer() {
    if (!studyModule || !session || !question || !answer.trim() || evaluation) return;
    setBusy(true); setMessage("");
    try {
      const result = await answerExamQuestion(studyModule.id, session.id, question.id, answer);
      setEvaluation(result);
      setSession((current) => current ? { ...current, answers: [...current.answers, { questionId: question.id, correct: result.correct, score: result.score, feedback: result.feedback, misconception: result.misconception }], status: result.sessionCompleted ? "completed" : "in_progress", score: result.sessionScore ?? current.score } : current);
      if (result.sessionCompleted) setMastery(await getModuleMastery(studyModule.id));
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo evaluar la respuesta."); }
    finally { setBusy(false); }
  }

  function next() {
    if (!session) return;
    const nextIndex = questionIndex + 1;
    if (nextIndex < session.exam.questions.length) {
      setQuestionIndex(nextIndex);
      setAnswer("");
      setEvaluation(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (session.status === "completed") {
      setAnswer("");
      setEvaluation(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!studyModule) return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <h1 className="display-font text-4xl">Módulo no encontrado.</h1> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;

  if (!session) return (
    <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b-2 border-ink pb-7"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" /> Ficha del módulo</Link><p className="meta-font mt-4 text-[9px] font-bold uppercase text-accent">Evaluación · Bloque 7</p><h1 className="display-font mt-2 text-4xl leading-none sm:text-5xl">Evalúa sin convertirlo en otro quiz escolar.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-muted">Cada evaluación se genera desde el Manifest y sus unidades de fuente. Las respuestas alimentan el dominio con más peso que una práctica ordinaria.</p></header>
      <section className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2">
        {modes.map((mode) => <button key={mode.id} type="button" disabled={busy} onClick={() => start(mode.id)} className="focus-ring bg-surface p-6 text-left hover:bg-canvas disabled:opacity-50"><div className="flex items-start justify-between gap-4"><div><p className="meta-font text-[8px] font-bold uppercase text-accent">{mode.count} preguntas</p><h2 className="display-font mt-2 text-3xl">{mode.title}</h2></div><FileQuestion className="size-5 text-muted" /></div><p className="mt-3 text-sm leading-6 text-muted">{mode.description}</p><p className="meta-font mt-5 text-[8px] uppercase text-muted">{mode.note}</p></button>)}
      </section>
      {busy && <div className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> {message}</div>}
      {!busy && message && <div className="mt-5 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6">{message}</div>}
      <section className="mt-8 grid gap-6 border-t border-line pt-6 md:grid-cols-3"><div className="border-l-2 border-moss pl-4"><ShieldCheck className="size-4 text-moss" /><p className="mt-2 text-sm font-bold">Fuente verificable</p><p className="mt-1 text-xs leading-5 text-muted">Las referencias deben existir en las unidades extraídas.</p></div><div className="border-l-2 border-accent pl-4"><Target className="size-4 text-accent" /><p className="mt-2 text-sm font-bold">Señal independiente</p><p className="mt-1 text-xs leading-5 text-muted">El examen pesa más que una respuesta guiada de práctica.</p></div><div className="border-l-2 border-ink pl-4"><Clock3 className="size-4" /><p className="mt-2 text-sm font-bold">Sin reloj agresivo</p><p className="mt-1 text-xs leading-5 text-muted">Medimos comprensión; no velocidad artificial.</p></div></section>
    </div>
  );

  if (session.status === "completed" && !evaluation) return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6 lg:px-10">
      <Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted"><ArrowLeft className="size-4" /> Ficha del módulo</Link>
      <section className="mt-5 border-y-2 border-ink py-8"><p className="meta-font text-[9px] font-bold uppercase text-moss">Evaluación completada · {modeMeta?.title}</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="display-font text-5xl sm:text-6xl">{session.score ?? "—"}<span className="text-2xl text-muted">/100</span></h1><p className="mt-3 text-base text-muted">{session.answers.filter((item) => item.correct).length}/{session.questionCount} respuestas conceptualmente correctas.</p></div><GraduationCap className="size-12 text-moss" /></div></section>
      {mastery && <section className="mt-7 grid gap-6 sm:grid-cols-2"><div className="paper-sheet border border-line p-5"><p className="meta-font text-[8px] uppercase text-muted">Dominio global actualizado</p><p className="display-font mt-2 text-4xl">{mastery.overallScore}%</p><p className="mt-2 text-sm text-muted">{mastery.readiness} · {mastery.evidenceCount} evidencias.</p></div><div className="border-l-4 border-accent bg-accent-soft/40 p-5"><p className="meta-font text-[8px] font-bold uppercase text-accent">Reforzar</p><p className="display-font mt-2 text-2xl">{mastery.weakest.slice(0, 2).map((item) => item.conceptTitle).join(" · ")}</p><Link href={`/modulos/${studyModule.slug}/refuerzo`} className="focus-ring mt-4 inline-flex min-h-11 items-center text-sm font-bold text-accent">Preparar sesión adaptativa →</Link></div></section>}
      <div className="mt-8 flex flex-wrap gap-2"><button type="button" onClick={() => { setSession(null); setEvaluation(null); setAnswer(""); setMastery(null); }} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white"><RefreshCw className="size-3.5" /> Nueva evaluación</button><Link href="/progreso" className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-4 text-xs font-bold text-muted">Ver dominio</Link></div>
    </div>
  );

  if (!question) return null;

  return (
    <div className="mx-auto max-w-[920px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-line pb-5"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted"><ArrowLeft className="size-4" /> Salir de evaluación</Link><span className="meta-font text-[8px] uppercase text-muted">{modeMeta?.title} · {session.questionCount} preguntas</span></div><div className="mt-4 h-[5px] bg-surface-strong"><div className="h-full bg-accent" style={{ width: `${Math.max(progress, Math.round((questionIndex / session.questionCount) * 100))}%` }} /></div></header>
      <main className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="meta-font text-[9px] font-bold uppercase text-accent">Pregunta {questionIndex + 1}/{session.questionCount} · dificultad {question.difficulty}/3</p><p className="meta-font text-[8px] uppercase text-muted">{question.topicTitle} / {question.conceptTitle}</p></div>
        <h1 className="display-font mt-4 text-3xl leading-tight sm:text-4xl">{question.prompt}</h1>
        <div className="mt-7">
          {question.type === "short_answer" ? <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={Boolean(evaluation) || busy} rows={5} placeholder="Explica con tus propias palabras…" className="focus-ring w-full border border-line-strong bg-surface p-4 text-base leading-7 outline-none focus:border-accent disabled:opacity-70" /> : <div className="grid gap-2">{question.options.map((option) => <button key={option} type="button" disabled={Boolean(evaluation) || busy} onClick={() => setAnswer(option)} className={`focus-ring min-h-12 border px-4 py-3 text-left text-sm font-medium ${answer === option ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-accent"}`}>{option}</button>)}</div>}
        </div>
        {!evaluation && <button type="button" disabled={busy || !answer.trim()} onClick={submitAnswer} className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-45">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Comprobar respuesta</button>}
        {message && <div className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6">{message}</div>}
        {evaluation && (session.mode === "full" ? <section className="mt-7 border-l-4 border-accent bg-accent-soft/35 p-5"><div className="flex items-center gap-2 text-accent"><ShieldCheck className="size-5" /><p className="font-bold">Respuesta registrada</p></div><p className="mt-3 text-sm leading-7 text-muted">Modo simulación: no mostramos si acertaste ni la explicación hasta terminar. Continúa sin consultar el material.</p><button type="button" onClick={next} className="focus-ring mt-5 inline-flex min-h-11 items-center bg-ink px-4 text-xs font-bold text-white">{questionIndex + 1 === session.questionCount ? "Ver resultado final" : "Siguiente pregunta"}</button></section> : <section className={`mt-7 border-l-4 p-5 ${evaluation.correct ? "border-moss bg-moss-soft/55" : "border-warn bg-accent-soft/40"}`}><div className="flex items-center gap-2">{evaluation.correct ? <CheckCircle2 className="size-5 text-moss" /> : <XCircle className="size-5 text-warn" />}<p className="font-bold">{evaluation.correct ? "Respuesta sólida" : "Necesita ajuste"} · {evaluation.score}/100</p></div><p className="mt-3 text-sm leading-7">{evaluation.feedback}</p>{evaluation.misconception && <p className="mt-3 text-xs leading-5 text-muted"><strong>Confusión detectada:</strong> {evaluation.misconception}</p>}<button type="button" onClick={next} className="focus-ring mt-5 inline-flex min-h-11 items-center bg-ink px-4 text-xs font-bold text-white">{questionIndex + 1 === session.questionCount ? "Cerrar evaluación" : "Siguiente pregunta"}</button></section>)}
      </main>
    </div>
  );
}
