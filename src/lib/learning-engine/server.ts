import { requestStructuredOutput } from "@/lib/openai/responses";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateAndPersistMastery } from "@/lib/mastery/server";
import type { LearningConcept, LearningManifest, LearningTopic } from "@/lib/pedagogy/types";
import { capstoneEvaluationSchema, capstoneProjectSchema, recallEvaluationSchema } from "@/lib/learning-engine/schema";
import type {
  CapstoneEvaluation,
  CapstoneProjectPayload,
  CapstoneProjectRecord,
  ConceptLearningState,
  KnowledgeMap,
  LearningDashboard,
  RecallEvaluation,
  StudyNote,
} from "@/lib/learning-engine/types";

type ManifestRow = { manifest: LearningManifest; status: string };
type ReviewRow = {
  topic_id: string;
  concept_id: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  retention_score: number;
  last_score: number | null;
  last_review_at: string | null;
  due_at: string;
};
type ProgressRow = {
  topic_id: string;
  concept_id: string;
  viewed_at: string | null;
  recall_score: number | null;
  lab_completed: boolean;
  practice_completed: boolean;
  practice_best_score: number | null;
  completion_score: number;
};

type RecallModelResult = {
  score: number;
  feedback: string;
  missingIdeas: string[];
  misconception: string | null;
};

function key(topicId: string, conceptId: string) {
  return `${topicId}::${conceptId}`;
}

async function loadManifest(moduleId: string) {
  const supabase = getSupabaseAdmin();
  const { data: moduleRow, error: moduleError } = await supabase.from("modules").select("id,title,subject").eq("id", moduleId).maybeSingle();
  if (moduleError) throw moduleError;
  if (!moduleRow) throw new Error("El módulo no existe.");
  const { data, error } = await supabase.from("learning_manifests").select("manifest,status").eq("module_id", moduleId).maybeSingle();
  if (error) throw error;
  const row = data as ManifestRow | null;
  if (!row || row.status !== "ready" || !row.manifest) throw new Error("El módulo necesita un Learning Manifest listo.");
  return { supabase, moduleRow, manifest: row.manifest };
}

function findConcept(manifest: LearningManifest, topicId: string, conceptId: string): { topic: LearningTopic; concept: LearningConcept } {
  const topic = manifest.topics.find((item) => item.id === topicId);
  const concept = topic?.concepts.find((item) => item.id === conceptId);
  if (!topic || !concept) throw new Error("El concepto solicitado no existe en el Learning Manifest.");
  return { topic, concept };
}

function completionFrom(progress?: ProgressRow) {
  if (!progress) return 0;
  let score = 0;
  if (progress.viewed_at) score += 20;
  if ((progress.recall_score ?? 0) >= 60) score += 20;
  if (progress.lab_completed) score += 25;
  if (progress.practice_completed) score += 35;
  return Math.min(100, score);
}

function dayKey(value: string) {
  return value.slice(0, 10);
}

function streakFromDates(dates: string[]) {
  const days = new Set(dates.filter(Boolean).map(dayKey));
  if (!days.size) return { current: 0, studiedDaysLast30: 0 };
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirty = new Date(today);
  thirty.setUTCDate(thirty.getUTCDate() - 29);
  const studiedDaysLast30 = Array.from(days).filter((value) => new Date(`${value}T00:00:00Z`) >= thirty).length;
  let current = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    const value = date.toISOString().slice(0, 10);
    if (days.has(value)) current += 1;
    else if (offset === 0) continue;
    else break;
  }
  return { current, studiedDaysLast30 };
}

export async function getLearningDashboard(moduleId: string): Promise<LearningDashboard> {
  const { supabase, moduleRow, manifest } = await loadManifest(moduleId);
  const mastery = await calculateAndPersistMastery(moduleId);
  const [{ data: reviewData, error: reviewError }, { data: progressData, error: progressError }] = await Promise.all([
    supabase.from("concept_reviews").select("topic_id,concept_id,repetitions,interval_days,ease_factor,retention_score,last_score,last_review_at,due_at").eq("module_id", moduleId),
    supabase.from("concept_progress").select("topic_id,concept_id,viewed_at,recall_score,lab_completed,practice_completed,practice_best_score,completion_score").eq("module_id", moduleId),
  ]);
  if (reviewError) throw reviewError;
  if (progressError) throw progressError;

  const reviews = new Map(((reviewData ?? []) as ReviewRow[]).map((row) => [key(row.topic_id, row.concept_id), row]));
  const progress = new Map(((progressData ?? []) as ProgressRow[]).map((row) => [key(row.topic_id, row.concept_id), row]));
  const masteryMap = new Map(mastery.concepts.map((item) => [key(item.topicId, item.conceptId), item]));
  const now = Date.now();
  const states: ConceptLearningState[] = [];

  for (const topic of manifest.topics) {
    for (const concept of topic.concepts) {
      const masteryItem = masteryMap.get(key(topic.id, concept.id));
      const review = reviews.get(key(topic.id, concept.id));
      const progressItem = progress.get(key(topic.id, concept.id));
      const dueAt = review?.due_at ?? new Date().toISOString();
      const due = Boolean(review && new Date(dueAt).getTime() <= now);
      const completionScore = completionFrom(progressItem);
      const masteryScore = masteryItem?.score ?? 0;
      const retentionScore = review?.retention_score ?? 0;
      let reason = "Siguiente concepto de la ruta.";
      if (due) reason = `Repaso vencido: retención actual ${retentionScore}%.`;
      else if (!progressItem?.viewed_at) reason = "Aún no lo has trabajado en la mesa de estudio.";
      else if ((masteryItem?.evidenceCount ?? 0) === 0) reason = "Ya lo viste, pero todavía falta evidencia de comprensión.";
      else if (masteryScore < 70) reason = `Dominio actual ${masteryScore}%: conviene reforzarlo antes de avanzar.`;
      else if (retentionScore && retentionScore < 70) reason = `La comprensión va bien, pero la retención está en ${retentionScore}%.`;
      states.push({
        topicId: topic.id,
        topicTitle: topic.title,
        conceptId: concept.id,
        conceptTitle: concept.title,
        masteryScore,
        masteryStatus: masteryItem?.status ?? "Sin evidencia",
        evidenceCount: masteryItem?.evidenceCount ?? 0,
        completionScore,
        retentionScore,
        dueAt,
        due,
        viewed: Boolean(progressItem?.viewed_at),
        labCompleted: Boolean(progressItem?.lab_completed),
        practiceCompleted: Boolean(progressItem?.practice_completed),
        reason,
      });
    }
  }

  const dueReviews = states.filter((item) => item.due).sort((a, b) => a.retentionScore - b.retentionScore || a.masteryScore - b.masteryScore);
  const recommended = dueReviews[0]
    ?? states.find((item) => !item.viewed)
    ?? [...states].sort((a, b) => a.masteryScore - b.masteryScore || a.retentionScore - b.retentionScore)[0]
    ?? null;

  const completion = states.length ? Math.round(states.reduce((sum, item) => sum + item.completionScore, 0) / states.length) : 0;
  const comprehension = mastery.overallScore;
  const applicationCandidates = states.filter((item) => item.practiceCompleted || item.labCompleted);
  const application = applicationCandidates.length
    ? Math.round(applicationCandidates.reduce((sum, item) => sum + Math.round((item.masteryScore * 0.7) + (item.completionScore * 0.3)), 0) / applicationCandidates.length)
    : 0;
  const reviewed = states.filter((item) => item.retentionScore > 0);
  const retention = reviewed.length ? Math.round(reviewed.reduce((sum, item) => sum + item.retentionScore, 0) / reviewed.length) : 0;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const sinceIso = since.toISOString();
  const [practiceDates, recallDates, examDates, sessionDates] = await Promise.all([
    supabase.from("practice_attempts").select("created_at").eq("module_id", moduleId).gte("created_at", sinceIso),
    supabase.from("recall_attempts").select("created_at").eq("module_id", moduleId).gte("created_at", sinceIso),
    supabase.from("exam_answers").select("created_at").eq("module_id", moduleId).gte("created_at", sinceIso),
    supabase.from("study_sessions").select("completed_at").eq("module_id", moduleId).eq("status", "completed").gte("completed_at", sinceIso),
  ]);
  const activityDates = [
    ...(practiceDates.data ?? []).map((row: Record<string, unknown>) => String(row.created_at)),
    ...(recallDates.data ?? []).map((row: Record<string, unknown>) => String(row.created_at)),
    ...(examDates.data ?? []).map((row: Record<string, unknown>) => String(row.created_at)),
    ...(sessionDates.data ?? []).map((row: Record<string, unknown>) => String(row.completed_at)),
  ];
  const streak = streakFromDates(activityDates);

  return {
    moduleId,
    moduleTitle: String(moduleRow.title),
    dimensions: { completion, comprehension, application, retention },
    currentStreak: streak.current,
    studiedDaysLast30: streak.studiedDaysLast30,
    dueReviewCount: dueReviews.length,
    dueReviews: dueReviews.slice(0, 8),
    recommended,
    concepts: states,
  };
}

export async function trackConceptProgress(moduleId: string, topicId: string, conceptId: string, event: "view" | "lab" | "practice", score?: number) {
  const { supabase, manifest } = await loadManifest(moduleId);
  findConcept(manifest, topicId, conceptId);
  const { data: existing, error } = await supabase.from("concept_progress").select("*").eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId).maybeSingle();
  if (error) throw error;
  const current = existing as ProgressRow | null;
  const now = new Date().toISOString();
  const next: ProgressRow = {
    topic_id: topicId,
    concept_id: conceptId,
    viewed_at: current?.viewed_at ?? now,
    recall_score: current?.recall_score ?? null,
    lab_completed: event === "lab" ? true : Boolean(current?.lab_completed),
    practice_completed: event === "practice" ? true : Boolean(current?.practice_completed),
    practice_best_score: event === "practice" && typeof score === "number" ? Math.max(current?.practice_best_score ?? 0, Math.max(0, Math.min(100, Math.round(score)))) : (current?.practice_best_score ?? null),
    completion_score: 0,
  };
  next.completion_score = completionFrom(next);
  const { error: upsertError } = await supabase.from("concept_progress").upsert({
    module_id: moduleId,
    topic_id: topicId,
    concept_id: conceptId,
    viewed_at: next.viewed_at,
    recall_score: next.recall_score,
    lab_completed: next.lab_completed,
    practice_completed: next.practice_completed,
    practice_best_score: next.practice_best_score,
    completion_score: next.completion_score,
    updated_at: now,
  }, { onConflict: "module_id,topic_id,concept_id" });
  if (upsertError) throw upsertError;
  return { ok: true, completionScore: next.completion_score };
}

function scheduleReview(previous: ReviewRow | null, score: number) {
  const repetitions = score < 60 ? 0 : (previous?.repetitions ?? 0) + 1;
  let intervalDays = 1;
  let easeFactor = Number(previous?.ease_factor ?? 2.3);
  if (score >= 90) easeFactor = Math.min(3.0, easeFactor + 0.12);
  else if (score >= 75) easeFactor = Math.min(2.8, easeFactor + 0.04);
  else if (score < 60) easeFactor = Math.max(1.5, easeFactor - 0.2);
  else easeFactor = Math.max(1.6, easeFactor - 0.05);

  if (score < 60) intervalDays = 1;
  else if (repetitions === 1) intervalDays = 2;
  else if (repetitions === 2) intervalDays = score >= 85 ? 5 : 4;
  else intervalDays = Math.max(3, Math.round((previous?.interval_days || 3) * easeFactor));

  const due = new Date();
  due.setUTCDate(due.getUTCDate() + intervalDays);
  const retentionScore = previous ? Math.round((Number(previous.retention_score) * 0.42) + (score * 0.58)) : score;
  return { repetitions, intervalDays, easeFactor, retentionScore, dueAt: due.toISOString() };
}

export async function evaluateRecall(moduleId: string, topicId: string, conceptId: string, response: string): Promise<RecallEvaluation> {
  if (!response.trim()) throw new Error("Escribe lo que recuerdas antes de comprobar.");
  const { supabase, manifest } = await loadManifest(moduleId);
  const { topic, concept } = findConcept(manifest, topicId, conceptId);
  const prompt = `Sin mirar tus apuntes, explica con tus palabras qué es “${concept.title}”, cómo funciona y un ejemplo o aplicación. No necesitas escribir mucho: importa recuperar la idea sin ayuda.`;
  const developer = [
    "Eres el evaluador de active recall de Maestría Lab.",
    "Evalúa cuánto logró recuperar el estudiante SIN exigir coincidencia literal.",
    "Compara contra el concepto suministrado. Premia explicar la idea central, mecanismo/condiciones y una aplicación correcta.",
    "score 90-100: recuperación precisa y transferible; 75-89: comprensión clara con omisiones menores; 60-74: idea central parcial; <60: lagunas o errores importantes.",
    "feedback debe ser breve, concreto y accionable. missingIdeas solo contiene ideas esenciales realmente ausentes. misconception debe ser null si no hay una confusión conceptual concreta.",
  ].join("\n");
  const user = [
    `TEMA: ${topic.title}`,
    `CONCEPTO: ${concept.title}`,
    `RESUMEN: ${concept.sourceSummary}`,
    `EXPLICACIÓN FÁCIL: ${concept.easy}`,
    `NIVEL MAESTRÍA: ${concept.masters}`,
    `POR QUÉ IMPORTA: ${concept.whyItMatters}`,
    `APLICACIÓN: ${concept.applicationAI}`,
    `RESPUESTA DEL ESTUDIANTE: ${response}`,
  ].join("\n\n");
  const result = await requestStructuredOutput<RecallModelResult>({ name: "active_recall_evaluation", schema: recallEvaluationSchema, developer, user, reasoning: "low", verbosity: "low" });

  const { data: previousData, error: previousError } = await supabase.from("concept_reviews").select("topic_id,concept_id,repetitions,interval_days,ease_factor,retention_score,last_score,last_review_at,due_at").eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId).maybeSingle();
  if (previousError) throw previousError;
  const previous = previousData as ReviewRow | null;
  const schedule = scheduleReview(previous, result.data.score);
  const now = new Date().toISOString();

  const { error: attemptError } = await supabase.from("recall_attempts").insert({
    module_id: moduleId,
    topic_id: topicId,
    concept_id: conceptId,
    prompt,
    response: response.trim(),
    score: result.data.score,
    feedback: result.data.feedback,
    missing_ideas: result.data.missingIdeas,
    misconception: result.data.misconception,
    evaluator_model: result.model,
  });
  if (attemptError) throw attemptError;

  const { error: reviewError } = await supabase.from("concept_reviews").upsert({
    module_id: moduleId,
    topic_id: topicId,
    concept_id: conceptId,
    repetitions: schedule.repetitions,
    interval_days: schedule.intervalDays,
    ease_factor: schedule.easeFactor,
    retention_score: schedule.retentionScore,
    last_score: result.data.score,
    last_review_at: now,
    due_at: schedule.dueAt,
    updated_at: now,
  }, { onConflict: "module_id,topic_id,concept_id" });
  if (reviewError) throw reviewError;

  const { data: progressData } = await supabase.from("concept_progress").select("*").eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId).maybeSingle();
  const current = progressData as ProgressRow | null;
  const progress: ProgressRow = {
    topic_id: topicId,
    concept_id: conceptId,
    viewed_at: current?.viewed_at ?? now,
    recall_score: result.data.score,
    lab_completed: Boolean(current?.lab_completed),
    practice_completed: Boolean(current?.practice_completed),
    practice_best_score: current?.practice_best_score ?? null,
    completion_score: 0,
  };
  progress.completion_score = completionFrom(progress);
  await supabase.from("concept_progress").upsert({
    module_id: moduleId,
    topic_id: topicId,
    concept_id: conceptId,
    viewed_at: progress.viewed_at,
    recall_score: progress.recall_score,
    lab_completed: progress.lab_completed,
    practice_completed: progress.practice_completed,
    practice_best_score: progress.practice_best_score,
    completion_score: progress.completion_score,
    updated_at: now,
  }, { onConflict: "module_id,topic_id,concept_id" });

  return {
    score: result.data.score,
    feedback: result.data.feedback,
    missingIdeas: result.data.missingIdeas,
    misconception: result.data.misconception,
    nextReviewAt: schedule.dueAt,
    retentionScore: schedule.retentionScore,
    model: result.model,
  };
}

export async function getNotes(moduleId: string, topicId?: string, conceptId?: string): Promise<StudyNote[]> {
  const { supabase } = await loadManifest(moduleId);
  let query = supabase.from("study_notes").select("*").eq("module_id", moduleId).order("updated_at", { ascending: false });
  if (topicId) query = query.eq("topic_id", topicId);
  if (conceptId) query = query.eq("concept_id", conceptId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), moduleId, topicId: String(row.topic_id), conceptId: String(row.concept_id), noteText: String(row.note_text), recallQuestion: typeof row.recall_question === "string" ? row.recall_question : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }));
}

export async function createNote(moduleId: string, topicId: string, conceptId: string, noteText: string): Promise<StudyNote> {
  if (!noteText.trim()) throw new Error("Escribe una nota antes de guardarla.");
  const { supabase, manifest } = await loadManifest(moduleId);
  const { concept } = findConcept(manifest, topicId, conceptId);
  const now = new Date().toISOString();
  const recallQuestion = `Sin mirar tu nota, explica con tus palabras la idea que guardaste sobre “${concept.title}” y da un ejemplo propio.`;
  const { data, error } = await supabase.from("study_notes").insert({ module_id: moduleId, topic_id: topicId, concept_id: conceptId, note_text: noteText.trim(), recall_question: recallQuestion, created_at: now, updated_at: now }).select("*").single();
  if (error || !data) throw error ?? new Error("No se pudo guardar la nota.");
  return { id: String(data.id), moduleId, topicId, conceptId, noteText: String(data.note_text), recallQuestion: data.recall_question ?? null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
}

export async function deleteNote(moduleId: string, noteId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("study_notes").delete().eq("module_id", moduleId).eq("id", noteId);
  if (error) throw error;
  return { ok: true };
}

function projectRecord(row: Record<string, unknown>): CapstoneProjectRecord {
  return {
    id: String(row.id), moduleId: String(row.module_id), title: String(row.title), status: row.status as CapstoneProjectRecord["status"], project: row.project as CapstoneProjectPayload, submission: row.submission ? String(row.submission) : null, evaluation: (row.evaluation as CapstoneEvaluation | null) ?? null, model: row.model ? String(row.model) : undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function getProjects(moduleId: string): Promise<CapstoneProjectRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("capstone_projects").select("*").eq("module_id", moduleId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => projectRecord(row));
}

export async function generateCapstoneProject(moduleId: string): Promise<CapstoneProjectRecord> {
  const { supabase, moduleRow, manifest } = await loadManifest(moduleId);
  const mastery = await calculateAndPersistMastery(moduleId);
  const conceptCatalog = manifest.topics.flatMap((topic) => topic.concepts.map((concept) => ({ topic: topic.title, concept: concept.title, summary: concept.sourceSummary, applicationAI: concept.applicationAI }))).slice(0, 40);
  const developer = [
    "Diseña un proyecto integrador adulto y realista para una Maestría en IA y Ciencia de Datos.",
    "Debe obligar a combinar varios conceptos del módulo en una situación profesional, no ser un cuestionario disfrazado.",
    "No introduzcas como requisito conocimientos que no aparecen en el catálogo; sí puedes crear un escenario de negocio o ingeniería para aplicarlos.",
    "Los entregables deben poder escribirse o programarse en una respuesta textual. La rúbrica debe sumar aproximadamente 100 y valorar comprensión, aplicación y justificación.",
  ].join("\n");
  const user = [
    `MÓDULO: ${moduleRow.title}`,
    `MATERIA: ${moduleRow.subject}`,
    `CONCEPTOS: ${JSON.stringify(conceptCatalog)}`,
    `PUNTOS DÉBILES ACTUALES: ${mastery.weakest.slice(0, 4).map((item) => `${item.conceptTitle} ${item.score}%`).join("; ")}`,
  ].join("\n\n");
  const result = await requestStructuredOutput<CapstoneProjectPayload>({ name: "capstone_project", schema: capstoneProjectSchema, developer, user, reasoning: "medium", verbosity: "medium" });
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("capstone_projects").insert({ module_id: moduleId, title: result.data.title, status: "ready", project: result.data, model: result.model, created_at: now, updated_at: now }).select("*").single();
  if (error || !data) throw error ?? new Error("No se pudo guardar el proyecto integrador.");
  return projectRecord(data);
}

export async function evaluateCapstoneProject(moduleId: string, projectId: string, submission: string): Promise<CapstoneProjectRecord> {
  if (!submission.trim()) throw new Error("Escribe tu solución antes de evaluar.");
  const { supabase, manifest } = await loadManifest(moduleId);
  const { data: projectData, error: projectError } = await supabase.from("capstone_projects").select("*").eq("module_id", moduleId).eq("id", projectId).maybeSingle();
  if (projectError) throw projectError;
  if (!projectData) throw new Error("El proyecto no existe.");
  const project = projectData.project as CapstoneProjectPayload;
  const developer = [
    "Eres evaluador de un proyecto integrador de Maestría Lab.",
    "Evalúa la entrega contra objetivo, entregables, restricciones y rúbrica. Sé exigente pero accionable.",
    "No premies longitud. Valora exactitud conceptual, capacidad de aplicar y justificar decisiones.",
  ].join("\n");
  const user = [
    `PROYECTO: ${JSON.stringify(project)}`,
    `CONCEPTOS DEL MÓDULO: ${manifest.topics.flatMap((topic) => topic.concepts.map((concept) => concept.title)).join(", ")}`,
    `ENTREGA DEL ESTUDIANTE:\n${submission.trim()}`,
  ].join("\n\n");
  const result = await requestStructuredOutput<CapstoneEvaluation>({ name: "capstone_evaluation", schema: capstoneEvaluationSchema, developer, user, reasoning: "medium", verbosity: "medium" });
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("capstone_projects").update({ status: "evaluated", submission: submission.trim(), evaluation: result.data, updated_at: now }).eq("module_id", moduleId).eq("id", projectId).select("*").single();
  if (error || !data) throw error ?? new Error("No se pudo guardar la evaluación.");
  return projectRecord(data);
}

export async function getKnowledgeMap(): Promise<KnowledgeMap> {
  const supabase = getSupabaseAdmin();
  const { data: manifestRows, error: manifestError } = await supabase.from("learning_manifests").select("module_id,manifest,status").eq("status", "ready").not("manifest", "is", null);
  if (manifestError) throw manifestError;
  if (!manifestRows?.length) return { nodes: [], edges: [] };
  const typedManifestRows = (manifestRows ?? []) as Array<{ module_id: string; manifest: LearningManifest; status: string }>;
  const moduleIds = typedManifestRows.map((row) => row.module_id);
  const [{ data: modules }, { data: mastery }, { data: reviews }, { data: connections }] = await Promise.all([
    supabase.from("modules").select("id,title,subject").in("id", moduleIds),
    supabase.from("concept_mastery").select("module_id,topic_id,concept_id,mastery_score").in("module_id", moduleIds),
    supabase.from("concept_reviews").select("module_id,topic_id,concept_id,retention_score,due_at").in("module_id", moduleIds),
    supabase.from("module_connections").select("id,source_module_id,source_topic_id,source_concept_id,target_module_id,target_topic_id,target_concept_id,relationship_type,strength,title").order("strength", { ascending: false }).limit(80),
  ]);
  const moduleMap = new Map<string, { id: string; title: string; subject: string }>((modules ?? []).map((item: Record<string, unknown>) => [String(item.id), { id: String(item.id), title: String(item.title), subject: String(item.subject) }]));
  const masteryMap = new Map<string, number>((mastery ?? []).map((item: Record<string, unknown>) => [`${item.module_id}::${item.topic_id}::${item.concept_id}`, Number(item.mastery_score)]));
  const reviewMap = new Map<string, { retention: number; dueAt: string }>((reviews ?? []).map((item: Record<string, unknown>) => [`${item.module_id}::${item.topic_id}::${item.concept_id}`, { retention: Number(item.retention_score), dueAt: String(item.due_at) }]));
  const nodes = typedManifestRows.flatMap((row) => {
    const manifest = row.manifest as LearningManifest;
    const moduleRow = moduleMap.get(String(row.module_id));
    if (!moduleRow) return [];
    return manifest.topics.flatMap((topic) => topic.concepts.map((concept) => {
      const nodeId = `${row.module_id}::${topic.id}::${concept.id}`;
      const masteryScore = masteryMap.get(nodeId) ?? 0;
      const review = reviewMap.get(nodeId);
      const retentionScore = review?.retention ?? 0;
      const due = review ? new Date(review.dueAt).getTime() <= Date.now() : false;
      const state = masteryScore >= 85 && retentionScore >= 70 ? "dominated" as const : due || (retentionScore > 0 && retentionScore < 60) ? "review" as const : masteryScore > 0 ? "progress" as const : "new" as const;
      return { id: nodeId, moduleId: String(row.module_id), moduleTitle: String(moduleRow.title), subject: String(moduleRow.subject), topicId: topic.id, topicTitle: topic.title, conceptId: concept.id, conceptTitle: concept.title, masteryScore, retentionScore, state };
    }));
  });
  const validNodes = new Set(nodes.map((node) => node.id));
  const edges = (connections ?? []).flatMap((row: Record<string, unknown>) => {
    const source = `${row.source_module_id}::${row.source_topic_id}::${row.source_concept_id}`;
    const target = `${row.target_module_id}::${row.target_topic_id}::${row.target_concept_id}`;
    if (!validNodes.has(source) || !validNodes.has(target)) return [];
    return [{ id: String(row.id), source, target, type: String(row.relationship_type), strength: Number(row.strength), title: String(row.title) }];
  });
  return { nodes, edges };
}
