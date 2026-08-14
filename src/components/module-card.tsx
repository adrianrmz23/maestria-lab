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
    try {
      await removeModule(module.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo eliminar el módulo.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className={`group border-t border-line first:border-t-0 ${archived ? "opacity-75" : ""}`}>
      <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
        <Link
          href={`/modulos/${module.slug}`}
          className="focus-ring grid min-h-[126px] gap-4 px-1 py-5 transition-colors duration-200 hover:bg-surface/70 sm:grid-cols-[58px_minmax(0,1fr)_150px] sm:items-center sm:px-3 md:py-6"
        >
          <div className="flex items-center gap-3 sm:block">
            <span className="display-font text-3xl text-line-strong">{String(index).padStart(2, "0")}</span>
            <span className={`meta-font text-[9px] font-bold uppercase sm:mt-1 sm:block ${archived ? "text-warn" : "text-muted"}`}>{module.status}</span>
          </div>

          <div className="min-w-0">
            <p className="meta-font text-[9px] font-bold uppercase leading-5 text-muted">{module.subject}</p>
            <h3 className="display-font mt-1 text-xl leading-tight text-ink md:text-2xl">{module.title}</h3>
            {!compact && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{module.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" aria-hidden="true" />{module.topics} temas</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />{formatModuleUpdated(module.updatedAt)}</span>
              {!compact && <span className={`inline-flex items-center gap-1.5 font-semibold ${module.sourceDocument ? "text-moss" : "text-warn"}`}>{module.sourceDocument ? <FileCheck2 className="size-3.5" aria-hidden="true" /> : <FileWarning className="size-3.5" aria-hidden="true" />}{module.sourceDocument ? (module.sourceDocument.storage === "cloud" && module.sourceDocument.extractionStatus === "ready" ? `${module.sourceDocument.kind} · texto extraído` : module.sourceDocument.extractionStatus === "error" ? `${module.sourceDocument.kind} · revisar extracción` : `${module.sourceDocument.kind} · documento fuente`) : "Sin documento fuente"}</span>}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="mb-2 flex items-center justify-between text-xs font-bold sm:justify-end sm:gap-3">
              <span className="text-muted sm:hidden">Progreso</span>
              <span>{module.progress}%</span>
            </div>
            <div className="h-1.5 bg-surface-strong sm:ml-auto sm:w-28" aria-hidden="true">
              <div className={`h-full transition-[width] ${archived ? "bg-line-strong" : "bg-accent"}`} style={{ width: `${module.progress}%` }} />
            </div>
            <span className="mt-3 hidden items-center justify-end gap-1 text-xs font-bold text-accent sm:flex">{archived ? "Ver ficha" : module.progress > 0 ? "Continuar" : "Comenzar"}<ArrowRight className="size-3.5" aria-hidden="true" /></span>
          </div>
        </Link>

        {manage && (
          <div className="flex items-center gap-2 border-t border-line px-1 pb-5 sm:border-l sm:border-t-0 sm:px-4 sm:pb-0">
            <button
              type="button"
              onClick={() => archived ? restoreModule(module.id) : archiveModule(module.id)}
              disabled={deleting}
              className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-3 text-xs font-bold text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
              aria-label={archived ? `Restaurar ${module.title}` : `Archivar ${module.title}`}
            >
              {archived ? <RotateCcw className="size-3.5" aria-hidden="true" /> : <Archive className="size-3.5" aria-hidden="true" />}
              <span className="sm:hidden xl:inline">{archived ? "Restaurar" : "Archivar"}</span>
            </button>
            <button
              type="button"
              onClick={deleteModule}
              disabled={deleting}
              className="focus-ring inline-flex min-h-11 items-center gap-2 border border-warn/60 px-3 text-xs font-bold text-warn transition-colors hover:bg-warn hover:text-white disabled:opacity-40"
              aria-label={`Eliminar ${module.title}`}
              title="Eliminar módulo y todo su material"
            >
              {deleting ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
              <span className="sm:hidden xl:inline">{deleting ? "Eliminando…" : "Eliminar"}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
