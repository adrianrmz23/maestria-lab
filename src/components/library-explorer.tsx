"use client";

import { Search } from "lucide-react";
import { type ChangeEvent, useMemo, useState } from "react";
import { ModuleCard } from "@/components/module-card";
import { useModules } from "@/components/module-provider";
import { sortModulesByUpdated } from "@/lib/module-utils";

const filters = ["Todos", "En curso", "Completados", "Sin documento", "Archivados"] as const;

export function LibraryExplorer() {
  const { modules, hydrated, persistence } = useModules();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");

  const ordered = useMemo(() => sortModulesByUpdated(modules), [modules]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ordered.filter((module) => {
      const queryMatch = !normalized || `${module.title} ${module.subject} ${module.description} ${module.sourceDocument?.name ?? ""}`.toLowerCase().includes(normalized);
      const filterMatch =
        filter === "Todos" ? module.status !== "Archivado" :
        filter === "En curso" ? module.status === "En curso" || module.status === "Nuevo" :
        filter === "Completados" ? module.status === "Completado" :
        filter === "Sin documento" ? module.status !== "Archivado" && !module.sourceDocument :
        module.status === "Archivado";
      return queryMatch && filterMatch;
    });
  }, [filter, ordered, query]);

  const counts = useMemo(() => ({
    active: modules.filter((module) => module.status !== "Archivado").length,
    progress: modules.filter((module) => module.status === "En curso" || module.status === "Nuevo").length,
    completed: modules.filter((module) => module.status === "Completado").length,
    missingDocument: modules.filter((module) => module.status !== "Archivado" && !module.sourceDocument).length,
    archived: modules.filter((module) => module.status === "Archivado").length,
  }), [modules]);

  return (
    <div>
      <div className="grid gap-4 border-b border-line py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="relative max-w-xl border-b border-line-strong focus-within:border-accent">
          <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="module-search" className="sr-only">Buscar módulos</label>
          <input
            id="module-search"
            type="search"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Buscar por módulo, materia o descripción"
            className="focus-ring min-h-12 w-full border-0 bg-transparent pl-7 pr-3 text-base text-ink outline-none placeholder:text-muted/70"
          />
        </div>

        <div className="flex gap-5 overflow-x-auto scrollbar-none" role="group" aria-label="Filtrar módulos">
          {filters.map((item) => {
            const count = item === "Todos" ? counts.active : item === "En curso" ? counts.progress : item === "Completados" ? counts.completed : item === "Sin documento" ? counts.missingDocument : counts.archived;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                className={`focus-ring relative min-h-11 shrink-0 text-sm font-bold transition-colors duration-200 ${filter === item ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {item} <span className="meta-font ml-1 text-[9px]">{count}</span>
                <span className={`absolute inset-x-0 bottom-0 h-0.5 ${filter === item ? "bg-accent" : "bg-transparent"}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-line">
        {filtered.length > 0 ? filtered.map((module) => {
          const index = ordered.findIndex((item) => item.id === module.id) + 1;
          return <ModuleCard key={module.id} module={module} index={index} manage />;
        }) : (
          <div className="py-16 text-center">
            <p className="display-font text-2xl text-ink">No encontramos módulos.</p>
            <p className="mt-2 text-sm text-muted">Prueba otra búsqueda o cambia el filtro.</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="meta-font text-[9px] uppercase text-muted">{filtered.length} módulos visibles</p>
        <p className="meta-font text-[9px] uppercase text-moss">{hydrated ? `${modules.filter((module) => module.sourceDocument).length} documentos vinculados · ${persistence === "cloud" ? "Supabase activo" : "modo local"}` : "Preparando biblioteca…"}</p>
      </div>
    </div>
  );
}
