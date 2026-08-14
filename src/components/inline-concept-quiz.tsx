"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, ListChecks, LoaderCircle, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { evaluateExercise, generateConceptExperience, getConceptExperience } from "@/lib/experience-api";
import type { ConceptExperience, PracticeEvaluation, PracticeExercise } from "@/lib/experience/types";

function chooseQuizExercises(experience: ConceptExperience) {
  const byLevel = (level: number) => experience.exercises.filter((exercise) => exercise.level === level);
  const selected: PracticeExercise[] = [];

  // Primero transferencia y razonamiento semiguiado; nivel 1 solo completa la tanda.
  for (const exercise of [...byLevel(3), ...byLevel(2), ...byLevel(1)]) {
    if (selected.length >= 6) break;
    if (!selected.some((item) => item.id === exercise.id)) selected.push(exercise);
  }
  return selected;
}

function QuizQuestion({
  moduleId,
  topicId,
  conceptId,
  exercise,
  index,
  evaluation,
  onEvaluation,
}: {
  moduleId: string;
  topicId: string;
  conceptId: string;
  exercise: PracticeExercise;
  index: number;
  evaluation?: PracticeEvaluation;
  onEvaluation: (value: PracticeEvaluation) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const choiceExercise = exercise.type !== "short_answer";

  async function verify() {
    if (!answer.trim()) {
      setMessage("Selecciona o escribe una respuesta antes de comprobar.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      onEvaluation(await evaluateExercise(moduleId, topicId, conceptId, exercise.id, answer, exercise.type));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo evaluar la respuesta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border-t border-line py-6 first:border-t-0">
      <div className="grid gap-4 sm:grid-cols-[44px_minmax(0,1fr)]">
        <div className="display-font text-2xl text-line-strong">{String(index + 1).padStart(2, "0")}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-font border border-line px-2 py-1 text-[8px] uppercase text-muted">
              {exercise.level === 3 ? "Transferencia" : exercise.level === 2 ? "Razonamiento" : "Fundamento"}
            </span>
            <span className="meta-font text-[8px] uppercase text-accent">{exercise.type.replaceAll("_", " ")}</span>
          </div>

          <p className="mt-3 text-[17px] font-bold leading-8 text-ink md:text-[18px]">{exercise.prompt}</p>

          {choiceExercise ? (
            <div className="mt-4 grid gap-2">
              {exercise.options.map((option, optionIndex) => (
                <button
                  key={`${option}-${optionIndex}`}
                  type="button"
                  disabled={Boolean(evaluation)}
                  onClick={() => { setAnswer(option); setMessage(""); }}
                  className={`focus-ring min-h-12 border px-4 py-3 text-left text-[16px] leading-6 transition-colors md:text-[17px] ${answer === option ? "border-ink bg-surface-strong font-bold" : "border-line-strong bg-surface hover:border-accent"} disabled:cursor-default`}
                >
                  <span className="meta-font mr-2 text-[9px] text-muted">{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <label className="sr-only" htmlFor={`inline-quiz-${exercise.id}`}>Respuesta</label>
              <textarea
                id={`inline-quiz-${exercise.id}`}
                value={answer}
                disabled={Boolean(evaluation)}
                onChange={(event) => setAnswer(event.target.value)}
                rows={4}
                placeholder="Razona tu respuesta con tus propias palabras…"
                className="focus-ring w-full border border-line-strong bg-surface px-4 py-3 text-[17px] leading-8 outline-none focus:border-accent disabled:opacity-70 md:text-[18px]"
              />
            </div>
          )}

          {!evaluation && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={verify}
                disabled={busy || !answer.trim()}
                className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-bold text-white hover:bg-accent disabled:opacity-40"
              >
                {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ListChecks className="size-3.5" aria-hidden="true" />}
                {exercise.type === "short_answer" ? "Evaluar razonamiento" : "Comprobar"}
              </button>
              <button
                type="button"
                onClick={() => setHintOpen((value) => !value)}
                className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-warn"
              >
                <CircleHelp className="size-3.5" aria-hidden="true" />
                {hintOpen ? "Ocultar pista" : "Necesito una pista"}
              </button>
            </div>
          )}

          {hintOpen && !evaluation && <p className="mt-2 border-l-2 border-warn pl-3 text-[15px] leading-7 text-muted md:text-base">{exercise.hint}</p>}
          {message && <p role="status" className="mt-3 text-sm text-warn">{message}</p>}

          {evaluation && (
            <div className={`mt-5 border-l-4 p-4 sm:p-5 ${evaluation.correct ? "border-moss bg-moss-soft/45" : "border-warn bg-accent-soft/35"}`}>
              <div className="flex items-center gap-2">
                {evaluation.correct ? <CheckCircle2 className="size-4 text-moss" aria-hidden="true" /> : <XCircle className="size-4 text-warn" aria-hidden="true" />}
                <p className="text-sm font-bold">{evaluation.correct ? "Respuesta sólida" : "Hay algo que revisar"} · {evaluation.score}/100</p>
              </div>
              <p className="mt-2 text-[16px] leading-7 text-ink md:text-[17px]">{evaluation.feedback}</p>
              {evaluation.misconception && <p className="mt-3 text-sm leading-6 text-muted"><strong>Posible confusión:</strong> {evaluation.misconception}</p>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function InlineConceptQuiz({
  moduleId,
  topicId,
  conceptId,
  onContinue,
}: {
  moduleId: string;
  topicId: string;
  conceptId: string;
  onContinue: () => void;
}) {
  const [experience, setExperience] = useState<ConceptExperience | null>(null);
  const [status, setStatus] = useState("Buscando cuestionario…");
  const [busy, setBusy] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, PracticeEvaluation>>({});

  useEffect(() => {
    let cancelled = false;
    setExperience(null);
    setEvaluations({});
    setStatus("Buscando cuestionario…");
    getConceptExperience(moduleId, topicId, conceptId)
      .then((record) => {
        if (cancelled) return;
        if (record.status === "ready" && record.experience) {
          setExperience(record.experience);
          setStatus("");
        } else {
          setStatus(record.status === "error" ? record.generationError || "El cuestionario requiere atención." : "Todavía no hay un cuestionario preparado para este concepto.");
        }
      })
      .catch((error) => { if (!cancelled) setStatus(error instanceof Error ? error.message : "No se pudo cargar el cuestionario."); });
    return () => { cancelled = true; };
  }, [moduleId, topicId, conceptId]);

  const exercises = useMemo(() => experience ? chooseQuizExercises(experience) : [], [experience]);
  const completed = exercises.filter((exercise) => evaluations[exercise.id]).length;
  const correct = exercises.filter((exercise) => evaluations[exercise.id]?.correct).length;

  async function generate() {
    setBusy(true);
    setStatus("Preparando 6 retos a partir del concepto y su fuente…");
    try {
      await generateConceptExperience(moduleId, topicId, conceptId);
      const record = await getConceptExperience(moduleId, topicId, conceptId);
      setExperience(record.experience ?? null);
      setEvaluations({});
      setStatus(record.experience ? "" : "No se recibió el cuestionario.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo generar el cuestionario.");
    } finally {
      setBusy(false);
    }
  }

  if (!experience) {
    return (
      <section className="paper-sheet border border-line p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <ListChecks className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="meta-font text-[9px] font-bold uppercase text-accent">Cuestionario del concepto</p>
            <h3 className="display-font mt-2 text-3xl">Antes de profundizar, comprueba si realmente lo entendiste.</h3>
            <p className="mt-3 max-w-2xl text-[16px] leading-7 text-muted md:text-[17px]">Se generan al menos 6 preguntas con teoría aplicada, razonamiento y pequeños casos. No están pensadas para resolverse por memoria literal.</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{status}</p>
        <button type="button" onClick={generate} disabled={busy} className="focus-ring mt-5 inline-flex min-h-12 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
          Preparar cuestionario
        </button>
      </section>
    );
  }

  if (exercises.length < 6) {
    return (
      <section className="paper-sheet border border-line p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <ListChecks className="mt-1 size-5 shrink-0 text-warn" aria-hidden="true" />
          <div>
            <p className="meta-font text-[9px] font-bold uppercase text-warn">Cuestionario incompleto</p>
            <h3 className="display-font mt-2 text-3xl">Necesitamos al menos 6 preguntas para que valga la pena.</h3>
            <p className="mt-3 max-w-2xl text-[16px] leading-7 text-muted md:text-[17px]">La experiencia guardada solo contiene {exercises.length}. Regénérala una vez para crear una tanda exigente con teoría aplicada, razonamiento y transferencia.</p>
          </div>
        </div>
        <button type="button" onClick={generate} disabled={busy} className="focus-ring mt-5 inline-flex min-h-12 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          Completar cuestionario
        </button>
      </section>
    );
  }

  return (
    <section className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="meta-font text-[9px] font-bold uppercase text-accent">Comprueba lo aprendido</p>
          <h3 className="display-font mt-1 text-3xl sm:text-4xl">6 preguntas antes de profundizar.</h3>
          <p className="mt-2 max-w-2xl text-[16px] leading-7 text-muted md:text-[17px]">Prioriza transferencia y razonamiento. Las pistas están cerradas por defecto y cada respuesta también alimenta tu índice de dominio.</p>
        </div>
        <div className="text-right">
          <p className="meta-font text-[8px] uppercase text-muted">Progreso</p>
          <p className="mt-1 text-sm font-bold">{completed}/{exercises.length} respondidas · {correct} sólidas</p>
        </div>
      </div>

      <div>
        {exercises.map((exercise, index) => (
          <QuizQuestion
            key={exercise.id}
            moduleId={moduleId}
            topicId={topicId}
            conceptId={conceptId}
            exercise={exercise}
            index={index}
            evaluation={evaluations[exercise.id]}
            onEvaluation={(value) => setEvaluations((current) => ({ ...current, [exercise.id]: value }))}
          />
        ))}
      </div>

      {completed === exercises.length && exercises.length >= 6 && (
        <div className="border-t-2 border-moss py-6">
          <p className="meta-font text-[9px] font-bold uppercase text-moss">Tanda completada</p>
          <h4 className="display-font mt-2 text-3xl">{correct >= Math.ceil(exercises.length * 0.75) ? "Ya tienes base para profundizar." : "Conviene revisar los errores antes de bajar otra capa."}</h4>
          <p className="mt-2 max-w-2xl text-[16px] leading-7 text-muted md:text-[17px]">Resultado: {correct}/{exercises.length}. No necesitas acertar todo, pero sí poder explicar por qué te equivocaste.</p>
          <button type="button" onClick={onContinue} className="focus-ring mt-4 inline-flex min-h-11 items-center bg-ink px-4 text-sm font-bold text-white hover:bg-accent">Continuar a Mesa de estudio</button>
        </div>
      )}

      <div className="flex justify-end border-t border-line pt-4">
        <button type="button" onClick={generate} disabled={busy} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent disabled:opacity-50">
          <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> Regenerar tanda
        </button>
      </div>
    </section>
  );
}
