"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Archive, ArrowRight, BookOpen, ChevronLeft, ClipboardList, Pencil, Play, RotateCcw, Settings2, Trash2, X } from "lucide-react";
import { AudioSummaryPanel } from "@/components/audio-summary-panel";
import { DocumentPanel } from "@/components/document-panel";
import { LearningManifestPanel } from "@/components/learning-manifest-panel";
import { StudyWorkspace } from "@/components/study-workspace";
import { ModuleResourceHub } from "@/components/resources/module-resource-hub";
import { useModules } from "@/components/module-provider";

function ModuleOrbit() {
  return (
    <div className="relative mx-auto size-[250px] max-w-full" aria-hidden="true">
      <div className="lab-orbit absolute inset-0 rounded-full" />
      <div className="absolute inset-[34px] rounded-full border border-dashed border-accent/30" />
      <div className="absolute inset-[72px] rounded-full border border-dashed border-accent/40" />
      <div className="absolute left-1/2 top-1/2 grid size-[88px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[26px] bg-gradient-to-br from-[#0f6cbd] to-[#12a7a0] text-center text-white shadow-[0_20px_48px_rgba(15,108,189,.30)]"><div><p className="text-xl font-black">ML</p><p className="meta-font mt-1 text-[7px] uppercase text-white/75">MODULE</p></div></div>
      <span className="absolute left-1/2 top-[5%] -translate-x-1/2 rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-bold text-ink">TEORÍA</span>
      <span className="absolute right-[1%] top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-bold text-ink">LAB</span>
      <span className="absolute bottom-[5%] left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-bold text-ink">AUDIO</span>
      <span className="absolute left-[1%] top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-bold text-ink">PRÁCTICA</span>
    </div>
  );
}

export function ModuleDetailView() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { modules, hydrated, updateModule, archiveModule, restoreModule, removeModule } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [editing, setEditing] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);

  if (!studyModule) {
    return <div className="app-frame py-12">{hydrated ? <><h1 className="display-font text-4xl">Módulo no encontrado.</h1><Link href="/biblioteca" className="mt-5 inline-flex items-center font-bold text-accent">Volver a Biblioteca</Link></> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;
  }

  const archived = studyModule.status === "Archivado";
  const setupOpen = !studyModule.sourceDocument || studyModule.sourceDocument.extractionStatus !== "ready";

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateModule(studyModule!.id, {
      title: String(form.get("title") || ""),
      subject: String(form.get("subject") || ""),
      description: String(form.get("description") || ""),
    });
    setEditing(false);
  }

  async function onDelete() {
    const confirmed = window.confirm(`¿Eliminar definitivamente “${studyModule!.title}”? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    await removeModule(studyModule!.id);
    router.push("/biblioteca");
  }

  return (
    <div className="app-frame py-6 lg:py-8">
      <section className="lab-hero lab-enter grid gap-6 rounded-[26px] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:p-9">
        <div>
          <Link href="/biblioteca" className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted hover:text-ink"><ChevronLeft className="size-4" /> Biblioteca</Link>
          <p className="meta-font mt-5 inline-flex rounded-full bg-[#0b4167] px-3 py-1.5 text-[9px] font-black uppercase text-[#d7efff]">{studyModule.subject}</p>
          <h1 className="display-font mt-4 max-w-5xl text-[clamp(2rem,3.15vw,3.55rem)] leading-[1.03] text-ink">{studyModule.title}</h1>
          <p className="mt-4 max-w-3xl text-[17px] leading-7 text-muted">{studyModule.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#study-workspace" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,108,189,.20)]"><Play className="size-4 fill-current" /> Continuar aprendiendo</a>
            <Link href={`/modulos/${studyModule.slug}/tareas`} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-bold text-ink"><ClipboardList className="size-4 text-accent" /> Tareas</Link>
            <Link href={`/modulos/${studyModule.slug}/lector`} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-bold text-ink"><BookOpen className="size-4" /> Guía PDF</Link>
          </div>
        </div>
        <ModuleOrbit />
      </section>

      <ModuleResourceHub moduleId={studyModule.id} />

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Avance</p><p className="mt-2 text-2xl font-black text-ink">{studyModule.progress}%</p><div className="lab-progress-track mt-3 h-1.5 overflow-hidden rounded-full"><div className="lab-progress-fill h-full rounded-full" style={{ width: `${studyModule.progress}%` }} /></div></div>
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Contenido</p><p className="mt-2 text-2xl font-black text-ink">{studyModule.topics}</p><p className="mt-1 text-[13px] text-muted">temas detectados</p></div>
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Estado</p><p className="mt-2 text-2xl font-black text-ink">{studyModule.status}</p><p className="mt-1 text-[13px] text-muted">ruta actual</p></div>
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Fuente</p><p className="mt-2 text-lg font-black text-ink">{studyModule.sourceDocument ? studyModule.sourceDocument.kind : "Pendiente"}</p><p className="mt-1 truncate text-[13px] text-muted">{studyModule.sourceDocument?.name || "Vincula un documento"}</p></div>
      </section>

      {archived && <div className="mt-3 rounded-2xl border border-warn/30 bg-surface p-4 text-sm leading-6 text-ink"><strong>Módulo archivado.</strong> Puedes seguir estudiándolo o restaurarlo desde configuración.</div>}

      <StudyWorkspace key={`${studyModule.id}-${workspaceRevision}`} module={studyModule} />

      <details id="module-setup" open={setupOpen} className="lab-card mt-5 rounded-[22px] p-5 sm:p-6">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-ink">
          <span className="inline-flex items-center gap-2"><Settings2 className="size-4 text-muted" /> Fuente y configuración del módulo</span>
          <span className="meta-font text-[8px] uppercase text-muted">Solo cuando lo necesites</span>
        </summary>

        <div className="mt-5 border-t border-line pt-1">
          <DocumentPanel module={studyModule} />
          <LearningManifestPanel module={studyModule} onGenerated={() => setWorkspaceRevision((value) => value + 1)} />
          <AudioSummaryPanel moduleId={studyModule.id} />

          <section className="mt-8 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="meta-font text-[9px] font-bold uppercase text-muted">Administración</p><h2 className="mt-1 text-2xl font-extrabold text-ink">Ficha del módulo</h2></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing((value) => !value)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted">{editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}{editing ? "Cerrar" : "Editar"}</button>
                <button type="button" onClick={() => archived ? restoreModule(studyModule.id) : archiveModule(studyModule.id)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted">{archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}{archived ? "Restaurar" : "Archivar"}</button>
                <button type="button" onClick={onDelete} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-warn/40 bg-surface px-3 text-xs font-bold text-warn"><Trash2 className="size-3.5" /> Eliminar</button>
              </div>
            </div>

            {editing && <form onSubmit={onEdit} className="mt-5 grid gap-4 rounded-2xl bg-surface-strong p-4 md:grid-cols-2"><label className="text-sm font-bold">Título<input name="title" required defaultValue={studyModule.title} className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3" /></label><label className="text-sm font-bold">Materia<input name="subject" required defaultValue={studyModule.subject} className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3" /></label><label className="text-sm font-bold md:col-span-2">Descripción<textarea name="description" rows={3} defaultValue={studyModule.description} className="focus-ring mt-2 w-full rounded-xl border border-line bg-surface px-3 py-3" /></label><div className="md:col-span-2"><button type="submit" className="focus-ring min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-white">Guardar cambios</button></div></form>}
          </section>
        </div>
      </details>
    </div>
  );
}
