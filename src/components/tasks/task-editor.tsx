"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FilePlus2, LoaderCircle, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react";
import { addAcademicTaskAttachment, getAcademicTask, removeAcademicTaskAttachment, runAcademicTaskAction, saveAcademicTaskContent, updateAcademicTask } from "@/lib/tasks-api";
import { exportTaskDocx, exportTaskMarkdown, exportTaskPdf, exportTaskPptx, exportVisualPng } from "@/lib/tasks/export";
import type { AcademicTaskRecord, AcademicTaskVersion, TaskOutput, TaskProviderStatus } from "@/lib/tasks/types";
import { TaskVisualCanvas } from "@/components/tasks/task-visual-canvas";

type Detail = {
  task: AcademicTaskRecord;
  versions: AcademicTaskVersion[];
  sources: Array<{ id: string; name: string; mime_type: string | null; metadata: Record<string, unknown>; created_at: string }>;
  providers: TaskProviderStatus[];
};

const statusLabel: Record<AcademicTaskRecord["status"], string> = {
  draft: "Borrador",
  generating: "Generando",
  ready: "Listo",
  reviewing: "Revisando",
  completed: "Finalizado",
  error: "Requiere atención",
};

function cloneOutput(output: TaskOutput): TaskOutput {
  return JSON.parse(JSON.stringify(output)) as TaskOutput;
}

export function TaskEditor({ moduleId, initial, onChanged, onDelete }: { moduleId: string; initial: Detail; onChanged?: (detail: Detail) => void; onDelete?: () => void }) {
  const [detail, setDetail] = useState(initial);
  const [content, setContent] = useState<TaskOutput | null>(initial.task.latestVersion?.content ? cloneOutput(initial.task.latestVersion.content) : null);
  const [busy, setBusy] = useState<"generate" | "review" | "reinterpret" | "save" | "upload" | "export" | null>(null);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [viewingVersionNumber, setViewingVersionNumber] = useState(initial.task.currentVersion);

  useEffect(() => {
    setDetail(initial);
    setContent(initial.task.latestVersion?.content ? cloneOutput(initial.task.latestVersion.content) : null);
    setDirty(false);
    setViewingVersionNumber(initial.task.currentVersion);
    setMessage("");
  }, [initial.task.id, initial.task.currentVersion]);

  const currentVersion = detail.versions.find((version) => version.versionNumber === viewingVersionNumber) || detail.versions.find((version) => version.versionNumber === detail.task.currentVersion) || detail.versions[0] || null;
  const providerTrace = currentVersion?.providerTrace || [];
  const review = currentVersion?.review || null;

  async function refresh() {
    const next = await getAcademicTask(moduleId, detail.task.id);
    setDetail(next);
    setContent(next.task.latestVersion?.content ? cloneOutput(next.task.latestVersion.content) : null);
    setDirty(false);
    setViewingVersionNumber(next.task.currentVersion);
    onChanged?.(next);
    return next;
  }

  async function run(action: "generate" | "review" | "reinterpret") {
    setBusy(action);
    setMessage("");
    try {
      await runAcademicTaskAction(moduleId, detail.task.id, action);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la acción.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!content) return;
    setBusy("save");
    setMessage("");
    try {
      await saveAcademicTaskContent(moduleId, detail.task.id, content);
      await refresh();
      setMessage("Nueva versión guardada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la versión.");
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File | null) {
    if (!file) return;
    setBusy("upload");
    setMessage("");
    try {
      await addAcademicTaskAttachment(moduleId, detail.task.id, file);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo adjuntar el archivo.");
    } finally {
      setBusy(null);
    }
  }

  async function removeSource(sourceId: string) {
    try {
      await removeAcademicTaskAttachment(moduleId, detail.task.id, sourceId);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar el archivo.");
    }
  }

  async function toggleCompleted() {
    setMessage("");
    try {
      await updateAcademicTask(moduleId, detail.task.id, { status: detail.task.status === "completed" ? "ready" : "completed" });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    }
  }

  async function exportAction(kind: "docx" | "pdf" | "pptx" | "png" | "md") {
    if (!content) return;
    setBusy("export");
    setMessage("");
    try {
      if (kind === "docx") await exportTaskDocx(content);
      if (kind === "pdf") await exportTaskPdf(content);
      if (kind === "pptx") await exportTaskPptx(content);
      if (kind === "png") await exportVisualPng(content);
      if (kind === "md") exportTaskMarkdown(content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo exportar.");
    } finally {
      setBusy(null);
    }
  }

  function patchContent(patch: Partial<TaskOutput>) {
    if (!content) return;
    setContent({ ...content, ...patch });
    setDirty(true);
  }

  const reviewColor = useMemo(() => {
    const score = review?.score ?? 0;
    if (score >= 90) return "text-moss";
    if (score >= 75) return "text-accent";
    return "text-warn";
  }, [review?.score]);

  return (
    <div className="space-y-5">
      <section className="lab-card rounded-[22px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black uppercase text-accent">{statusLabel[detail.task.status]}</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-bold uppercase text-muted">{detail.task.taskType.replaceAll("_", " ")}</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-bold uppercase text-muted">{detail.task.workMode === "guided" ? "Hazlo conmigo" : "Generar borrador"}</span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{detail.task.title}</h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-muted">{detail.task.instructions}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => run("generate")} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-45">
              {busy === "generate" ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />} {detail.task.currentVersion ? "Regenerar" : "Generar tarea"}
            </button>
            {detail.task.currentVersion > 0 && (
              <button type="button" onClick={() => run("review")} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-ink disabled:opacity-45">
                {busy === "review" ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4 text-moss" />} Revisar
              </button>
            )}
            {detail.task.currentVersion > 0 && <button type="button" onClick={toggleCompleted} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-ink"><CheckCircle2 className="size-4 text-moss" /> {detail.task.status === "completed" ? "Reabrir" : "Finalizar"}</button>}
            <button type="button" onClick={onDelete} className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-warn" aria-label="Eliminar tarea"><Trash2 className="size-4" /></button>
          </div>
        </div>

        {providerTrace.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {providerTrace.map((trace, index) => <span key={`${trace.role}-${index}`} className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-[11px] text-muted"><strong className="text-ink">{trace.role}</strong> · {trace.provider} · {trace.model}</span>)}
          </div>
        )}
      </section>

      {detail.task.requirements && (
        <section className="lab-card rounded-[22px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-accent"><Sparkles className="size-4" /><p className="meta-font text-[9px] font-black uppercase">Así entendí la consigna</p></div>
            {detail.sources.length > 0 && <button type="button" onClick={() => run("reinterpret")} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink disabled:opacity-45">{busy === "reinterpret" ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Releer con archivos</button>}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-surface-strong p-4"><p className="text-xs font-bold text-muted">Tema</p><p className="mt-1 text-sm font-semibold text-ink">{detail.task.requirements.theme}</p></div>
            <div className="rounded-2xl bg-surface-strong p-4"><p className="text-xs font-bold text-muted">Extensión</p><p className="mt-1 text-sm font-semibold text-ink">{detail.task.requirements.length || "No especificada"}</p></div>
            <div className="rounded-2xl bg-surface-strong p-4"><p className="text-xs font-bold text-muted">Formato</p><p className="mt-1 text-sm font-semibold text-ink">{detail.task.requirements.format || "No especificado"}</p></div>
            <div className="rounded-2xl bg-surface-strong p-4"><p className="text-xs font-bold text-muted">Citas</p><p className="mt-1 text-sm font-semibold text-ink">{detail.task.requirements.citationStyle || "No especificadas"}</p></div>
          </div>
          {(detail.task.requirements.requiredElements.length > 0 || detail.task.requirements.ambiguities.length > 0) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div><p className="text-sm font-bold text-ink">Debe incluir</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted">{detail.task.requirements.requiredElements.map((item) => <li key={item}>— {item}</li>)}</ul></div>
              <div><p className="text-sm font-bold text-ink">Puntos a revisar</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted">{detail.task.requirements.ambiguities.length ? detail.task.requirements.ambiguities.map((item) => <li key={item}>— {item}</li>) : <li>— La consigna quedó suficientemente clara.</li>}</ul></div>
            </div>
          )}
        </section>
      )}

      <section className="lab-card rounded-[22px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="meta-font text-[9px] font-black uppercase text-muted">Fuentes adicionales</p>
            <h3 className="mt-1 text-lg font-extrabold text-ink">Rúbrica, instrucciones o material extra</h3>
            <p className="mt-1 text-sm text-muted">Admite PDF, DOCX, TXT, MD y capturas PNG/JPG/WEBP. El contenido se interpreta y se usa solo en esta tarea.</p>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink">
            {busy === "upload" ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />} Adjuntar archivo
            <input type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp" className="sr-only" disabled={Boolean(busy)} onChange={(event) => { void upload(event.target.files?.[0] || null); event.currentTarget.value = ""; }} />
          </label>
        </div>
        {detail.sources.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{detail.sources.map((source) => <span key={source.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-strong px-3 py-2 text-xs font-semibold text-ink"><FilePlus2 className="size-3.5 text-accent" /> {source.name}<button type="button" onClick={() => removeSource(source.id)} className="text-muted hover:text-warn" aria-label={`Eliminar ${source.name}`}>×</button></span>)}</div> : <p className="mt-4 text-sm text-muted">No has agregado archivos adicionales.</p>}
      </section>

      {!content && (
        <section className="rounded-[22px] border border-dashed border-line-strong bg-surface p-8 text-center">
          <Sparkles className="mx-auto size-7 text-accent" />
          <h3 className="mt-3 text-xl font-extrabold text-ink">La consigna está lista para generar.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">Puedes adjuntar una rúbrica o material adicional antes de generar. Academic Task Studio usará el documento del módulo y las fuentes que elegiste.</p>
          <button type="button" onClick={() => run("generate")} disabled={Boolean(busy)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white disabled:opacity-45">{busy === "generate" ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />} Generar ahora</button>
        </section>
      )}

      {content && (
        <>
          <section className="lab-card rounded-[22px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="meta-font text-[9px] font-black uppercase text-accent">Editor de entrega</p>
                <p className="mt-1 text-sm text-muted">Edita directamente. Guardar crea una versión nueva y conserva las anteriores.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={!dirty || Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-3 text-sm font-bold text-white disabled:opacity-35">{busy === "save" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar versión</button>
                <button type="button" onClick={() => void exportAction("docx")} disabled={busy === "export"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink"><Download className="size-3.5" /> DOCX</button>
                <button type="button" onClick={() => void exportAction("pdf")} disabled={busy === "export"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink">PDF</button>
                <button type="button" onClick={() => void exportAction("md")} disabled={busy === "export"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink">MD</button>
                {content.taskType === "presentation" && <button type="button" onClick={() => void exportAction("pptx")} disabled={busy === "export"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink">PPTX</button>}
                {content.visual.enabled && <button type="button" onClick={() => void exportAction("png")} disabled={busy === "export"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink">PNG</button>}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <input value={content.title} onChange={(event) => patchContent({ title: event.target.value })} className="w-full border-0 bg-transparent p-0 text-3xl font-extrabold tracking-[-.025em] text-ink outline-none" aria-label="Título" />
              <input value={content.subtitle} onChange={(event) => patchContent({ subtitle: event.target.value })} className="w-full border-0 bg-transparent p-0 text-base text-muted outline-none" aria-label="Subtítulo" />
              <textarea value={content.introduction} onChange={(event) => patchContent({ introduction: event.target.value })} rows={5} className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-[16px] leading-7 text-ink" aria-label="Introducción" />

              {content.sections.map((section, index) => (
                <article key={section.id} className="rounded-[20px] border border-line bg-surface p-4 sm:p-5">
                  <div className="flex items-center gap-3"><span className="meta-font text-[9px] font-black text-accent">{String(index + 1).padStart(2, "0")}</span><input value={section.heading} onChange={(event) => { const sections = content.sections.map((item) => item.id === section.id ? { ...item, heading: event.target.value } : item); patchContent({ sections }); }} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-extrabold text-ink outline-none" /></div>
                  <textarea value={section.body} onChange={(event) => { const sections = content.sections.map((item) => item.id === section.id ? { ...item, body: event.target.value } : item); patchContent({ sections }); }} rows={Math.max(4, Math.min(14, Math.ceil(section.body.length / 110)))} className="mt-3 w-full resize-y border-0 bg-transparent p-0 text-[16px] leading-8 text-ink outline-none" />
                  {section.sourceRefs.length > 0 && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">{section.sourceRefs.map((ref, refIndex) => <span key={`${ref.label}-${refIndex}`} className="rounded-full bg-surface-strong px-2.5 py-1 text-[11px] text-muted">{ref.kind === "web" ? ref.label : `${ref.label}${ref.pageNumber ? ` · pág. ${ref.pageNumber}` : ""}`}</span>)}</div>}
                </article>
              ))}

              {content.visual.enabled && <TaskVisualCanvas visual={content.visual} editable onChange={(visual) => patchContent({ visual })} />}

              <div>
                <p className="text-sm font-extrabold text-ink">Conclusión</p>
                <textarea value={content.conclusion} onChange={(event) => patchContent({ conclusion: event.target.value })} rows={5} className="mt-2 w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-[16px] leading-7 text-ink" />
              </div>
            </div>
          </section>

          {review && (
            <section className="lab-card rounded-[22px] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="meta-font text-[9px] font-black uppercase text-moss">Inspector académico</p><h3 className="mt-2 text-xl font-extrabold text-ink">{review.verdict}</h3></div>
                <div className="text-right"><p className={`text-4xl font-black ${reviewColor}`}>{review.score}</p><p className="text-xs font-bold text-muted">/ 100</p></div>
              </div>
              {review.rubricItems.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-2">{review.rubricItems.map((item) => <div key={item.criterion} className="rounded-2xl bg-surface-strong p-4"><div className="flex justify-between gap-3"><p className="text-sm font-extrabold text-ink">{item.criterion}</p><span className="text-sm font-black text-accent">{item.score}/{item.maxScore}</span></div><p className="mt-2 text-sm leading-6 text-muted">{item.feedback}</p></div>)}</div>}
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div><p className="text-sm font-extrabold text-ink">Fortalezas</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted">{review.strengths.map((item) => <li key={item}>— {item}</li>)}</ul></div>
                <div><p className="text-sm font-extrabold text-ink">Mejoras</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted">{review.improvements.map((item) => <li key={item}>— {item}</li>)}</ul></div>
                <div><p className="text-sm font-extrabold text-ink">Sin respaldo suficiente</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted">{review.unsupportedClaims.length ? review.unsupportedClaims.map((item) => <li key={item}>— {item}</li>) : <li>— No se detectaron afirmaciones importantes sin respaldo.</li>}</ul></div>
              </div>
            </section>
          )}

          <section className="lab-card rounded-[22px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="meta-font text-[9px] font-black uppercase text-muted">Historial</p><h3 className="mt-1 text-lg font-extrabold text-ink">Versiones</h3></div><RefreshCw className="size-4 text-muted" /></div>
            <div className="mt-4 flex flex-wrap gap-2">{detail.versions.map((version) => <button key={version.id} type="button" onClick={() => { setViewingVersionNumber(version.versionNumber); setContent(cloneOutput(version.content)); setDirty(false); }} className={`rounded-full border px-3 py-2 text-xs font-bold ${version.versionNumber === viewingVersionNumber ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted"}`}>v{version.versionNumber} · {new Date(version.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}{version.versionNumber === detail.task.currentVersion ? " · actual" : ""}</button>)}</div>
          </section>
        </>
      )}

      {detail.task.generationError && <p className="rounded-2xl border border-warn/25 bg-surface p-4 text-sm font-semibold text-warn">{detail.task.generationError}</p>}
      {message && <p className="rounded-2xl border border-line bg-surface p-4 text-sm font-semibold text-ink">{message}</p>}
    </div>
  );
}
