"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Code2,
  FileAudio2,
  FlaskConical,
  Headphones,
  Lightbulb,
  LoaderCircle,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ActiveRecallCard } from "@/components/learning/active-recall-card";
import { CapstonePanel } from "@/components/learning/capstone-panel";
import { CodeChallengeCard } from "@/components/learning/code-challenge-card";
import { ConceptAudioPanel } from "@/components/learning/concept-audio-panel";
import { ContextTutorPanel } from "@/components/learning/context-tutor-panel";
import { InteractiveLab } from "@/components/learning/interactive-lab";
import { QuickPractice } from "@/components/learning/quick-practice";
import { SmartNotesPanel } from "@/components/learning/smart-notes-panel";
import { ConceptResourceStrip } from "@/components/resources/concept-resource-strip";
import { generateConceptExperience, getConceptExperience } from "@/lib/experience-api";
import { getLearningManifest } from "@/lib/learning-api";
import { getLearningDashboard, trackLearningProgress } from "@/lib/learning-engine-api";
import type { LearningDashboard } from "@/lib/learning-engine/types";
import type { ConceptExperience } from "@/lib/experience/types";
import type { LearningConcept, LearningManifest, LearningTopic } from "@/lib/pedagogy/types";
import type { StudyModule } from "@/lib/mock-data";

function NumberedHeading({ number, eyebrow, title }: { number: string; eyebrow: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="study-accent-soft grid size-9 shrink-0 place-items-center rounded-xl text-xs font-black study-accent">{number}</span>
      <div><p className="meta-font text-[9px] font-black uppercase study-muted">{eyebrow}</p><h3 className="mt-1 study-section-title font-extrabold tracking-[-.02em] study-text">{title}</h3></div>
    </div>
  );
}

export function StudyWorkspace({ module }: { module: StudyModule }) {
  const [manifest, setManifest] = useState<LearningManifest | null>(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [conceptIndex, setConceptIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [manifestStatus, setManifestStatus] = useState("Cargando ruta de aprendizaje…");
  const [experience, setExperience] = useState<ConceptExperience | null>(null);
  const [experienceStatus, setExperienceStatus] = useState("");
  const [experienceBusy, setExperienceBusy] = useState(false);
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const recommendedApplied = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getLearningManifest(module.id)
      .then((record) => {
        if (cancelled) return;
        if (record.status === "ready" && record.manifest) {
          setManifest(record.manifest);
          setManifestStatus("");
        } else {
          setManifestStatus(record.status === "error" ? record.generationError || "La ruta requiere atención." : "Todavía no hay una ruta pedagógica lista para este módulo.");
        }
      })
      .catch((error) => { if (!cancelled) setManifestStatus(error instanceof Error ? error.message : "No se pudo cargar la ruta de aprendizaje."); });
    return () => { cancelled = true; };
  }, [module.id]);

  useEffect(() => {
    recommendedApplied.current = false;
    let cancelled = false;
    getLearningDashboard(module.id).then((result) => { if (!cancelled) setDashboard(result); }).catch(() => { if (!cancelled) setDashboard(null); });
    return () => { cancelled = true; };
  }, [module.id]);

  const topic = manifest?.topics[topicIndex];
  const concept = topic?.concepts[conceptIndex];

  const flatConcepts = useMemo(() => {
    if (!manifest) return [] as Array<{ topicIndex: number; conceptIndex: number; topic: LearningTopic; concept: LearningConcept }>;
    return manifest.topics.flatMap((topicItem, nextTopicIndex) => topicItem.concepts.map((conceptItem, nextConceptIndex) => ({ topicIndex: nextTopicIndex, conceptIndex: nextConceptIndex, topic: topicItem, concept: conceptItem })));
  }, [manifest]);

  const filteredConcepts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return flatConcepts;
    return flatConcepts.filter((item) => `${item.topic.title} ${item.concept.title}`.toLowerCase().includes(normalized));
  }, [flatConcepts, query]);

  const flatIndex = flatConcepts.findIndex((item) => item.topicIndex === topicIndex && item.conceptIndex === conceptIndex);
  const currentLearningState = dashboard?.concepts.find((item) => item.topicId === topic?.id && item.conceptId === concept?.id);

  useEffect(() => {
    if (!manifest || !dashboard?.recommended || recommendedApplied.current) return;
    const next = flatConcepts.find((item) => item.topic.id === dashboard.recommended?.topicId && item.concept.id === dashboard.recommended?.conceptId);
    if (!next) return;
    recommendedApplied.current = true;
    setTopicIndex(next.topicIndex);
    setConceptIndex(next.conceptIndex);
  }, [manifest, dashboard, flatConcepts]);

  useEffect(() => {
    if (!topic || !concept) return;
    void trackLearningProgress(module.id, topic.id, concept.id, "view").then(() => getLearningDashboard(module.id)).then(setDashboard).catch(() => undefined);
  }, [module.id, topic?.id, concept?.id]);

  useEffect(() => {
    if (!topic || !concept) return;
    let cancelled = false;
    setExperience(null);
    setExperienceStatus("Buscando interactivo…");
    getConceptExperience(module.id, topic.id, concept.id)
      .then((record) => {
        if (cancelled) return;
        if (record.status === "ready" && record.experience) { setExperience(record.experience); setExperienceStatus(""); }
        else setExperienceStatus(record.status === "error" ? record.generationError || "El interactivo requiere atención." : "Todavía no hay una experiencia preparada para este concepto.");
      })
      .catch((error) => { if (!cancelled) setExperienceStatus(error instanceof Error ? error.message : "No se pudo cargar el interactivo."); });
    return () => { cancelled = true; };
  }, [module.id, topic, concept]);

  async function refreshDashboard() {
    try { setDashboard(await getLearningDashboard(module.id)); } catch { /* opcional */ }
  }

  function selectConcept(nextTopicIndex: number, nextConceptIndex: number) {
    setTopicIndex(nextTopicIndex);
    setConceptIndex(nextConceptIndex);
    if (typeof window !== "undefined") window.setTimeout(() => document.getElementById("study-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function moveConcept(direction: -1 | 1) {
    if (!flatConcepts.length || flatIndex < 0) return;
    const next = flatConcepts[flatIndex + direction];
    if (next) selectConcept(next.topicIndex, next.conceptIndex);
  }

  async function prepareExperience() {
    if (!topic || !concept) return;
    setExperienceBusy(true);
    setExperienceStatus("Diseñando un interactivo para este concepto…");
    try {
      await generateConceptExperience(module.id, topic.id, concept.id);
      const record = await getConceptExperience(module.id, topic.id, concept.id);
      setExperience(record.experience ?? null);
      setExperienceStatus(record.experience ? "" : "No se recibió una experiencia válida.");
    } catch (error) {
      setExperienceStatus(error instanceof Error ? error.message : "No se pudo generar el interactivo.");
    } finally { setExperienceBusy(false); }
  }

  if (!manifest || !topic || !concept) {
    return (
      <section id="study-workspace" className="study-shell mt-5 rounded-[26px] p-6 sm:p-8">
        <p className="meta-font text-[9px] font-black uppercase study-accent">Mesa de aprendizaje</p>
        <h2 className="mt-3 text-3xl font-extrabold study-text">La experiencia interactiva se construye desde tu fuente.</h2>
        <p className="mt-3 max-w-3xl study-copy study-muted">{manifestStatus}</p>
      </section>
    );
  }

  const realExample = concept.examples[0];

  return (
    <section id="study-workspace" className="study-shell lab-enter mt-5 overflow-hidden rounded-[26px]" aria-label="Mesa de estudio">
      <div className="grid xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="study-panel border-0 border-r study-line p-4 sm:p-5 xl:min-h-[900px]">
          <div className="flex items-center justify-between gap-3"><div><p className="meta-font text-[9px] font-black uppercase study-muted">{flatConcepts.length} conceptos · contenido ampliado</p><p className="mt-1 text-base font-extrabold study-text">Ruta del módulo</p></div><span className="text-xs font-bold study-accent">{flatIndex + 1}/{flatConcepts.length}</span></div>
          <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 study-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar concepto…" className="min-h-10 w-full rounded-xl border study-line bg-transparent pl-9 pr-3 text-[15px] study-text outline-none" /></div>
          <div className="mt-4 max-h-[78vh] space-y-1.5 overflow-y-auto pr-1">
            {filteredConcepts.map((item) => {
              const index = flatConcepts.findIndex((candidate) => candidate.concept.id === item.concept.id && candidate.topic.id === item.topic.id);
              const active = item.topicIndex === topicIndex && item.conceptIndex === conceptIndex;
              return <button key={`${item.topic.id}-${item.concept.id}`} type="button" onClick={() => selectConcept(item.topicIndex, item.conceptIndex)} className={`w-full rounded-xl px-3 py-3.5 text-left transition ${active ? "study-accent-soft" : "hover:bg-[var(--study-elevated)]"}`}><div className="flex gap-3"><span className={`meta-font mt-0.5 text-[10px] font-black ${active ? "study-accent" : "study-muted"}`}>{String(index + 1).padStart(2,"0")}</span><div className="min-w-0"><p className={`study-topic font-bold ${active ? "study-text" : "study-muted"}`}>{item.concept.title}</p>{active && <p className="mt-1 study-topic-status font-semibold study-accent">En estudio</p>}</div></div></button>;
            })}
          </div>
        </aside>

        <main className="p-5 sm:p-7 lg:p-8 xl:p-10">
          <header className="border-b study-line pb-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3"><p className="meta-font text-[9px] font-black uppercase study-accent">Fundamento · concepto {flatIndex + 1}/{flatConcepts.length}</p><span className="rounded-full border study-line px-2.5 py-1 text-[10px] font-bold study-muted">EN ESTUDIO</span></div>
                <h2 className="mt-4 max-w-5xl text-[clamp(2rem,3.2vw,3.45rem)] font-extrabold leading-[1.02] tracking-[-.045em] study-text">{concept.title}</h2>
                <p className="mt-5 max-w-4xl text-[19px] leading-8 study-text">{concept.easy}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/modulos/${module.slug}/tareas?nueva=1&topicId=${encodeURIComponent(topic.id)}&conceptId=${encodeURIComponent(concept.id)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl study-accent-bg px-3 text-xs font-bold"><ClipboardList className="size-4" /> Crear tarea</Link>
                <Link href={`/modulos/${module.slug}/lector`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border study-line px-3 text-xs font-bold study-text"><BookOpen className="size-4" /> Guía PDF</Link>
              </div>
            </div>
            <div className="study-accent-soft mt-6 rounded-[18px] border study-line p-4 sm:p-5"><p className="meta-font text-[8px] font-black uppercase study-accent">Por qué importa</p><p className="mt-2 study-copy study-muted">{concept.whyItMatters}</p></div>
          </header>

          <section className="border-b study-line py-7">
            <NumberedHeading number="01" eyebrow="Fundamento" title="Cómo funciona de verdad" />
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="study-panel-elevated rounded-[18px] p-5"><p className="text-[16px] font-extrabold study-text">La idea técnica</p><p className="mt-2 study-copy study-muted">{concept.masters}</p></div>
              <div className="study-panel-elevated rounded-[18px] p-5"><p className="text-[16px] font-extrabold study-text">Lo que debes recordar</p><p className="mt-2 study-copy study-muted">{concept.sourceSummary}</p></div>
            </div>
          </section>

          <section className="border-b study-line py-7">
            <NumberedHeading number="02" eyebrow="Caso real" title={realExample?.title || "Aterrízalo al mundo real"} />
            <div className="study-panel-elevated mt-5 rounded-[18px] p-5"><p className="study-copy study-muted">{realExample?.content || concept.applicationAI}</p></div>
          </section>

          <section className="border-b study-line py-7">
            <NumberedHeading number="03" eyebrow="Aplicación" title="Dónde aparece en IA y ciencia de datos" />
            <div className="study-panel-elevated mt-5 rounded-[18px] p-5"><p className="study-copy study-muted">{concept.applicationAI}</p></div>
          </section>

          <section id="concept-audio" className="border-b study-line py-7">
            <NumberedHeading number="04" eyebrow="Audio contextual" title="Escucha solo esta lección" />
            <div className="mt-5"><ConceptAudioPanel moduleId={module.id} topicId={topic.id} conceptId={concept.id} conceptTitle={concept.title} /></div>
          </section>

          <ConceptResourceStrip moduleId={module.id} topicId={topic.id} conceptId={concept.id} />

          {concept.commonMistakes.length > 0 && (
            <section className="border-b study-line py-7">
              <NumberedHeading number="05" eyebrow="Pensamiento de examen" title="Cómo reconocerlo y qué no confundir" />
              <div className="mt-5 space-y-3">
                {concept.commonMistakes.slice(0, 3).map((mistake) => <div key={mistake} className="study-accent-soft rounded-[16px] border study-line p-4"><div className="flex gap-3"><TriangleAlert className="mt-0.5 size-4 shrink-0 study-accent" /><p className="study-copy study-muted">{mistake}</p></div></div>)}
              </div>
            </section>
          )}

          <section className="border-b study-line py-7">
            <NumberedHeading number="06" eyebrow="Comprueba que lo entendiste" title="Caso rápido" />
            <div className="mt-5">
              {experience ? <QuickPractice moduleId={module.id} topicId={topic.id} conceptId={concept.id} experience={experience} onEvaluated={(evaluation) => { void trackLearningProgress(module.id, topic.id, concept.id, "practice", evaluation.score).then(refreshDashboard).catch(() => undefined); }} /> : <div className="study-panel-elevated rounded-[18px] p-5"><p className="study-copy study-muted">{experienceStatus}</p><button type="button" disabled={experienceBusy} onClick={prepareExperience} className="study-accent-bg mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold">{experienceBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Preparar práctica</button></div>}
            </div>
          </section>

          <section className="border-b study-line py-7">
            <NumberedHeading number="07" eyebrow="Active recall" title="Recupera antes de releer" />
            <div className="mt-5"><ActiveRecallCard moduleId={module.id} topicId={topic.id} conceptId={concept.id} conceptTitle={concept.title} due={currentLearningState?.due} onUpdated={refreshDashboard} /></div>
          </section>

          <section className="border-b study-line py-7">
            <NumberedHeading number="08" eyebrow="Laboratorio" title="Experimenta con el concepto" />
            {experience ? <div className="mt-5"><p className="mb-4 study-copy study-muted">{experience.lab.instructions}</p><InteractiveLab lab={experience.lab} onComplete={(score) => { void trackLearningProgress(module.id, topic.id, concept.id, "lab", score).then(refreshDashboard).catch(() => undefined); }} /></div> : <button type="button" disabled={experienceBusy} onClick={prepareExperience} className="study-accent-bg mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold"><FlaskConical className="size-4" /> Preparar laboratorio</button>}
          </section>

          <section className="border-b study-line py-7"><NumberedHeading number="09" eyebrow="Código" title="Convierte la idea en algo programable" /><div className="mt-5"><CodeChallengeCard moduleId={module.id} topicId={topic.id} conceptId={concept.id} conceptTitle={concept.title} /></div></section>

          <section className="border-b study-line py-7"><NumberedHeading number="10" eyebrow="Ayuda contextual" title="No entendí / Tutor" /><div className="mt-5 grid gap-4 xl:grid-cols-2"><ContextTutorPanel moduleId={module.id} topicId={topic.id} conceptId={concept.id} /><SmartNotesPanel moduleId={module.id} topicId={topic.id} conceptId={concept.id} /></div></section>

          <section className="border-b study-line py-7"><NumberedHeading number="11" eyebrow="Proyecto" title="Combina lo aprendido" /><div className="mt-5"><CapstonePanel moduleId={module.id} /></div></section>

          <footer className="flex flex-wrap items-center justify-between gap-3 pt-7">
            <button type="button" onClick={() => moveConcept(-1)} disabled={flatIndex <= 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl border study-line px-4 text-sm font-bold study-muted disabled:opacity-30"><ArrowLeft className="size-4" /> Anterior</button>
            <div className="hidden items-center gap-2 text-xs study-muted sm:flex"><CheckCircle2 className="size-4 text-moss" /> {flatIndex + 1} de {flatConcepts.length}</div>
            <button type="button" onClick={() => moveConcept(1)} disabled={flatIndex >= flatConcepts.length - 1} className="study-accent-bg inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-black disabled:opacity-30">Siguiente <ArrowRight className="size-4" /></button>
          </footer>
        </main>
      </div>
    </section>
  );
}
