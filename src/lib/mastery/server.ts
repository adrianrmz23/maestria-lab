import { practiceEvaluationJsonSchema } from "@/lib/experience/schema";
import type { PracticeEvaluation } from "@/lib/experience/types";
import { examJsonSchema } from "@/lib/mastery/schema";
import type {
  AdaptiveStudyPlan,
  ConceptMastery,
  ExamEvaluation,
  ExamMode,
  ExamPayload,
  ExamQuestion,
  ExamSessionRecord,
  MasteryStatus,
  ModuleMasterySummary,
  StudyDuration,
  StudyPlanStep,
  StudySessionRecord,
} from "@/lib/mastery/types";
import { requestStructuredOutput } from "@/lib/openai/responses";
import type { LearningConcept, LearningManifest, LearningTopic, SourceReference } from "@/lib/pedagogy/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ManifestRow = {
  document_id: string;
  manifest: LearningManifest;
  status: string;
};

type UnitRow = {
  unit_index: number;
  page_number: number | null;
  label: string | null;
  content: string;
};

type PracticeAttemptRow = {
  topic_id: string;
  concept_id: string;
  level: number;
  score: number;
  misconception: string | null;
  created_at: string;
};

type ExamAnswerRow = {
  topic_id: string;
  concept_id: string;
  difficulty: number;
  score: number;
  misconception: string | null;
  created_at: string;
};

type ExamAnswerSummaryRow = {
  question_id: string;
  is_correct: boolean;
  score: number;
  feedback: string;
  misconception: string | null;
};

type ScoreRow = { score: number };

type WeightedAttempt = {
  score: number;
  weight: number;
  misconception: string | null;
  createdAt: string;
  origin: "practice" | "exam";
};

const examCounts: Record<ExamMode, number> = {
  quick: 5,
  review: 10,
  full: 20,
  reinforcement: 5,
};

function uniqueRefs(refs: SourceReference[]) {
  return Array.from(new Map(refs.map((ref) => [`${ref.unitIndex}:${ref.pageNumber ?? "x"}`, ref])).values());
}

function masteryStatus(score: number, evidenceCount: number): MasteryStatus {
  if (!evidenceCount) return "Sin evidencia";
  if (score < 50) return "Inicial";
  if (score < 70) return "En desarrollo";
  if (score < 85) return "Sólido";
  return "Dominado";
}

function recencyWeight(iso: string) {
  const ageDays = Math.max(0, (Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (ageDays <= 7) return 1.15;
  if (ageDays <= 30) return 1.05;
  return 1;
}

function attemptWeight(difficulty: number, origin: "practice" | "exam", createdAt: string) {
  const levelWeight = difficulty === 3 ? 1.3 : difficulty === 2 ? 1.15 : 1;
  const originWeight = origin === "exam" ? 1.25 : 1;
  return levelWeight * originWeight * recencyWeight(createdAt);
}

function latestIso(values: Array<string | null | undefined>) {
  const valid = values.filter(Boolean) as string[];
  if (!valid.length) return null;
  return valid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function latestMisconception(attempts: WeightedAttempt[]) {
  return attempts
    .filter((attempt) => attempt.misconception?.trim())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.misconception ?? null;
}

async function loadManifest(moduleId: string) {
  const supabase = getSupabaseAdmin();
  const { data: moduleRow, error: moduleError } = await supabase.from("modules").select("id,title").eq("id", moduleId).maybeSingle();
  if (moduleError) throw moduleError;
  if (!moduleRow) throw new Error("El módulo no existe.");

  const { data: row, error } = await supabase.from("learning_manifests").select("document_id,manifest,status").eq("module_id", moduleId).maybeSingle();
  if (error) throw error;
  if (!row || row.status !== "ready" || !row.manifest) throw new Error("El módulo necesita un Learning Manifest listo.");
  return { supabase, moduleTitle: String(moduleRow.title), row: row as ManifestRow, manifest: row.manifest as LearningManifest };
}

async function loadDocumentUnits(documentId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("document_units").select("unit_index,page_number,label,content").eq("document_id", documentId).order("unit_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UnitRow[];
}

function validateSourceReferences(refs: SourceReference[], units: UnitRow[], allowedUnitIndexes?: Set<number>) {
  const unitMap = new Map(units.map((unit) => [unit.unit_index, unit]));
  for (const ref of refs) {
    const unit = unitMap.get(ref.unitIndex);
    if (!unit) throw new Error(`La IA devolvió una referencia inexistente: unidad ${ref.unitIndex}.`);
    if (allowedUnitIndexes && !allowedUnitIndexes.has(ref.unitIndex)) throw new Error(`La IA usó una unidad fuera del contexto autorizado: ${ref.unitIndex}.`);
    if (ref.pageNumber !== null && unit.page_number !== ref.pageNumber) throw new Error(`La referencia pág. ${ref.pageNumber} no coincide con la unidad ${ref.unitIndex}.`);
  }
}

function serializeUnits(units: UnitRow[]) {
  return units.map((unit) => {
    const location = unit.page_number ? `página ${unit.page_number}` : unit.label || `unidad ${unit.unit_index}`;
    const content = unit.content.length > 6500 ? `${unit.content.slice(0, 6500)}\n[fragmento truncado para evaluación]` : unit.content;
    return `[UNIDAD ${unit.unit_index} · ${location}]\n${content}`;
  }).join("\n\n---\n\n");
}

function conceptBrief(topic: LearningTopic, concept: LearningConcept) {
  return [
    `TEMA_ID: ${topic.id}`,
    `TEMA: ${topic.title}`,
    `CONCEPTO_ID: ${concept.id}`,
    `CONCEPTO: ${concept.title}`,
    `FUENTE: ${concept.sourceSummary}`,
    `IMPORTANCIA: ${concept.whyItMatters}`,
    `NIVEL MAESTRÍA: ${concept.masters}`,
    `APLICACIÓN IA: ${concept.applicationAI}`,
  ].join("\n");
}

export async function calculateAndPersistMastery(moduleId: string): Promise<ModuleMasterySummary> {
  const { supabase, moduleTitle, manifest } = await loadManifest(moduleId);
  const [{ data: practiceData, error: practiceError }, { data: examData, error: examError }] = await Promise.all([
    supabase.from("practice_attempts").select("topic_id,concept_id,level,score,misconception,created_at").eq("module_id", moduleId).order("created_at", { ascending: true }),
    supabase.from("exam_answers").select("topic_id,concept_id,difficulty,score,misconception,created_at").eq("module_id", moduleId).order("created_at", { ascending: true }),
  ]);
  if (practiceError) throw practiceError;
  if (examError) throw examError;

  const practice = (practiceData ?? []) as PracticeAttemptRow[];
  const exams = (examData ?? []) as ExamAnswerRow[];
  const concepts: ConceptMastery[] = [];

  for (const topic of manifest.topics) {
    for (const concept of topic.concepts) {
      // Ventana activa: el dominio debe poder reflejar mejora y no quedar anclado para siempre a errores muy antiguos.
      const conceptPractice = practice.filter((attempt) => attempt.topic_id === topic.id && attempt.concept_id === concept.id).slice(-12);
      const conceptExams = exams.filter((attempt) => attempt.topic_id === topic.id && attempt.concept_id === concept.id).slice(-8);
      const attempts: WeightedAttempt[] = [
        ...conceptPractice.map((attempt) => ({ score: Number(attempt.score), weight: attemptWeight(attempt.level, "practice", attempt.created_at), misconception: attempt.misconception, createdAt: attempt.created_at, origin: "practice" as const })),
        ...conceptExams.map((attempt) => ({ score: Number(attempt.score), weight: attemptWeight(attempt.difficulty, "exam", attempt.created_at), misconception: attempt.misconception, createdAt: attempt.created_at, origin: "exam" as const })),
      ];
      const totalWeight = attempts.reduce((sum, attempt) => sum + attempt.weight, 0);
      const weightedAccuracy = totalWeight ? attempts.reduce((sum, attempt) => sum + attempt.score * attempt.weight, 0) / totalWeight : 0;
      const confidence = Math.min(1, attempts.length / 6);
      const score = attempts.length ? Math.round(weightedAccuracy * (0.6 + 0.4 * confidence)) : 0;
      const lastActivityAt = latestIso(attempts.map((attempt) => attempt.createdAt));
      const status = masteryStatus(score, attempts.length);
      const weakestMisconception = latestMisconception(attempts);

      const item: ConceptMastery = {
        topicId: topic.id,
        topicTitle: topic.title,
        conceptId: concept.id,
        conceptTitle: concept.title,
        score,
        weightedAccuracy: Math.round(weightedAccuracy * 10) / 10,
        evidenceCount: attempts.length,
        practiceCount: conceptPractice.length,
        examCount: conceptExams.length,
        status,
        weakestMisconception,
        lastActivityAt,
      };
      concepts.push(item);

      const { error: upsertError } = await supabase.from("concept_mastery").upsert({
        module_id: moduleId,
        topic_id: topic.id,
        concept_id: concept.id,
        mastery_score: score,
        weighted_accuracy: Math.round(weightedAccuracy * 1000) / 1000,
        evidence_count: attempts.length,
        practice_count: conceptPractice.length,
        exam_count: conceptExams.length,
        mastery_status: status,
        weakest_misconception: weakestMisconception,
        last_activity_at: lastActivityAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "module_id,topic_id,concept_id" });
      if (upsertError) throw upsertError;
    }
  }

  const totalConcepts = concepts.length;
  const overallScore = totalConcepts ? Math.round(concepts.reduce((sum, concept) => sum + concept.score, 0) / totalConcepts) : 0;
  const evidenceCount = concepts.reduce((sum, concept) => sum + concept.evidenceCount, 0);
  const attemptedConcepts = concepts.filter((concept) => concept.evidenceCount > 0).length;
  const weakest = [...concepts].sort((a, b) => {
    const priorityA = a.evidenceCount ? a.score : 45;
    const priorityB = b.evidenceCount ? b.score : 45;
    return priorityA - priorityB || a.conceptTitle.localeCompare(b.conceptTitle, "es");
  }).slice(0, Math.min(5, concepts.length));
  const readiness = evidenceCount === 0 ? "Sin evidencia" : overallScore < 55 ? "Construyendo base" : overallScore < 75 ? "En progreso" : "Listo para examen";

  return {
    moduleId,
    moduleTitle,
    overallScore,
    readiness,
    evidenceCount,
    attemptedConcepts,
    totalConcepts,
    lastActivityAt: latestIso(concepts.map((concept) => concept.lastActivityAt)),
    concepts,
    weakest,
  };
}

function chooseExamConcepts(manifest: LearningManifest, mastery: ModuleMasterySummary, mode: ExamMode) {
  const all = manifest.topics.flatMap((topic) => topic.concepts.map((concept) => ({ topic, concept })));
  if (mode === "reinforcement") {
    const weakestKeys = new Set(mastery.weakest.slice(0, 3).map((item) => `${item.topicId}:${item.conceptId}`));
    const focused = all.filter(({ topic, concept }) => weakestKeys.has(`${topic.id}:${concept.id}`));
    return focused.length ? focused : all.slice(0, 3);
  }
  return all;
}

function normalizeExam(exam: ExamPayload, mode: ExamMode, count: number, manifest: LearningManifest, units: UnitRow[], allowedUnitIndexes: Set<number>, allowedConceptKeys?: Set<string>) {
  exam.schemaVersion = "1.0";
  exam.mode = mode;
  if (exam.questions.length !== count) throw new Error(`La evaluación debe contener exactamente ${count} preguntas; la IA devolvió ${exam.questions.length}.`);

  const validConcepts = new Map<string, { topic: LearningTopic; concept: LearningConcept }>();
  for (const topic of manifest.topics) for (const concept of topic.concepts) validConcepts.set(`${topic.id}:${concept.id}`, { topic, concept });
  const ids = new Set<string>();

  exam.questions = exam.questions.map((question, index) => {
    const key = `${question.topicId}:${question.conceptId}`;
    const context = validConcepts.get(key);
    if (!context) throw new Error(`La evaluación referencia un concepto inexistente: ${key}.`);
    if (allowedConceptKeys && !allowedConceptKeys.has(key)) throw new Error(`La evaluación usó un concepto fuera del foco autorizado: ${key}.`);
    let id = question.id.trim() || `pregunta-${index + 1}`;
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    question.id = id;
    question.topicTitle = context.topic.title;
    question.conceptTitle = context.concept.title;
    validateSourceReferences(question.sourceRefs, units, allowedUnitIndexes);

    if (question.type === "short_answer") {
      question.options = [];
      if (!question.correctAnswer.trim()) throw new Error(`La pregunta ${id} necesita una respuesta esperada.`);
    } else {
      if (question.type === "true_false") question.options = ["Verdadero", "Falso"];
      if (question.options.length < 2) throw new Error(`La pregunta ${id} necesita al menos dos opciones.`);
      const normalizedCorrect = question.correctAnswer.trim().toLocaleLowerCase("es-MX");
      if (!question.options.some((option) => option.trim().toLocaleLowerCase("es-MX") === normalizedCorrect)) throw new Error(`La respuesta correcta de ${id} no aparece entre sus opciones.`);
    }
    return question;
  });
  return exam;
}

export async function createExamSession(moduleId: string, mode: ExamMode): Promise<ExamSessionRecord> {
  const { supabase, manifest, row } = await loadManifest(moduleId);
  const mastery = await calculateAndPersistMastery(moduleId);
  const selected = chooseExamConcepts(manifest, mastery, mode);
  if (!selected.length) throw new Error("El Learning Manifest no contiene conceptos para evaluar.");

  const count = examCounts[mode];
  const units = await loadDocumentUnits(row.document_id);
  const referencedIndexes = new Set<number>();
  for (const { topic, concept } of selected) {
    for (const ref of uniqueRefs([...topic.sourceRefs, ...concept.sourceRefs])) referencedIndexes.add(ref.unitIndex);
  }
  const authorizedUnits = units.filter((unit) => referencedIndexes.has(unit.unit_index));
  if (!authorizedUnits.length) throw new Error("No se encontraron unidades de fuente para construir la evaluación.");

  const target = selected.map(({ topic, concept }) => conceptBrief(topic, concept)).join("\n\n--- CONCEPTO ---\n\n");
  const modeInstruction: Record<ExamMode, string> = {
    quick: "Examen rápido: muestrea conceptos distintos y prioriza comprensión sobre memorización.",
    review: "Repaso: distribuye las preguntas entre varios temas, mezclando reconocimiento, aplicación y razonamiento.",
    full: "Examen completo: cubre el módulo de forma amplia, con dificultad progresiva y varias preguntas de transferencia.",
    reinforcement: "Refuerzo: concentra las preguntas en los conceptos débiles indicados; diagnostica la confusión, no repitas preguntas triviales.",
  };

  const developer = [
    "Eres el motor de evaluación de Maestría Lab para una Maestría en Inteligencia Artificial y Ciencia de Datos.",
    `Debes producir exactamente ${count} preguntas.`,
    modeInstruction[mode],
    "Usa únicamente topicId y conceptId presentes en el contexto.",
    "Toda afirmación académica debe sostenerse en las unidades autorizadas y cada pregunta debe llevar sourceRefs reales.",
    "Combina multiple_choice, true_false, short_answer y code_prediction solo cuando tengan sentido. Evita que todo sea opción múltiple.",
    "Dificultad 1 comprueba fundamento; 2 exige razonamiento; 3 exige transferencia o aplicación.",
    "Para short_answer deja options vacío y agrega acceptedAnswers breves. Para true_false usa Verdadero/Falso.",
    "No incluyas la respuesta correcta en el enunciado ni des pistas obvias.",
    "La explicación de cada pregunta debe ser breve y útil para el feedback posterior.",
    mode === "reinforcement" ? `Los conceptos prioritarios por dominio son: ${mastery.weakest.slice(0, 3).map((item) => `${item.conceptTitle} (${item.score}%)`).join(", ")}.` : "Distribuye razonablemente la cobertura para no sobrepreguntar un solo concepto.",
  ].join("\n");

  const user = [
    `MÓDULO: ${manifest.moduleTitle}`,
    `MATERIA: ${manifest.subject}`,
    `MODO: ${mode}`,
    `CONCEPTOS AUTORIZADOS:\n${target}`,
    `FUENTE AUTORIZADA:\n${serializeUnits(authorizedUnits)}`,
  ].join("\n\n");

  const result = await requestStructuredOutput<ExamPayload>({
    name: "adaptive_exam",
    schema: examJsonSchema,
    developer,
    user,
    reasoning: mode === "full" ? "medium" : "low",
    verbosity: "medium",
  });
  const allowedConceptKeys = new Set(selected.map(({ topic, concept }) => `${topic.id}:${concept.id}`));
  const exam = normalizeExam(result.data, mode, count, manifest, units, referencedIndexes, allowedConceptKeys);
  const now = new Date().toISOString();
  const { data: session, error } = await supabase.from("exam_sessions").insert({
    module_id: moduleId,
    mode,
    status: "ready",
    question_count: count,
    exam,
    model: result.model,
    created_at: now,
    updated_at: now,
  }).select("*").single();
  if (error || !session) throw error ?? new Error("No se pudo guardar la evaluación.");

  return {
    id: String(session.id),
    moduleId,
    mode,
    status: "ready",
    questionCount: count,
    exam,
    model: result.model,
    createdAt: String(session.created_at),
    answers: [],
  };
}

export async function getExamSession(moduleId: string, sessionId: string): Promise<ExamSessionRecord> {
  const supabase = getSupabaseAdmin();
  const { data: session, error } = await supabase.from("exam_sessions").select("*").eq("id", sessionId).eq("module_id", moduleId).maybeSingle();
  if (error) throw error;
  if (!session) throw new Error("La evaluación no existe.");
  const { data: answers, error: answersError } = await supabase.from("exam_answers").select("question_id,is_correct,score,feedback,misconception").eq("session_id", sessionId).order("id", { ascending: true });
  if (answersError) throw answersError;
  return {
    id: String(session.id),
    moduleId,
    mode: session.mode as ExamMode,
    status: session.status as ExamSessionRecord["status"],
    questionCount: Number(session.question_count),
    exam: session.exam as ExamPayload,
    model: session.model ?? undefined,
    score: session.score ?? undefined,
    startedAt: session.started_at ?? undefined,
    completedAt: session.completed_at ?? undefined,
    createdAt: String(session.created_at),
    answers: ((answers ?? []) as ExamAnswerSummaryRow[]).map((answer) => ({
      questionId: String(answer.question_id),
      correct: Boolean(answer.is_correct),
      score: Number(answer.score),
      feedback: String(answer.feedback),
      misconception: answer.misconception ?? null,
    })),
  };
}

function deterministicExamEvaluation(question: ExamQuestion, answer: string): PracticeEvaluation | null {
  if (question.type === "short_answer") return null;
  const normalize = (value: string) => value.trim().toLocaleLowerCase("es-MX").replace(/\s+/g, " ");
  const correct = normalize(answer) === normalize(question.correctAnswer);
  return {
    correct,
    score: correct ? 100 : 0,
    feedback: correct ? `Correcto. ${question.explanation}` : `La respuesta correcta es “${question.correctAnswer}”. ${question.explanation}`,
    misconception: correct ? null : "Revisa la regla o relación conceptual que distingue tu elección de la respuesta correcta.",
    sourceRefs: question.sourceRefs,
  };
}

export async function evaluateExamAnswer(moduleId: string, sessionId: string, questionId: string, answer: string): Promise<ExamEvaluation> {
  if (!answer.trim()) throw new Error("Escribe o selecciona una respuesta antes de continuar.");
  const { supabase, manifest, row } = await loadManifest(moduleId);
  const session = await getExamSession(moduleId, sessionId);
  if (session.status === "completed") throw new Error("Esta evaluación ya está completada.");
  if (session.answers.some((item) => item.questionId === questionId)) throw new Error("Esta pregunta ya fue respondida.");
  const question = session.exam.questions.find((item) => item.id === questionId);
  if (!question) throw new Error("La pregunta no existe en esta evaluación.");
  const units = await loadDocumentUnits(row.document_id);

  let evaluation = deterministicExamEvaluation(question, answer);
  let model: string | null = null;
  if (!evaluation) {
    const topic = manifest.topics.find((item) => item.id === question.topicId);
    const concept = topic?.concepts.find((item) => item.id === question.conceptId);
    if (!topic || !concept) throw new Error("El concepto evaluado ya no existe en el Manifest.");
    const allowedIndexes = new Set(question.sourceRefs.map((ref) => ref.unitIndex));
    const sourceUnits = units.filter((unit) => allowedIndexes.has(unit.unit_index));
    const developer = [
      "Eres el evaluador de un examen de Maestría Lab.",
      "Evalúa la respuesta del estudiante con rigor académico, aceptando paráfrasis equivalentes.",
      "No exijas coincidencia literal, pero no apruebes si falta una condición esencial o existe una contradicción importante.",
      "Da feedback breve y accionable; misconception debe identificar la confusión concreta o ser null.",
      "sourceRefs solo puede usar referencias de la fuente suministrada.",
    ].join("\n");
    const user = [
      `TEMA: ${topic.title}`,
      `CONCEPTO: ${concept.title}`,
      `PREGUNTA: ${question.prompt}`,
      `RESPUESTA ESPERADA: ${question.correctAnswer}`,
      `ACEPTADAS: ${question.acceptedAnswers.join(" | ")}`,
      `RESPUESTA DEL ESTUDIANTE: ${answer}`,
      `EXPLICACIÓN BASE: ${question.explanation}`,
      `FUENTE:\n${serializeUnits(sourceUnits)}`,
    ].join("\n\n");
    const result = await requestStructuredOutput<PracticeEvaluation>({ name: "exam_evaluation", schema: practiceEvaluationJsonSchema, developer, user, reasoning: "low", verbosity: "low" });
    evaluation = result.data;
    model = result.model;
    validateSourceReferences(evaluation.sourceRefs, units, allowedIndexes);
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("exam_answers").insert({
    session_id: sessionId,
    module_id: moduleId,
    topic_id: question.topicId,
    concept_id: question.conceptId,
    question_id: question.id,
    difficulty: question.difficulty,
    question_type: question.type,
    answer,
    is_correct: evaluation.correct,
    score: evaluation.score,
    feedback: evaluation.feedback,
    misconception: evaluation.misconception,
    evaluator_model: model,
  });
  if (insertError) throw insertError;

  if (session.status === "ready") {
    const { error: startError } = await supabase.from("exam_sessions").update({ status: "in_progress", started_at: now, updated_at: now }).eq("id", sessionId);
    if (startError) throw startError;
  }

  const { data: allAnswers, error: allError } = await supabase.from("exam_answers").select("score").eq("session_id", sessionId);
  if (allError) throw allError;
  const scores = ((allAnswers ?? []) as ScoreRow[]).map((item) => Number(item.score));
  const sessionCompleted = scores.length >= session.questionCount;
  const sessionScore = sessionCompleted ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length) : null;
  if (sessionCompleted) {
    const { error: completeError } = await supabase.from("exam_sessions").update({ status: "completed", score: sessionScore, completed_at: now, updated_at: now }).eq("id", sessionId);
    if (completeError) throw completeError;
  }

  await calculateAndPersistMastery(moduleId);
  return { ...evaluation, sessionCompleted, sessionScore };
}

function planTemplate(duration: StudyDuration): Array<{ kind: StudyPlanStep["kind"]; minutes: number; title: string; instruction: string }> {
  if (duration === 5) return [
    { kind: "learn", minutes: 2, title: "Recupera la idea central", instruction: "Lee solo la capa fácil y formula la definición con tus propias palabras." },
    { kind: "practice", minutes: 3, title: "Comprueba de inmediato", instruction: "Resuelve una tanda corta del concepto prioritario sin consultar la respuesta." },
  ];
  if (duration === 10) return [
    { kind: "learn", minutes: 3, title: "Revisión focal", instruction: "Revisa la fuente y el error común asociado al concepto." },
    { kind: "practice", minutes: 4, title: "Práctica dirigida", instruction: "Resuelve ejercicios del nivel que todavía no tengas sólido." },
    { kind: "recall", minutes: 3, title: "Recall sin apoyo", instruction: "Cierra el material y explica el concepto, su regla y un ejemplo propio." },
  ];
  if (duration === 15) return [
    { kind: "learn", minutes: 4, title: "Ajusta el modelo mental", instruction: "Revisa los dos conceptos prioritarios y contrasta sus diferencias." },
    { kind: "lab", minutes: 4, title: "Experimenta", instruction: "Manipula el laboratorio del concepto con menor dominio y predice antes de comprobar." },
    { kind: "practice", minutes: 5, title: "Transfiere", instruction: "Resuelve preguntas semiguiadas o de transferencia." },
    { kind: "recall", minutes: 2, title: "Cierre activo", instruction: "Resume en tres frases qué cambió en tu comprensión." },
  ];
  if (duration === 30) return [
    { kind: "learn", minutes: 6, title: "Revisión selectiva", instruction: "Trabaja únicamente las ideas que el dominio marca como débiles o sin evidencia." },
    { kind: "lab", minutes: 8, title: "Laboratorio focal", instruction: "Experimenta con dos conceptos y explica cada resultado antes de cambiar controles." },
    { kind: "practice", minutes: 10, title: "Práctica de transferencia", instruction: "Prioriza nivel 2 y 3; evita releer mientras respondes." },
    { kind: "exam", minutes: 6, title: "Cierre diagnóstico", instruction: "Termina con un examen rápido para generar evidencia independiente." },
  ];
  return [
    { kind: "learn", minutes: 8, title: "Reconstruye fundamentos", instruction: "Revisa los conceptos prioritarios desde la fuente y señala qué no podías explicar antes." },
    { kind: "lab", minutes: 10, title: "Experimentación", instruction: "Usa los laboratorios de los conceptos débiles y prueba casos límite." },
    { kind: "practice", minutes: 15, title: "Práctica deliberada", instruction: "Combina niveles 2 y 3, poniendo atención a las confusiones detectadas." },
    { kind: "exam", minutes: 10, title: "Evaluación de refuerzo", instruction: "Haz una evaluación enfocada en debilidades sin consultar el material." },
    { kind: "recall", minutes: 2, title: "Cierre", instruction: "Anota mentalmente una regla, una aplicación y una confusión que ya puedas evitar." },
  ];
}

export async function createAdaptiveStudySession(moduleId: string, durationMinutes: StudyDuration): Promise<StudySessionRecord> {
  const { supabase } = await loadManifest(moduleId);
  const mastery = await calculateAndPersistMastery(moduleId);
  const focusCount: Record<StudyDuration, number> = { 5: 1, 10: 1, 15: 2, 30: 3, 45: 4 };
  const prioritized = [...mastery.concepts].sort((a, b) => {
    const priorityA = a.evidenceCount ? a.score : 45;
    const priorityB = b.evidenceCount ? b.score : 45;
    return priorityA - priorityB;
  }).slice(0, focusCount[durationMinutes]);
  if (!prioritized.length) throw new Error("El módulo no tiene conceptos para planificar una sesión.");

  const focusConcepts = prioritized.map((concept) => ({
    topicId: concept.topicId,
    topicTitle: concept.topicTitle,
    conceptId: concept.conceptId,
    conceptTitle: concept.conceptTitle,
    masteryScore: concept.score,
    status: concept.status,
    reason: concept.evidenceCount === 0 ? "Todavía no existe evidencia suficiente sobre este concepto." : concept.weakestMisconception ? `Confusión detectada: ${concept.weakestMisconception}` : `Es uno de los conceptos con menor dominio actual (${concept.score}%).`,
  }));

  const template = planTemplate(durationMinutes);
  const steps = template.map((step, index): StudyPlanStep => {
    const target = prioritized[index % prioritized.length];
    const useConcept = step.kind !== "recall" || index < prioritized.length;
    return {
      id: `paso-${index + 1}`,
      ...step,
      topicId: useConcept ? target.topicId : null,
      topicTitle: useConcept ? target.topicTitle : null,
      conceptId: useConcept ? target.conceptId : null,
      conceptTitle: useConcept ? target.conceptTitle : null,
    };
  });

  const plan: AdaptiveStudyPlan = {
    schemaVersion: "1.0",
    durationMinutes,
    rationale: mastery.evidenceCount === 0
      ? "Aún no hay suficiente evidencia de práctica; la sesión empieza por construir una línea base sin recorrer todo el módulo."
      : `La sesión prioriza ${focusConcepts.map((item) => item.conceptTitle).join(", ")} porque concentran la menor evidencia de dominio útil en este momento.`,
    focusConcepts,
    steps,
  };

  const now = new Date().toISOString();
  const { data, error } = await supabase.from("study_sessions").insert({ module_id: moduleId, duration_minutes: durationMinutes, status: "planned", plan, created_at: now, updated_at: now }).select("*").single();
  if (error || !data) throw error ?? new Error("No se pudo guardar la sesión adaptativa.");
  return { id: String(data.id), moduleId, durationMinutes, status: "planned", plan, createdAt: String(data.created_at) };
}

export async function getStudySession(moduleId: string, sessionId: string): Promise<StudySessionRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("study_sessions").select("*").eq("id", sessionId).eq("module_id", moduleId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La sesión de estudio no existe.");
  return {
    id: String(data.id),
    moduleId,
    durationMinutes: Number(data.duration_minutes) as StudyDuration,
    status: data.status as StudySessionRecord["status"],
    plan: data.plan as AdaptiveStudyPlan,
    startedAt: data.started_at ?? undefined,
    completedAt: data.completed_at ?? undefined,
    createdAt: String(data.created_at),
  };
}

export async function updateStudySession(moduleId: string, sessionId: string, status: "in_progress" | "completed") {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const patch = status === "in_progress"
    ? { status, started_at: now, updated_at: now }
    : { status, completed_at: now, updated_at: now };
  const { error } = await supabase.from("study_sessions").update(patch).eq("id", sessionId).eq("module_id", moduleId);
  if (error) throw error;
  return getStudySession(moduleId, sessionId);
}
