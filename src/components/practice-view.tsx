"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleHelp, ListChecks, LoaderCircle, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { evaluateExercise, generateConceptExperience, getConceptExperience } from "@/lib/experience-api";
import type { ConceptExperience, PracticeEvaluation, PracticeExercise, PracticeLevel } from "@/lib/experience/types";
import { getLearningManifest } from "@/lib/learning-api";
import type { LearningManifest, LearningTopic, SourceReference } from "@/lib/pedagogy/types";

const levelMeta: Record<PracticeLevel, { title: string; label: string; description: string }> = {
  1: { title: "Guiado", label: "Nivel 1", description: "Pistas visibles y comprobación inmediata para fijar el mecanismo." },
  2: { title: "Semiguiado", label: "Nivel 2", description: "Menos apoyo: primero razona y abre la pista solo si la necesitas." },
  3: { title: "Transferencia", label: "Nivel 3", description: "Sin pistas. Aplica el concepto en una situación nueva o más técnica." },
};

function refLabel(ref: SourceReference) { return ref.pageNumber ? `pág. ${ref.pageNumber}` : ref.label || `unidad ${ref.unitIndex}`; }

function ExerciseCard({ moduleId, topicId, conceptId, exercise, evaluation, onEvaluation }: { moduleId: string; topicId: string; conceptId: string; exercise: PracticeExercise; evaluation?: PracticeEvaluation; onEvaluation: (value: PracticeEvaluation) => void }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hintOpen, setHintOpen] = useState(exercise.level === 1);

  async function verify() {
    if (!answer.trim()) { setMessage("Selecciona o escribe una respuesta antes de comprobar."); return; }
    setBusy(true); setMessage("");
    try { onEvaluation(await evaluateExercise(moduleId, topicId, conceptId, exercise.id, answer, exercise.type)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo evaluar la respuesta."); }
    finally { setBusy(false); }
  }

  const choiceExercise = exercise.type !== "short_answer";
  return <article className="border-t border-line py-6 first:border-t-0">
    <div className="grid gap-4 md:grid-cols-[42px_minmax(0,1fr)]">
      <div className="display-font text-2xl text-line-strong">{exercise.id.replace(/\D+/g, "").slice(-2) || "•"}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className="meta-font border border-line px-2 py-1 text-[8px] uppercase text-muted">{exercise.type.replaceAll("_", " ")}</span>{exercise.sourceRefs.slice(0, 2).map((ref) => <span key={`${ref.unitIndex}-${ref.pageNumber ?? "x"}`} className="meta-font text-[8px] uppercase text-moss">Fuente · {refLabel(ref)}</span>)}</div>
        <p className="mt-3 text-base font-bold leading-7 text-ink">{exercise.prompt}</p>

        {choiceExercise ? <div className="mt-4 grid gap-2">{exercise.options.map((option, index) => <button key={`${option}-${index}`} type="button" disabled={Boolean(evaluation)} onClick={() => { setAnswer(option); setMessage(""); }} className={`focus-ring min-h-12 border px-4 text-left text-sm transition-colors ${answer === option ? "border-ink bg-surface-strong font-bold" : "border-line-strong bg-surface hover:border-accent"} disabled:cursor-default`}><span className="meta-font mr-2 text-[9px] text-muted">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div> : <div className="mt-4"><label className="sr-only" htmlFor={`answer-${exercise.id}`}>Respuesta</label><textarea id={`answer-${exercise.id}`} value={answer} disabled={Boolean(evaluation)} onChange={(event) => setAnswer(event.target.value)} rows={4} placeholder="Explica tu respuesta con tus propias palabras…" className="focus-ring w-full border border-line-strong bg-surface px-4 py-3 text-base leading-7 outline-none focus:border-accent disabled:opacity-70" /></div>}

        {exercise.level < 3 && <div className="mt-4"><button type="button" onClick={() => setHintOpen((value) => !value)} className="focus-ring inline-flex min-h-11 items-center gap-2 text-xs font-bold text-warn"><CircleHelp className="size-3.5" /> {hintOpen ? "Ocultar pista" : "Necesito una pista"}</button>{hintOpen && <p className="mt-1 border-l-2 border-warn pl-3 text-sm leading-6 text-muted">{exercise.hint}</p>}</div>}

        {!evaluation && <button type="button" onClick={verify} disabled={busy || !answer.trim()} className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent disabled:opacity-40">{busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <ListChecks className="size-3.5" />} {exercise.type === "short_answer" ? "Evaluar con IA" : "Comprobar respuesta"}</button>}
        {message && <p role="status" className="mt-3 text-sm text-warn">{message}</p>}

        {evaluation && <div className={`mt-5 border-l-4 p-4 ${evaluation.correct ? "border-moss bg-moss-soft/45" : "border-warn bg-accent-soft/35"}`}><div className="flex items-center gap-2">{evaluation.correct ? <CheckCircle2 className="size-4 text-moss" /> : <XCircle className="size-4 text-warn" />}<p className="text-sm font-bold">{evaluation.correct ? "Respuesta sólida" : "Hay algo que revisar"} · {evaluation.score}/100</p></div><p className="mt-2 text-sm leading-6 text-ink">{evaluation.feedback}</p>{evaluation.misconception && <p className="mt-3 text-xs leading-5 text-muted"><strong>Posible confusión:</strong> {evaluation.misconception}</p>}</div>}
      </div>
    </div>
  </article>;
}

export function PracticeView() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [manifest, setManifest] = useState<LearningManifest | null>(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [conceptIndex, setConceptIndex] = useState(0);
  const [queryApplied, setQueryApplied] = useState(false);
  const [level, setLevel] = useState<PracticeLevel>(1);
  const [experience, setExperience] = useState<ConceptExperience | null>(null);
  const [status, setStatus] = useState("Cargando…");
  const [busy, setBusy] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, PracticeEvaluation>>({});

  useEffect(() => { if (!studyModule) return; getLearningManifest(studyModule.id).then((record) => { if (record.status === "ready" && record.manifest) { setManifest(record.manifest); setStatus(""); } else setStatus("Primero genera el Learning Manifest del módulo."); }).catch((error) => setStatus(error instanceof Error ? error.message : "No se pudo cargar Practica.")); }, [studyModule]);
  useEffect(() => {
    if (!manifest || queryApplied || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const requestedTopicId = query.get("topicId");
    const requestedConceptId = query.get("conceptId");
    if (requestedTopicId) {
      const nextTopicIndex = manifest.topics.findIndex((item) => item.id === requestedTopicId);
      if (nextTopicIndex >= 0) {
        const nextConceptIndex = requestedConceptId ? manifest.topics[nextTopicIndex].concepts.findIndex((item) => item.id === requestedConceptId) : 0;
        setTopicIndex(nextTopicIndex);
        setConceptIndex(nextConceptIndex >= 0 ? nextConceptIndex : 0);
      }
    }
    setQueryApplied(true);
  }, [manifest, queryApplied]);

  const topic: LearningTopic | undefined = manifest?.topics[topicIndex];
  const concept = topic?.concepts[conceptIndex];

  useEffect(() => {
    if (!studyModule || !topic || !concept) return;
    setExperience(null); setEvaluations({}); setLevel(1); setStatus("Buscando ejercicios…");
    getConceptExperience(studyModule.id, topic.id, concept.id).then((record) => { if (record.status === "ready" && record.experience) { setExperience(record.experience); setStatus(""); } else setStatus(record.status === "error" ? record.generationError || "La experiencia requiere atención." : "Este concepto todavía no tiene práctica preparada."); }).catch((error) => setStatus(error instanceof Error ? error.message : "No se pudo cargar la práctica."));
  }, [studyModule, topic, concept]);

  const exercises = useMemo(() => experience?.exercises.filter((exercise) => exercise.level === level) ?? [], [experience, level]);
  const completed = exercises.filter((exercise) => evaluations[exercise.id]).length;
  const correct = exercises.filter((exercise) => evaluations[exercise.id]?.correct).length;

  async function generate() { if (!studyModule || !topic || !concept) return; setBusy(true); setStatus("Generando laboratorio y práctica progresiva…"); try { await generateConceptExperience(studyModule.id, topic.id, concept.id); const record = await getConceptExperience(studyModule.id, topic.id, concept.id); setExperience(record.experience ?? null); setEvaluations({}); setStatus(record.experience ? "" : "No se recibió la experiencia."); } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo generar la práctica."); } finally { setBusy(false); } }

  if (!studyModule) return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <h1 className="display-font text-4xl">Módulo no encontrado.</h1> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;
  if (!manifest || !topic || !concept) return <div className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 lg:px-10"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted"><ArrowLeft className="size-4" /> Volver al módulo</Link><div className="paper-sheet mt-6 border border-line p-6"><h1 className="display-font text-4xl">Práctica todavía no disponible.</h1><p className="mt-3 text-base leading-7 text-muted">{status}</p></div></div>;

  return <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
    <header className="border-b-2 border-ink pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" /> Ficha del módulo</Link><div className="flex gap-2"><Link href={`/modulos/${studyModule.slug}/aprende`} className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-3 text-xs font-bold text-muted">Aprende</Link><Link href={`/modulos/${studyModule.slug}/laboratorio`} className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-3 text-xs font-bold text-muted">Laboratorio</Link></div></div><p className="meta-font mt-4 text-[9px] font-bold uppercase text-accent">Practica · evidencia para dominio</p><h1 className="display-font mt-2 text-4xl leading-none sm:text-5xl">Comprueba lo que realmente sabes.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-muted">Los ejercicios se construyen desde el concepto y su fuente. Cada respuesta alimenta ahora el índice de dominio. La dificultad, la cantidad de evidencia y los exámenes evitan interpretar un acierto aislado como dominio real.</p></header>

    <div className="grid gap-3 border-b border-line py-4 md:grid-cols-2"><label className="text-xs font-bold text-muted">Tema<select value={topicIndex} onChange={(event) => { setTopicIndex(Number(event.target.value)); setConceptIndex(0); }} className="focus-ring mt-2 min-h-12 w-full border border-line-strong bg-surface px-3 text-base font-medium text-ink">{manifest.topics.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} · {item.title}</option>)}</select></label><label className="text-xs font-bold text-muted">Concepto<select value={conceptIndex} onChange={(event) => setConceptIndex(Number(event.target.value))} className="focus-ring mt-2 min-h-12 w-full border border-line-strong bg-surface px-3 text-base font-medium text-ink">{topic.concepts.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} · {item.title}</option>)}</select></label></div>

    {!experience ? <div className="paper-sheet mt-7 border border-line p-6 sm:p-8"><div className="flex gap-3"><ListChecks className="mt-1 size-5 text-accent" /><div><h2 className="display-font text-3xl">Todavía no hay ejercicios para este concepto.</h2><p className="mt-2 text-sm leading-6 text-muted">{status}</p></div></div><button type="button" onClick={generate} disabled={busy} className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generar laboratorio + práctica</button></div> : <>
      <section className="mt-7 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><aside><p className="meta-font text-[9px] font-bold uppercase text-muted">Progresión</p><div className="mt-3 border-y border-line">{([1,2,3] as PracticeLevel[]).map((value) => <button key={value} type="button" onClick={() => setLevel(value)} className={`focus-ring w-full border-t border-line px-3 py-4 text-left first:border-t-0 ${level === value ? "bg-accent-soft/45" : "hover:bg-surface"}`}><span className={`meta-font text-[8px] font-bold uppercase ${level === value ? "text-accent" : "text-muted"}`}>{levelMeta[value].label}</span><span className="display-font mt-1 block text-xl">{levelMeta[value].title}</span><span className="mt-1 block text-xs leading-5 text-muted">{levelMeta[value].description}</span></button>)}</div><div className="mt-5 border-l-2 border-moss pl-4"><p className="meta-font text-[9px] font-bold uppercase text-moss">Registro</p><p className="mt-2 text-xs leading-5 text-muted">Cada comprobación se guarda y actualiza el dominio. Los niveles 2 y 3 pesan más porque exigen más razonamiento y transferencia.</p></div></aside>

        <main className="min-w-0"><div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4"><div><p className="meta-font text-[9px] font-bold uppercase text-accent">{levelMeta[level].label} · {topic.title}</p><h2 className="display-font mt-1 text-3xl sm:text-4xl">{concept.title}</h2></div><div className="text-right"><p className="meta-font text-[8px] uppercase text-muted">Sesión actual</p><p className="mt-1 text-sm font-bold">{completed}/{exercises.length} respondidos · {correct} correctos</p></div></div><div>{exercises.map((exercise) => <ExerciseCard key={`${exercise.id}-${level}`} moduleId={studyModule.id} topicId={topic.id} conceptId={concept.id} exercise={exercise} evaluation={evaluations[exercise.id]} onEvaluation={(value) => setEvaluations((current) => ({ ...current, [exercise.id]: value }))} />)}</div>{completed === exercises.length && exercises.length > 0 && <div className="border-t-2 border-moss py-6"><p className="meta-font text-[9px] font-bold uppercase text-moss">Nivel completado</p><h3 className="display-font mt-2 text-3xl">{correct === exercises.length ? "Dominaste esta tanda." : "Ya tenemos señales para reforzar."}</h3><p className="mt-2 text-sm leading-6 text-muted">Resultado de esta tanda: {correct}/{exercises.length}. El índice de dominio se actualiza con esta evidencia y puede cambiar la prioridad de tu próxima sesión adaptativa.</p>{level < 3 && <button type="button" onClick={() => { setLevel((level + 1) as PracticeLevel); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="focus-ring mt-4 inline-flex min-h-11 items-center bg-ink px-4 text-xs font-bold text-white">Continuar al nivel {level + 1}</button>}</div>}</main>
      </section>
      <div className="mt-7 flex flex-wrap justify-end border-t border-line pt-4"><button type="button" disabled={busy} onClick={generate} className="focus-ring inline-flex min-h-11 items-center gap-2 text-xs font-bold text-muted hover:text-accent disabled:opacity-50"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> Regenerar ejercicios</button></div>
    </>}
  </div>;
}
