import { requestStructuredOutput } from "@/lib/openai/responses";
import { conceptExperienceJsonSchema, practiceEvaluationJsonSchema, studyAssistantJsonSchema } from "@/lib/experience/schema";
import type {
  ConceptExperience,
  ExperienceRecord,
  PracticeEvaluation,
  PracticeExercise,
  StudyAssistantAction,
  StudyAssistantResult,
} from "@/lib/experience/types";
import type { LearningConcept, LearningManifest, LearningTopic, SourceReference } from "@/lib/pedagogy/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type UnitRow = {
  unit_index: number;
  page_number: number | null;
  label: string | null;
  content: string;
};

type ManifestRow = {
  document_id: string;
  manifest: LearningManifest;
  status: string;
};

function uniqueRefs(refs: SourceReference[]) {
  return Array.from(new Map(refs.map((ref) => [`${ref.unitIndex}:${ref.pageNumber ?? "x"}`, ref])).values());
}

function validateSourceReferences(refs: SourceReference[], units: UnitRow[]) {
  const unitMap = new Map(units.map((unit) => [unit.unit_index, unit]));
  for (const ref of refs) {
    const unit = unitMap.get(ref.unitIndex);
    if (!unit) throw new Error(`La IA devolvió una referencia inexistente: unidad ${ref.unitIndex}.`);
    if (ref.pageNumber !== null && unit.page_number !== ref.pageNumber) {
      throw new Error(`La referencia pág. ${ref.pageNumber} no coincide con la unidad ${ref.unitIndex}.`);
    }
  }
}

function findContext(manifest: LearningManifest, topicId: string, conceptId: string) {
  const topic = manifest.topics.find((item) => item.id === topicId);
  if (!topic) throw new Error("El tema solicitado no existe en el Learning Manifest.");
  const concept = topic.concepts.find((item) => item.id === conceptId);
  if (!concept) throw new Error("El concepto solicitado no existe en el Learning Manifest.");
  return { topic, concept };
}

async function loadContext(moduleId: string, topicId: string, conceptId: string) {
  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase.from("learning_manifests").select("document_id,manifest,status").eq("module_id", moduleId).maybeSingle();
  if (error) throw error;
  if (!row || row.status !== "ready" || !row.manifest) throw new Error("El módulo necesita un Learning Manifest listo.");

  const manifestRow = row as ManifestRow;
  const manifest = manifestRow.manifest;
  const { topic, concept } = findContext(manifest, topicId, conceptId);
  const referencedIndexes = new Set(uniqueRefs([...topic.sourceRefs, ...concept.sourceRefs]).map((ref) => ref.unitIndex));

  const { data: units, error: unitsError } = await supabase
    .from("document_units")
    .select("unit_index,page_number,label,content")
    .eq("document_id", manifestRow.document_id)
    .order("unit_index", { ascending: true });
  if (unitsError) throw unitsError;
  const allUnits = (units ?? []) as UnitRow[];
  const sourceUnits = allUnits.filter((unit) => referencedIndexes.has(unit.unit_index));
  if (!sourceUnits.length) throw new Error("No se encontraron las unidades de fuente del concepto.");

  return { supabase, manifest, documentId: manifestRow.document_id, topic, concept, sourceUnits, allUnits };
}

function serializeSource(units: UnitRow[]) {
  return units.map((unit) => {
    const location = unit.page_number ? `página ${unit.page_number}` : unit.label || `unidad ${unit.unit_index}`;
    return `[UNIDAD ${unit.unit_index} · ${location}]\n${unit.content}`;
  }).join("\n\n---\n\n");
}

function conceptBrief(manifest: LearningManifest, topic: LearningTopic, concept: LearningConcept) {
  return [
    `MÓDULO: ${manifest.moduleTitle}`,
    `MATERIA: ${manifest.subject}`,
    `TEMA: ${topic.title}`,
    `CONCEPTO: ${concept.title}`,
    `POR QUÉ IMPORTA: ${concept.whyItMatters}`,
    `RESUMEN DE FUENTE: ${concept.sourceSummary}`,
    `EXPLICACIÓN FÁCIL: ${concept.easy}`,
    `NIVEL MAESTRÍA: ${concept.masters}`,
    `PROFUNDIZAR: ${concept.deepen}`,
    `APLICACIÓN EN IA: ${concept.applicationAI}`,
  ].join("\n");
}

function allExperienceRefs(experience: ConceptExperience) {
  return [
    ...experience.lab.sourceRefs,
    ...experience.exercises.flatMap((exercise) => exercise.sourceRefs),
  ];
}

function normalizeExperience(experience: ConceptExperience, topicId: string, concept: LearningConcept) {
  experience.schemaVersion = "1.0";
  experience.topicId = topicId;
  experience.conceptId = concept.id;
  experience.conceptTitle = concept.title;

  const seen = new Set<string>();
  experience.exercises = experience.exercises.map((exercise, index) => {
    let id = exercise.id?.trim() || `ejercicio-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return { ...exercise, id };
  });

  const levelCounts = new Map<number, number>();
  for (const exercise of experience.exercises) levelCounts.set(exercise.level, (levelCounts.get(exercise.level) ?? 0) + 1);
  for (const level of [1, 2, 3]) {
    if ((levelCounts.get(level) ?? 0) < 2) throw new Error(`La experiencia debe incluir al menos 2 ejercicios de nivel ${level}.`);
  }

  if ((experience.lab.type === "logic_switch" || experience.lab.type === "truth_table") && experience.lab.propositions.length < 1) {
    throw new Error("El laboratorio lógico necesita al menos una proposición.");
  }
  if ((experience.lab.type === "logic_switch" || experience.lab.type === "truth_table") && !experience.lab.operator) {
    throw new Error("El laboratorio lógico necesita un operador válido.");
  }
  if (experience.lab.type === "logic_switch" || experience.lab.type === "truth_table") {
    const required = experience.lab.operator === "not" ? 1 : 2;
    if (experience.lab.propositions.length < required) throw new Error(`El laboratorio lógico requiere ${required} proposición(es).`);
    experience.lab.propositions = experience.lab.propositions.slice(0, required);
  }
  if (experience.lab.type === "matching") {
    if (experience.lab.matchingPairs.length < 3) throw new Error("El laboratorio de asociación necesita al menos 3 pares.");
    const left = new Set(experience.lab.matchingPairs.map((pair) => pair.left.trim().toLowerCase()));
    const right = new Set(experience.lab.matchingPairs.map((pair) => pair.right.trim().toLowerCase()));
    if (left.size !== experience.lab.matchingPairs.length || right.size !== experience.lab.matchingPairs.length) throw new Error("El laboratorio de asociación contiene pares duplicados.");
  }
  if (experience.lab.type === "sequence") {
    if (experience.lab.sequenceItems.length < 3) throw new Error("El laboratorio de secuencia necesita al menos 3 pasos.");
    const orders = [...experience.lab.sequenceItems].map((item) => item.order).sort((a, b) => a - b);
    if (!orders.every((order, index) => order === index + 1)) throw new Error("El laboratorio de secuencia debe usar un orden continuo desde 1.");
  }
  if (experience.lab.type === "code_prediction") {
    if (!experience.lab.codeSnippet || experience.lab.codeOptions.length < 2 || experience.lab.codeAnswerIndex === null) throw new Error("El laboratorio de código necesita fragmento, opciones y respuesta.");
    if (experience.lab.codeAnswerIndex >= experience.lab.codeOptions.length) throw new Error("El índice de respuesta del laboratorio de código no existe en las opciones.");
  }

  for (const exercise of experience.exercises) {
    if (exercise.type === "short_answer") {
      if (exercise.options.length) throw new Error(`El ejercicio ${exercise.id} de respuesta corta no debe tener opciones.`);
      if (!exercise.correctAnswer.trim()) throw new Error(`El ejercicio ${exercise.id} necesita respuesta esperada.`);
    } else {
      if (exercise.options.length < 2) throw new Error(`El ejercicio ${exercise.id} necesita al menos dos opciones.`);
      if (!exercise.options.some((option) => option.trim().toLowerCase() === exercise.correctAnswer.trim().toLowerCase())) throw new Error(`La respuesta correcta de ${exercise.id} no aparece entre sus opciones.`);
    }
  }

  return experience;
}

export async function getExperienceRecord(moduleId: string, topicId: string, conceptId: string): Promise<ExperienceRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("learning_experiences").select("status,model,experience,generation_error,generated_at").eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId).maybeSingle();
  if (error) throw error;
  if (!data) return { status: "missing" };
  return {
    status: data.status as ExperienceRecord["status"],
    model: data.model ?? undefined,
    experience: data.experience ?? undefined,
    generationError: data.generation_error ?? undefined,
    generatedAt: data.generated_at ?? undefined,
  };
}

export async function generateExperienceForConcept(moduleId: string, topicId: string, conceptId: string) {
  const context = await loadContext(moduleId, topicId, conceptId);
  const now = new Date().toISOString();

  const { error: upsertError } = await context.supabase.from("learning_experiences").upsert({
    module_id: moduleId,
    document_id: context.documentId,
    topic_id: topicId,
    concept_id: conceptId,
    status: "generating",
    model: null,
    experience: null,
    generation_error: null,
    generated_at: null,
    updated_at: now,
  }, { onConflict: "module_id,topic_id,concept_id" });
  if (upsertError) throw upsertError;

  const developer = [
    "Eres el diseñador de experiencias de Maestría Lab para una Maestría en Inteligencia Artificial y Ciencia de Datos.",
    "Debes convertir UN concepto ya estructurado en una experiencia práctica útil, no en decoración interactiva.",
    "Elige exactamente un laboratorio de este registro: logic_switch, truth_table, matching, sequence, code_prediction.",
    "Usa logic_switch o truth_table cuando el concepto realmente trate proposiciones, conectivos, lógica booleana o evaluación de expresiones. En esos laboratorios usa exactamente 2 proposiciones para operadores binarios y 1 para NOT.",
    "Usa code_prediction solo si el concepto puede aprenderse razonando sobre un fragmento pequeño de Python.",
    "Usa matching para relaciones término-definición o elemento-propiedad y sequence para procesos con orden causal o algorítmico.",
    "No fuerces un laboratorio llamativo si uno sencillo enseña mejor.",
    "Genera entre 6 y 9 ejercicios: mínimo 2 de nivel 1, 2 de nivel 2 y 2 de nivel 3.",
    "Nivel 1 es guiado; nivel 2 semiguiado; nivel 3 exige transferencia o razonamiento sin ayuda.",
    "Los ejercicios pueden ser multiple_choice, true_false, short_answer o code_prediction.",
    "Para multiple_choice/code_prediction incluye opciones. Para true_false usa opciones ['Verdadero','Falso']. Para short_answer options debe estar vacío y acceptedAnswers debe incluir formulaciones breves aceptables.",
    "Toda afirmación académica debe estar anclada en sourceRefs reales de las unidades suministradas. No inventes páginas ni unidades.",
    "Los ejemplos, escenarios o código pueden ser generados pedagógicamente, pero deben ser consistentes con la fuente.",
    "Haz que la experiencia sea adulta, técnica y útil para comprender; evita preguntas triviales de memorización si el concepto permite razonamiento.",
  ].join("\n");

  const user = `${conceptBrief(context.manifest, context.topic, context.concept)}\n\nUNIDADES DE FUENTE AUTORIZADAS:\n${serializeSource(context.sourceUnits)}\n\nDiseña la experiencia completa para este concepto.`;

  try {
    const result = await requestStructuredOutput<ConceptExperience>({
      name: "concept_experience",
      schema: conceptExperienceJsonSchema,
      developer,
      user,
      reasoning: "medium",
      verbosity: "medium",
    });
    const experience = normalizeExperience(result.data, topicId, context.concept);
    validateSourceReferences(allExperienceRefs(experience), context.allUnits);
    const generatedAt = new Date().toISOString();
    const { error: saveError } = await context.supabase.from("learning_experiences").update({
      status: "ready",
      model: result.model,
      experience,
      generation_error: null,
      generated_at: generatedAt,
      updated_at: generatedAt,
    }).eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId);
    if (saveError) throw saveError;
    return { experience, model: result.model, generatedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar la experiencia.";
    await context.supabase.from("learning_experiences").update({ status: "error", generation_error: message, updated_at: new Date().toISOString() }).eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId);
    throw new Error(message);
  }
}

export async function runStudyAssistant(moduleId: string, topicId: string, conceptId: string, action: StudyAssistantAction, question?: string) {
  const context = await loadContext(moduleId, topicId, conceptId);
  const instructions: Record<StudyAssistantAction, string> = {
    deeper: "Explica el concepto con rigor pero en formato de repaso. En answer usa aproximadamente 90-140 palabras y exactamente tres microbloques de 1-2 frases, etiquetados como Idea:, Cómo funciona: y Ejemplo:. Evita historia, listas exhaustivas, derivaciones largas y repetir la capa Nivel Maestría. Usa takeaways para 3 ideas que conviene memorizar o comprobar después.",
    example: "Crea un ejemplo nuevo, paso a paso, distinto de los ya presentes. Debe obligar a aplicar el concepto y terminar explicando por qué funciona.",
    python: "Conecta el concepto con Python o pseudocódigo cuando tenga sentido. Si no existe una traducción honesta a código, explica por qué y usa code=null.",
    question: "Formula una pregunta de comprobación conceptual desafiante y explica qué debería observar el estudiante para resolverla. Coloca la pregunta también en challenge.",
    connection: "Relaciona el concepto con al menos otro concepto del mismo módulo o con una aplicación posterior en IA/Data Science, dejando claro qué parte procede de la fuente y qué parte es conexión pedagógica.",
    custom: `Responde esta pregunta concreta del estudiante: ${question?.trim() || "Sin pregunta."}`,
  };

  const developer = [
    "Eres la Mesa de estudio IA de Maestría Lab.",
    "Trabajas únicamente sobre el concepto actual y sus unidades de fuente autorizadas.",
    "Tu respuesta debe ser profesional, pedagógica y sustancial. No uses tono infantil ni elogios vacíos. Prioriza claridad y densidad útil sobre longitud.",
    "Distingue hechos sostenidos por la fuente de conexiones o ejemplos pedagógicos generados.",
    "sourceRefs solo puede contener unidades/páginas existentes en la fuente proporcionada.",
    "Si la pregunta pide algo que la fuente no sostiene, dilo explícitamente y presenta cualquier ampliación como contexto pedagógico, no como contenido del documento.",
    "El campo code debe contener solo código cuando realmente ayude; de lo contrario null.",
  ].join("\n");
  const user = `${conceptBrief(context.manifest, context.topic, context.concept)}\n\nACCIÓN SOLICITADA:\n${instructions[action]}\n\nFUENTE AUTORIZADA:\n${serializeSource(context.sourceUnits)}`;

  const result = await requestStructuredOutput<StudyAssistantResult>({
    name: "study_assistant",
    schema: studyAssistantJsonSchema,
    developer,
    user,
    reasoning: "medium",
    verbosity: action === "deeper" ? "low" : "medium",
  });
  validateSourceReferences(result.data.sourceRefs, context.allUnits);
  return { result: result.data, model: result.model };
}

function deterministicEvaluation(exercise: PracticeExercise, answer: string): PracticeEvaluation | null {
  if (exercise.type === "short_answer") return null;
  const normalize = (value: string) => value.trim().toLocaleLowerCase("es-MX").replace(/\s+/g, " ");
  const correct = normalize(answer) === normalize(exercise.correctAnswer);
  return {
    correct,
    score: correct ? 100 : 0,
    feedback: correct ? `Correcto. ${exercise.explanation}` : `La respuesta correcta es “${exercise.correctAnswer}”. ${exercise.explanation}`,
    misconception: correct ? null : "Revisa la diferencia entre tu elección y la regla/concepto que se está evaluando.",
    sourceRefs: exercise.sourceRefs,
  };
}

export async function evaluatePracticeAnswer(moduleId: string, topicId: string, conceptId: string, exerciseId: string, answer: string) {
  if (!answer.trim()) throw new Error("Escribe o selecciona una respuesta antes de verificar.");
  const context = await loadContext(moduleId, topicId, conceptId);
  const { data: row, error } = await context.supabase.from("learning_experiences").select("experience").eq("module_id", moduleId).eq("topic_id", topicId).eq("concept_id", conceptId).maybeSingle();
  if (error) throw error;
  const experience = row?.experience as ConceptExperience | undefined;
  if (!experience) throw new Error("Genera primero la experiencia de este concepto.");
  const exercise = experience.exercises.find((item) => item.id === exerciseId);
  if (!exercise) throw new Error("El ejercicio ya no existe en la experiencia guardada.");

  let evaluation = deterministicEvaluation(exercise, answer);
  let model: string | null = null;

  if (!evaluation) {
    const developer = [
      "Eres un evaluador pedagógico estricto pero útil de Maestría Lab.",
      "Evalúa una respuesta corta del estudiante contra la respuesta esperada y la fuente autorizada.",
      "Acepta paráfrasis conceptualmente equivalentes; no exijas coincidencia literal.",
      "No marques correcto si falta una condición esencial o hay una contradicción importante.",
      "Da feedback específico y breve. Si detectas una idea equivocada, escríbela en misconception; si no, usa null.",
      "sourceRefs solo puede usar referencias proporcionadas.",
    ].join("\n");
    const user = [
      `CONCEPTO: ${context.concept.title}`,
      `PREGUNTA: ${exercise.prompt}`,
      `RESPUESTA ESPERADA: ${exercise.correctAnswer}`,
      `FORMULACIONES ACEPTADAS: ${exercise.acceptedAnswers.join(" | ")}`,
      `RESPUESTA DEL ESTUDIANTE: ${answer}`,
      `EXPLICACIÓN BASE: ${exercise.explanation}`,
      "FUENTE AUTORIZADA:",
      serializeSource(context.sourceUnits),
    ].join("\n\n");
    const result = await requestStructuredOutput<PracticeEvaluation>({
      name: "practice_evaluation",
      schema: practiceEvaluationJsonSchema,
      developer,
      user,
      reasoning: "low",
      verbosity: "medium",
    });
    evaluation = result.data;
    model = result.model;
    validateSourceReferences(evaluation.sourceRefs, context.allUnits);
  }

  const { error: insertError } = await context.supabase.from("practice_attempts").insert({
    module_id: moduleId,
    topic_id: topicId,
    concept_id: conceptId,
    exercise_id: exercise.id,
    level: exercise.level,
    exercise_type: exercise.type,
    answer,
    is_correct: evaluation.correct,
    score: evaluation.score,
    feedback: evaluation.feedback,
    misconception: evaluation.misconception,
    evaluator_model: model,
  });
  if (insertError) throw insertError;

  // Mantener el dominio sincronizado no debe romper la práctica si la migración 007 aún no se ha aplicado.
  try {
    const { calculateAndPersistMastery } = await import("@/lib/mastery/server");
    await calculateAndPersistMastery(moduleId);
  } catch {
    // El dashboard recalcula al abrirse; la respuesta de práctica sigue siendo válida.
  }

  return evaluation;
}
