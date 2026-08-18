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
      const filterMatch = filter === "Todos" ? module.status !== "Archivado" : filter === "En curso" ? module.status === "En curso" || module.status === "Nuevo" : filter === "Completados" ? module.status === "Completado" : filter === "Sin documento" ? module.status !== "Archivado" && !module.sourceDocument : module.status === "Archivado";
      return queryMatch && filterMatch;
    });
  }, [filter, ordered, query]);
  const counts = useMemo(() => ({ active: modules.filter((m) => m.status !== "Archivado").length, progress: modules.filter((m) => m.status === "En curso" || m.status === "Nuevo").length, completed: modules.filter((m) => m.status === "Completado").length, missingDocument: modules.filter((m) => m.status !== "Archivado" && !m.sourceDocument).length, archived: modules.filter((m) => m.status === "Archivado").length }), [modules]);

  return (
    <div className="mt-3">
      <div className="lab-card rounded-[18px] p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="relative max-w-2xl"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><label htmlFor="module-search" className="sr-only">Buscar módulos</label><input id="module-search" type="search" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Buscar módulo, materia o documento…" className="min-h-11 w-full rounded-xl border border-line bg-surface-strong pl-10 pr-3 text-sm text-ink outline-none focus:border-accent" /></div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">{filters.map((item) => { const count = item === "Todos" ? counts.active : item === "En curso" ? counts.progress : item === "Completados" ? counts.completed : item === "Sin documento" ? counts.missingDocument : counts.archived; return <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-xs font-bold ${filter === item ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted"}`}>{item} <span className="ml-1">{count}</span></button>; })}</div>
        </div>
      </div>
      <div className="mt-3 space-y-3">{filtered.length > 0 ? filtered.map((module) => <ModuleCard key={module.id} module={module} index={ordered.findIndex((item) => item.id === module.id) + 1} manage />) : <div className="lab-card rounded-[18px] py-14 text-center"><p className="text-xl font-extrabold text-ink">No encontramos módulos.</p><p className="mt-2 text-sm text-muted">Prueba otra búsqueda o cambia el filtro.</p></div>}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="meta-font text-[8px] uppercase text-muted">{filtered.length} módulos visibles</p><p className="meta-font text-[8px] uppercase text-moss">{hydrated ? `${modules.filter((module) => module.sourceDocument).length} documentos vinculados · ${persistence === "cloud" ? "Supabase activo" : "modo local"}` : "Preparando biblioteca…"}</p></div>
    </div>
  );
}
