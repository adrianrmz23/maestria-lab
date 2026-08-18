"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Code2, LoaderCircle, Rocket, Sparkles } from "lucide-react";
import { evaluateCapstoneProject, generateCapstoneProject, getCapstoneProjects } from "@/lib/learning-engine-api";
import type { CapstoneProjectRecord } from "@/lib/learning-engine/types";

export function CapstonePanel({ moduleId }: { moduleId: string }) {
  const [project, setProject] = useState<CapstoneProjectRecord | null>(null);
  const [submission, setSubmission] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCapstoneProjects(moduleId).then((result) => { if (!cancelled) setProject(result.projects[0] ?? null); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [moduleId]);

  async function generate() {
    setBusy(true); setMessage("");
    try { setProject(await generateCapstoneProject(moduleId)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo generar el proyecto."); }
    finally { setBusy(false); }
  }

  async function evaluate() {
    if (!project || !submission.trim()) return;
    setBusy(true); setMessage("");
    try { setProject(await evaluateCapstoneProject(moduleId, project.id, submission.trim())); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo evaluar el proyecto."); }
    finally { setBusy(false); }
  }

  return (
    <section className="study-panel-elevated rounded-[18px] p-5">
      <div className="flex items-center gap-2 study-accent"><Rocket className="size-4" /><p className="meta-font text-[8px] font-black uppercase">Proyecto integrador</p></div>
      {!project ? <><p className="mt-2 text-sm leading-6 study-muted">Genera un reto profesional que combine varios conceptos del módulo.</p><button type="button" onClick={generate} disabled={busy} className="study-accent-bg mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generar proyecto</button></> : <div className="mt-3"><p className="text-base font-black study-text">{project.project.title}</p><p className="mt-2 text-sm leading-6 study-muted">{project.project.scenario}</p><div className="mt-3 rounded-xl border study-line p-3"><p className="meta-font text-[8px] font-black uppercase study-accent">Objetivo</p><p className="mt-1 text-sm leading-6 study-text">{project.project.objective}</p></div><div className="mt-3"><p className="meta-font text-[8px] font-black uppercase study-muted">Entregables</p><ul className="mt-1 space-y-1 text-sm leading-6 study-muted">{project.project.deliverables.slice(0,4).map((item) => <li key={item}>— {item}</li>)}</ul></div>{!project.evaluation && <><textarea value={submission} onChange={(event) => setSubmission(event.target.value)} rows={4} placeholder="Pega aquí tu propuesta, razonamiento o código…" className="mt-3 w-full rounded-xl border study-line bg-transparent px-3 py-3 text-sm leading-6 study-text outline-none" /><button type="button" onClick={evaluate} disabled={busy || !submission.trim()} className="study-accent-bg mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Code2 className="size-4" />} Evaluar entrega</button></>}{project.evaluation && <div className="mt-3 rounded-xl border study-line p-3"><div className="flex items-center justify-between gap-2 text-moss"><span className="inline-flex items-center gap-1 text-xs font-black"><CheckCircle2 className="size-3.5" /> Evaluado</span><strong>{project.evaluation.score}/100</strong></div><p className="mt-2 text-xs leading-5 study-text">{project.evaluation.verdict}</p><p className="mt-2 text-xs font-bold text-moss">Siguiente paso: {project.evaluation.nextStep}</p></div>}</div>}
      {message && <p className="mt-2 text-xs font-bold text-warn">{message}</p>}
    </section>
  );
}
