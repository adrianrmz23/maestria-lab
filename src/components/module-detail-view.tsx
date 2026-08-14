"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { Archive, BookOpenText, BrainCircuit, ChartNoAxesColumnIncreasing, ChevronLeft, FlaskConical, GraduationCap, ListChecks, MessageSquareText, Pencil, RotateCcw, TestTubeDiagonal, Trash2, X } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { DocumentPanel } from "@/components/document-panel";
import { LearningManifestPanel } from "@/components/learning-manifest-panel";
import { AudioSummaryPanel } from "@/components/audio-summary-panel";
import { formatModuleUpdated, sortModulesByUpdated } from "@/lib/module-utils";

const modes = [
  { label: "Lector", icon: BookOpenText, code: "D", path: "lector", available: true },
  { label: "Aprende", icon: GraduationCap, code: "A", path: "aprende", available: true },
  { label: "Laboratorio", icon: FlaskConical, code: "L", path: "laboratorio", available: true },
  { label: "Practica", icon: ListChecks, code: "P", path: "practica", available: true },
  { label: "Evaluación", icon: TestTubeDiagonal, code: "E", path: "evaluacion", available: true },
  { label: "Tutor IA", icon: MessageSquareText, code: "T", path: "tutor", available: true },
];

export function ModuleDetailView() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { modules, hydrated, updateModule, archiveModule, restoreModule, removeModule } = useModules();
  const [editing, setEditing] = useState(false);
  const studyModule = modules.find((item) => item.slug === params.slug);
  const ordered = useMemo(() => sortModulesByUpdated(modules), [modules]);

  if (!studyModule) {
    if (!hydrated) return <div className="mx-auto max-w-[1160px] px-4 py-16 text-sm text-muted sm:px-6 lg:px-10">Cargando módulo…</div>;
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">
        <p className="meta-font text-[9px] font-bold uppercase text-accent">Módulo no encontrado</p>
        <h1 className="display-font mt-3 text-4xl">Esta ficha ya no existe.</h1>
        <p className="mt-3 text-base leading-7 text-muted">Puede haber sido eliminada desde la Biblioteca.</p>
        <Link href="/biblioteca" className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-accent"><ChevronLeft className="size-4" aria-hidden="true" /> Volver a Biblioteca</Link>
      </div>
    );
  }

  const moduleIndex = ordered.findIndex((item) => item.id === studyModule.id) + 1;
  const archived = studyModule.status === "Archivado";

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
    const confirmed = window.confirm(`¿Eliminar definitivamente “${studyModule!.title}”?\n\nSe borrarán también su documento en Storage, extracción, Manifest, prácticas, dominio, exámenes, Tutor, RAG, ayudas del lector y conexiones relacionadas. Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    await removeModule(studyModule!.id);
    router.push("/biblioteca");
  }

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 md:py-10 lg:px-10 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/biblioteca" className="focus-ring inline-flex min-h-11 items-center gap-1 text-sm font-bold text-muted transition-colors hover:text-accent"><ChevronLeft className="size-4" aria-hidden="true" /> Índice de módulos</Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing((value) => !value)} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent">{editing ? <X className="size-3.5" aria-hidden="true" /> : <Pencil className="size-3.5" aria-hidden="true" />}{editing ? "Cerrar edición" : "Editar ficha"}</button>
          <button type="button" onClick={() => archived ? restoreModule(studyModule.id) : archiveModule(studyModule.id)} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent">{archived ? <RotateCcw className="size-3.5" aria-hidden="true" /> : <Archive className="size-3.5" aria-hidden="true" />}{archived ? "Restaurar" : "Archivar"}</button>
          <button type="button" onClick={onDelete} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-warn/60 px-3 text-xs font-bold text-warn hover:bg-warn hover:text-white"><Trash2 className="size-3.5" aria-hidden="true" /> Eliminar</button>
        </div>
      </div>

      {archived && <div className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6 text-ink"><strong>Módulo archivado.</strong> Sigue siendo consultable, pero no aparece entre tus módulos activos. Puedes restaurarlo cuando quieras.</div>}

      <header className="mt-4 grid gap-6 border-b-2 border-ink pb-8 lg:grid-cols-[82px_minmax(0,1fr)_230px] lg:items-end">
        <div className="hidden lg:block"><span className="display-font text-6xl text-line-strong">{String(moduleIndex).padStart(2, "0")}</span><p className="meta-font mt-1 text-[8px] uppercase text-muted">Módulo</p></div>
        <div><p className="meta-font text-[9px] font-bold uppercase leading-5 text-accent">{studyModule.subject}</p><h1 className="display-font mt-2 max-w-4xl text-4xl leading-[0.98] sm:text-5xl md:text-6xl">{studyModule.title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-muted">{studyModule.description}</p></div>
        <div className="border-l-2 border-accent pl-4"><div className="flex items-baseline justify-between gap-4"><span className="meta-font text-[9px] uppercase text-muted">Avance</span><span className="display-font text-3xl">{studyModule.progress}%</span></div><div className="mt-2 h-[5px] bg-surface-strong" aria-hidden="true"><div className="h-full bg-accent" style={{ width: `${studyModule.progress}%` }} /></div><p className="mt-2 text-xs text-muted">{studyModule.topics} temas · {formatModuleUpdated(studyModule.updatedAt)}</p></div>
      </header>

      {editing && (
        <form onSubmit={onEdit} className="paper-sheet mt-6 border border-line p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-4"><div><p className="meta-font text-[9px] font-bold uppercase text-accent">Gestión del módulo</p><h2 className="display-font mt-1 text-2xl">Editar ficha</h2></div><span className="meta-font text-[9px] uppercase text-muted">Slug estable · {studyModule.slug}</span></div>
          <div className="mt-5 grid gap-5 md:grid-cols-2"><div><label htmlFor="edit-title" className="mb-2 block text-sm font-bold">Título</label><input id="edit-title" name="title" required defaultValue={studyModule.title} className="focus-ring min-h-12 w-full border border-line-strong bg-transparent px-4 text-base outline-none focus:border-accent" /></div><div><label htmlFor="edit-subject" className="mb-2 block text-sm font-bold">Materia</label><input id="edit-subject" name="subject" required defaultValue={studyModule.subject} className="focus-ring min-h-12 w-full border border-line-strong bg-transparent px-4 text-base outline-none focus:border-accent" /></div><div className="md:col-span-2"><label htmlFor="edit-description" className="mb-2 block text-sm font-bold">Descripción</label><textarea id="edit-description" name="description" rows={4} defaultValue={studyModule.description} className="focus-ring w-full border border-line-strong bg-transparent px-4 py-3 text-base leading-6 outline-none focus:border-accent" /></div></div>
          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={onDelete} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 border border-warn px-4 text-xs font-bold text-warn hover:bg-accent-soft/40"><Trash2 className="size-3.5" aria-hidden="true" /> Eliminar módulo</button><button type="submit" className="focus-ring inline-flex min-h-11 items-center justify-center bg-ink px-5 text-sm font-bold text-white hover:bg-accent">Guardar cambios</button></div>
        </form>
      )}

      <DocumentPanel module={studyModule} />
      <LearningManifestPanel module={studyModule} />
      <AudioSummaryPanel moduleId={studyModule.id} />

      <section className="mt-8 border-b border-line">
        <p className="meta-font mb-2 text-[9px] font-bold uppercase text-muted">Modos de aprendizaje</p>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {modes.map(({ label, icon: Icon, code, path, available }) => available ? (
            <Link key={label} href={`/modulos/${studyModule.slug}/${path}`} className="focus-ring relative flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-sm font-bold text-accent transition-colors duration-200 sm:px-5"><span className="meta-font grid size-6 place-items-center border border-accent text-[9px]">{code}</span><Icon className="size-4 sm:hidden" aria-hidden="true" /><span>{label}</span><span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden="true" /></Link>
          ) : (
            <span key={label} className="relative flex min-h-12 shrink-0 cursor-not-allowed items-center gap-2 px-3.5 text-sm font-bold text-muted/65 sm:px-5" title="Disponible en próximos bloques"><span className="meta-font grid size-6 place-items-center border border-line text-[9px]">{code}</span><Icon className="size-4 sm:hidden" aria-hidden="true" /><span>{label}</span></span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 border-b border-line pb-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div><p className="meta-font text-[9px] font-bold uppercase text-accent">Vertical slice actual</p><h2 className="display-font mt-2 text-3xl sm:text-4xl">Comprende → experimenta → practica → demuestra.</h2><p className="mt-3 max-w-3xl text-base leading-7 text-muted">El Bloque 8 cierra la primera versión: además de aprender, experimentar, practicar y demostrar, ahora puedes leer la fuente cómodamente, preguntar con RAG y conectar conceptos entre materias.</p><div className="mt-5 flex flex-wrap gap-2"><Link href={`/progreso?module=${encodeURIComponent(studyModule.id)}`} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-4 text-xs font-bold text-muted hover:border-accent hover:text-accent"><ChartNoAxesColumnIncreasing className="size-3.5" /> Ver dominio</Link><Link href={`/modulos/${studyModule.slug}/refuerzo`} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent"><BrainCircuit className="size-3.5" /> Sesión adaptativa</Link></div></div>
        <div className="border-l-2 border-moss pl-4"><p className="meta-font text-[9px] font-bold uppercase text-moss">Sistema integrado</p><p className="mt-2 text-sm font-bold">Lector · Tutor RAG · Dominio · Conexiones</p><p className="mt-2 text-xs leading-5 text-muted">La fuente permanece visible en todo momento. El Tutor recupera fragmentos verificables y el mapa de conexiones une conceptos de diferentes módulos sin perder su procedencia.</p></div>
      </section>
    </div>
  );
}
