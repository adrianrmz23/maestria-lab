"use client";

import Link from "next/link";
import { Archive, ArrowRight, BookOpen, Clock3, FileCheck2, FileWarning, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { StudyModule } from "@/lib/mock-data";
import { formatModuleUpdated } from "@/lib/module-utils";
import { useModules } from "@/components/module-provider";

export function ModuleCard({ module, compact = false, index = 1, manage = false }: { module: StudyModule; compact?: boolean; index?: number; manage?: boolean }) {
  const { archiveModule, restoreModule, removeModule } = useModules();
  const [deleting, setDeleting] = useState(false);
  const archived = module.status === "Archivado";

  async function deleteModule() {
    const confirmed = window.confirm(`¿Eliminar definitivamente “${module.title}”?\n\nSe borrarán el documento de Storage, contenido extraído, Manifest, prácticas, dominio, exámenes, Tutor, RAG, ayudas del lector y conexiones relacionadas. Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    setDeleting(true);
    try { await removeModule(module.id); }
    catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo eliminar el módulo."); }
    finally { setDeleting(false); }
  }

  return (
    <article className={`lab-card rounded-[18px] ${archived ? "opacity-70" : ""}`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <Link href={`/modulos/${module.slug}`} className="focus-ring grid gap-4 p-5 sm:grid-cols-[48px_minmax(0,1fr)_140px] sm:items-center">
          <div><span className="text-3xl font-black text-accent">{String(index).padStart(2,"0")}</span><span className={`meta-font mt-1 block text-[8px] font-bold uppercase ${archived ? "text-warn" : "text-muted"}`}>{module.status}</span></div>
          <div className="min-w-0"><p className="meta-font text-[8px] font-black uppercase text-muted">{module.subject}</p><h3 className="mt-1 text-xl font-extrabold tracking-[-.025em] text-ink">{module.title}</h3>{!compact && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{module.description}</p>}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" />{module.topics} temas</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{formatModuleUpdated(module.updatedAt)}</span>{!compact && <span className={`inline-flex items-center gap-1.5 font-semibold ${module.sourceDocument ? "text-moss" : "text-warn"}`}>{module.sourceDocument ? <FileCheck2 className="size-3.5" /> : <FileWarning className="size-3.5" />}{module.sourceDocument ? `${module.sourceDocument.kind} · fuente lista` : "Sin documento fuente"}</span>}</div></div>
          <div><div className="mb-2 flex items-center justify-between text-xs font-bold"><span className="text-muted sm:hidden">Progreso</span><span className="text-ink">{module.progress}%</span></div><div className="lab-progress-track h-1.5 overflow-hidden rounded-full"><div className="lab-progress-fill h-full rounded-full" style={{ width: `${module.progress}%` }} /></div><span className="mt-3 hidden items-center justify-end gap-1 text-xs font-bold text-accent sm:flex">{module.progress > 0 ? "Continuar" : "Comenzar"}<ArrowRight className="size-3.5" /></span></div>
        </Link>
        {manage && <div className="flex gap-2 border-t border-line px-5 pb-5 pt-3 lg:border-l lg:border-t-0 lg:px-4 lg:py-5"><button type="button" onClick={() => archived ? restoreModule(module.id) : archiveModule(module.id)} disabled={deleting} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-xs font-bold text-muted">{archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}<span className="hidden xl:inline">{archived ? "Restaurar" : "Archivar"}</span></button><button type="button" onClick={deleteModule} disabled={deleting} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-warn/40 px-3 text-xs font-bold text-warn">{deleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}<span className="hidden xl:inline">Eliminar</span></button></div>}
      </div>
    </article>
  );
}
