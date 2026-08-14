"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, FlaskConical, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { generateConceptExperience, getConceptExperience } from "@/lib/experience-api";
import type { ConceptExperience, LabSpec, LogicOperator } from "@/lib/experience/types";
import { getLearningManifest } from "@/lib/learning-api";
import type { LearningManifest, LearningTopic } from "@/lib/pedagogy/types";

function logicValue(operator: LogicOperator, a: boolean, b: boolean) {
  if (operator === "and") return a && b;
  if (operator === "or") return a || b;
  if (operator === "implies") return !a || b;
  if (operator === "xor") return a !== b;
  return !a;
}

function valueLabel(value: boolean) { return value ? "VERDADERO" : "FALSO"; }

function LogicSwitchLab({ lab }: { lab: LabSpec }) {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const operator = lab.operator ?? "and";
  const result = logicValue(operator, a, b);
  const propositions = lab.propositions.slice(0, 2);
  const labels = propositions.length ? propositions : [{ id: "p", label: "p", description: "Primera proposición" }, { id: "q", label: "q", description: "Segunda proposición" }];

  return <div className="rule-grid border border-line bg-surface p-5 sm:p-7">
    <div className="grid gap-5 sm:grid-cols-2">
      {labels.map((prop, index) => {
        const value = index === 0 ? a : b;
        if (operator === "not" && index > 0) return null;
        return <button key={prop.id} type="button" onClick={() => index === 0 ? setA((v) => !v) : setB((v) => !v)} className="focus-ring border border-line-strong bg-surface p-4 text-left hover:border-accent">
          <span className="meta-font text-[9px] font-bold uppercase text-muted">{prop.label}</span>
          <span className="mt-2 block text-sm font-bold text-ink">{prop.description}</span>
          <span className={`mt-4 inline-flex min-h-10 items-center border px-3 text-xs font-bold ${value ? "border-moss bg-moss-soft text-moss" : "border-line-strong text-muted"}`}>{valueLabel(value)}</span>
        </button>;
      })}
    </div>
    <div className="mt-6 border-t-2 border-ink pt-5 text-center">
      <p className="meta-font text-[9px] font-bold uppercase text-muted">Expresión</p>
      <p className="display-font mt-2 text-3xl">{lab.expression || `${labels[0]?.label ?? "p"} ${operator.toUpperCase()} ${labels[1]?.label ?? "q"}`}</p>
      <p className={`mt-4 text-2xl font-black ${result ? "text-moss" : "text-accent"}`}>{valueLabel(result)}</p>
      <p className="mt-2 text-xs text-muted">Cambia los estados y observa qué condición hace cambiar el resultado.</p>
    </div>
  </div>;
}

function TruthTableLab({ lab }: { lab: LabSpec }) {
  const operator = lab.operator ?? "and";
  const props = lab.propositions.slice(0, operator === "not" ? 1 : 2);
  const labels = props.length ? props : [{ id: "p", label: "p", description: "p" }, { id: "q", label: "q", description: "q" }];
  const rows = operator === "not" ? [[true], [false]] : [[true, true], [true, false], [false, true], [false, false]];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  function expected(row: boolean[]) { return logicValue(operator, row[0], row[1] ?? false); }
  const correctCount = rows.filter((row, index) => answers[index] === String(expected(row))).length;

  return <div className="border border-line bg-surface">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead className="bg-canvas"><tr>{labels.map((prop) => <th key={prop.id} className="border-b border-r border-line px-4 py-3 text-left meta-font text-[9px] uppercase">{prop.label}</th>)}<th className="border-b border-line px-4 py-3 text-left meta-font text-[9px] uppercase">{lab.expression || "Resultado"}</th></tr></thead>
        <tbody>{rows.map((row, index) => {
          const expectedValue = expected(row);
          const answer = answers[index];
          const isRight = answer === String(expectedValue);
          return <tr key={index} className="border-b border-line last:border-b-0">
            {row.map((value, cell) => <td key={cell} className="border-r border-line px-4 py-4 font-bold">{value ? "V" : "F"}</td>)}
            <td className="px-4 py-3"><select aria-label={`Resultado fila ${index + 1}`} value={answer ?? ""} onChange={(event) => { setChecked(false); setAnswers((current) => ({ ...current, [index]: event.target.value })); }} className={`focus-ring min-h-11 border bg-surface px-3 text-sm font-bold ${checked ? isRight ? "border-moss text-moss" : "border-warn text-warn" : "border-line-strong"}`}><option value="">?</option><option value="true">V</option><option value="false">F</option></select>{checked && !isRight && <span className="ml-3 text-xs text-warn">Correcto: {expectedValue ? "V" : "F"}</span>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4"><p className="text-sm text-muted">{checked ? `${correctCount}/${rows.length} filas correctas.` : "Completa todas las filas antes de comprobar."}</p><button type="button" onClick={() => setChecked(true)} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent"><Check className="size-3.5" aria-hidden="true" /> Comprobar tabla</button></div>
  </div>;
}

function MatchingLab({ lab }: { lab: LabSpec }) {
  const rights = useMemo(() => [...lab.matchingPairs].reverse().map((pair) => pair.right), [lab.matchingPairs]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const correct = lab.matchingPairs.filter((pair) => answers[pair.id] === pair.right).length;
  return <div className="border-y border-line">
    {lab.matchingPairs.map((pair, index) => <div key={pair.id} className="grid gap-3 border-b border-line py-4 last:border-b-0 sm:grid-cols-[32px_minmax(0,1fr)_minmax(220px,0.8fr)] sm:items-center"><span className="display-font text-xl text-accent">{String(index + 1).padStart(2, "0")}</span><p className="text-sm font-bold">{pair.left}</p><select value={answers[pair.id] ?? ""} onChange={(event) => { setChecked(false); setAnswers((current) => ({ ...current, [pair.id]: event.target.value })); }} className={`focus-ring min-h-11 border bg-surface px-3 text-sm ${checked ? answers[pair.id] === pair.right ? "border-moss" : "border-warn" : "border-line-strong"}`}><option value="">Selecciona relación…</option>{rights.map((right) => <option key={right} value={right}>{right}</option>)}</select></div>)}
    <div className="flex flex-wrap items-center justify-between gap-3 py-4"><p className="text-sm text-muted">{checked ? `${correct}/${lab.matchingPairs.length} asociaciones correctas.` : "Relaciona cada elemento con su definición o propiedad."}</p><button type="button" onClick={() => setChecked(true)} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white"><Check className="size-3.5" /> Comprobar</button></div>
  </div>;
}

function SequenceLab({ lab }: { lab: LabSpec }) {
  const initial = useMemo(() => [...lab.sequenceItems].sort((a, b) => b.order - a.order), [lab.sequenceItems]);
  const [items, setItems] = useState(initial);
  const [checked, setChecked] = useState(false);
  function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; setItems(next); setChecked(false); }
  const correct = items.every((item, index) => item.order === index + 1);
  return <div className="border-y border-line">{items.map((item, index) => <div key={item.id} className="grid grid-cols-[36px_minmax(0,1fr)_92px] items-center gap-3 border-b border-line py-3"><span className="display-font text-xl text-accent">{String(index + 1).padStart(2, "0")}</span><p className="text-sm font-bold leading-6">{item.label}</p><div className="flex justify-end gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" className="focus-ring grid size-11 place-items-center border border-line-strong disabled:opacity-30"><ArrowUp className="size-4" /></button><button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar" className="focus-ring grid size-11 place-items-center border border-line-strong disabled:opacity-30"><ArrowDown className="size-4" /></button></div></div>)}<div className="flex flex-wrap items-center justify-between gap-3 py-4"><p className={`text-sm ${checked ? correct ? "text-moss" : "text-warn" : "text-muted"}`}>{checked ? correct ? "Secuencia correcta." : "El orden todavía no representa correctamente el proceso." : "Reordena los pasos hasta reconstruir el mecanismo."}</p><button type="button" onClick={() => setChecked(true)} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white"><Check className="size-3.5" /> Comprobar</button></div></div>;
}

function CodePredictionLab({ lab }: { lab: LabSpec }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  return <div><pre className="overflow-x-auto border border-ink bg-ink p-5 text-sm leading-6 text-white"><code>{lab.codeSnippet}</code></pre><p className="mt-5 text-sm font-bold leading-6">{lab.codeQuestion}</p><div className="mt-3 grid gap-2">{lab.codeOptions.map((option, index) => <button key={`${option}-${index}`} type="button" onClick={() => { setChoice(index); setChecked(false); }} className={`focus-ring min-h-12 border px-4 text-left text-sm ${choice === index ? "border-ink bg-surface-strong font-bold" : "border-line-strong bg-surface"}`}>{String.fromCharCode(65 + index)} · {option}</button>)}</div>{checked && <div className={`mt-4 border-l-4 p-4 text-sm ${choice === lab.codeAnswerIndex ? "border-moss bg-moss-soft/45" : "border-warn bg-accent-soft/35"}`}>{choice === lab.codeAnswerIndex ? "Predicción correcta." : `Revisa el flujo. La opción correcta es ${lab.codeAnswerIndex === null ? "la indicada" : String.fromCharCode(65 + lab.codeAnswerIndex)}.`}</div>}<button type="button" disabled={choice === null} onClick={() => setChecked(true)} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white disabled:opacity-40"><Check className="size-3.5" /> Comprobar</button></div>;
}

function LabRenderer({ lab }: { lab: LabSpec }) {
  if (lab.type === "logic_switch") return <LogicSwitchLab lab={lab} />;
  if (lab.type === "truth_table") return <TruthTableLab lab={lab} />;
  if (lab.type === "matching") return <MatchingLab lab={lab} />;
  if (lab.type === "sequence") return <SequenceLab lab={lab} />;
  return <CodePredictionLab lab={lab} />;
}

function TopicConceptPicker({ manifest, topicIndex, conceptIndex, setTopicIndex, setConceptIndex }: { manifest: LearningManifest; topicIndex: number; conceptIndex: number; setTopicIndex: (value: number) => void; setConceptIndex: (value: number) => void }) {
  const topic = manifest.topics[topicIndex];
  return <div className="grid gap-3 border-y border-line py-4 md:grid-cols-2"><label className="text-xs font-bold text-muted">Tema<select value={topicIndex} onChange={(event) => { setTopicIndex(Number(event.target.value)); setConceptIndex(0); }} className="focus-ring mt-2 min-h-12 w-full border border-line-strong bg-surface px-3 text-base font-medium text-ink">{manifest.topics.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} · {item.title}</option>)}</select></label><label className="text-xs font-bold text-muted">Concepto<select value={conceptIndex} onChange={(event) => setConceptIndex(Number(event.target.value))} className="focus-ring mt-2 min-h-12 w-full border border-line-strong bg-surface px-3 text-base font-medium text-ink">{topic.concepts.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} · {item.title}</option>)}</select></label></div>;
}

export function LabView() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [manifest, setManifest] = useState<LearningManifest | null>(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [conceptIndex, setConceptIndex] = useState(0);
  const [queryApplied, setQueryApplied] = useState(false);
  const [experience, setExperience] = useState<ConceptExperience | null>(null);
  const [status, setStatus] = useState("Cargando…");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!studyModule) return; getLearningManifest(studyModule.id).then((record) => { if (record.status === "ready" && record.manifest) { setManifest(record.manifest); setStatus(""); } else setStatus("Primero genera el Learning Manifest del módulo."); }).catch((error) => setStatus(error instanceof Error ? error.message : "No se pudo cargar el módulo.")); }, [studyModule]);
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
    setExperience(null); setStatus("Buscando experiencia…");
    getConceptExperience(studyModule.id, topic.id, concept.id).then((record) => { if (record.status === "ready" && record.experience) { setExperience(record.experience); setStatus(""); } else setStatus(record.status === "error" ? record.generationError || "La experiencia requiere atención." : "Este concepto todavía no tiene laboratorio preparado."); }).catch((error) => setStatus(error instanceof Error ? error.message : "No se pudo cargar la experiencia."));
  }, [studyModule, topic, concept]);

  async function generate() { if (!studyModule || !topic || !concept) return; setBusy(true); setStatus("La IA está eligiendo la experiencia que mejor encaja con el concepto…"); try { await generateConceptExperience(studyModule.id, topic.id, concept.id); const record = await getConceptExperience(studyModule.id, topic.id, concept.id); setExperience(record.experience ?? null); setStatus(record.experience ? "" : "No se recibió la experiencia."); } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo generar la experiencia."); } finally { setBusy(false); } }

  if (!studyModule) return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <><h1 className="display-font text-4xl">Módulo no encontrado.</h1><Link href="/biblioteca" className="mt-5 inline-flex min-h-11 items-center font-bold text-accent">Volver a Biblioteca</Link></> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;
  if (!manifest || !topic || !concept) return <div className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 lg:px-10"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted"><ArrowLeft className="size-4" /> Volver</Link><div className="paper-sheet mt-6 border border-line p-6"><h1 className="display-font text-4xl">Laboratorio todavía no disponible.</h1><p className="mt-3 text-base leading-7 text-muted">{status}</p></div></div>;

  return <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
    <header className="border-b-2 border-ink pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/modulos/${studyModule.slug}`} className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" /> Ficha del módulo</Link><div className="flex gap-2"><Link href={`/modulos/${studyModule.slug}/aprende`} className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-3 text-xs font-bold text-muted">Aprende</Link><Link href={`/modulos/${studyModule.slug}/practica`} className="focus-ring inline-flex min-h-11 items-center border border-line-strong px-3 text-xs font-bold text-muted">Practica</Link></div></div><p className="meta-font mt-4 text-[9px] font-bold uppercase text-accent">Laboratorio · aprendizaje activo</p><h1 className="display-font mt-2 text-4xl leading-none sm:text-5xl">Experimenta antes de memorizar.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-muted">La IA selecciona una experiencia del registro controlado de Maestría Lab según el concepto. La interfaz ejecuta el laboratorio; la IA no genera HTML arbitrario.</p></header>

    <TopicConceptPicker manifest={manifest} topicIndex={topicIndex} conceptIndex={conceptIndex} setTopicIndex={setTopicIndex} setConceptIndex={setConceptIndex} />

    <section className="mt-7">
      <div className="grid gap-5 border-b border-line pb-5 lg:grid-cols-[minmax(0,1fr)_220px]"><div><p className="meta-font text-[9px] font-bold uppercase text-muted">{topic.title}</p><h2 className="display-font mt-2 text-3xl sm:text-4xl">{experience?.lab.title || concept.title}</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{experience?.lab.objective || concept.whyItMatters}</p></div><div className="border-l-2 border-accent pl-4"><p className="meta-font text-[9px] font-bold uppercase text-accent">Protocolo</p><p className="mt-2 text-sm font-bold">{experience ? experience.lab.type.replaceAll("_", " ") : "Pendiente"}</p><p className="mt-2 text-xs leading-5 text-muted">Dificultad {experience?.lab.difficulty ?? "—"}/3</p></div></div>

      {!experience ? <div className="paper-sheet mt-6 border border-line p-6 sm:p-8"><div className="flex items-start gap-3"><FlaskConical className="mt-1 size-5 text-accent" /><div><h3 className="display-font text-2xl">Prepara el experimento para este concepto.</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{status}</p></div></div><button type="button" disabled={busy} onClick={generate} className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {busy ? "Diseñando laboratorio…" : "Generar laboratorio + práctica"}</button></div> : <>
        <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="border-l-2 border-moss pl-4"><p className="meta-font text-[9px] font-bold uppercase text-moss">Instrucciones</p><p className="mt-3 text-sm leading-6 text-muted">{experience.lab.instructions}</p><p className="meta-font mt-5 text-[8px] uppercase text-muted">Nota de estudio</p><p className="mt-2 text-xs leading-5 text-muted">{experience.studyNote}</p></aside><div className="min-w-0"><LabRenderer lab={experience.lab} /></div></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><p className="text-xs text-muted">¿El laboratorio no encaja bien? Puedes regenerar la experiencia sin alterar el Manifest.</p><button type="button" disabled={busy} onClick={generate} className="focus-ring inline-flex min-h-11 items-center gap-2 text-xs font-bold text-muted hover:text-accent disabled:opacity-50"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> Regenerar experiencia</button></div>
      </>}
    </section>
  </div>;
}
