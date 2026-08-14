"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, GitBranch, LoaderCircle, Network, RefreshCw, Sparkles } from "lucide-react";
import { useModules } from "@/components/module-provider";
import { generateKnowledgeConnections, getKnowledgeConnections } from "@/lib/connections-api";
import type { ConnectionGraph, KnowledgeConnection } from "@/lib/connections/types";

const typeLabels: Record<KnowledgeConnection["relationshipType"], string> = {
  prerequisite: "Prerrequisito",
  analogy: "Analogía",
  application: "Aplicación",
  shared_principle: "Principio compartido",
  contrast: "Contraste",
  extension: "Extensión",
};

export function ConnectionsView() {
  const { modules } = useModules();
  const [graph, setGraph] = useState<ConnectionGraph>({ connections: [] });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  async function load() {
    setLoading(true);
    setMessage("");
    try { setGraph(await getKnowledgeConnections()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudieron cargar las conexiones."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function generate() {
    setBusy(true);
    setMessage("Analizando los Learning Manifests y buscando puentes útiles entre materias…");
    try {
      const next = await generateKnowledgeConnections();
      setGraph(next);
      setMessage(next.connections.length ? `Se encontraron ${next.connections.length} conexiones útiles.` : "No se encontraron relaciones suficientemente fuertes entre los módulos actuales.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron generar las conexiones.");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => moduleFilter === "all" ? graph.connections : graph.connections.filter((item) => item.sourceModuleId === moduleFilter || item.targetModuleId === moduleFilter), [graph.connections, moduleFilter]);
  const slugById = useMemo(() => new Map(modules.map((item) => [item.id, item.slug])), [modules]);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 md:py-12 lg:px-10 lg:py-14">
      <header className="grid gap-5 border-b-2 border-ink pb-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
        <div><p className="meta-font text-[10px] font-bold uppercase text-accent">Conexiones / mapa de conocimiento real</p><h1 className="display-font mt-3 max-w-4xl text-4xl leading-[0.98] sm:text-5xl md:text-6xl">Lo que aprendiste ayer puede desbloquear lo de mañana.</h1></div>
        <div className="border-l-2 border-moss pl-4"><p className="text-sm leading-6 text-muted">La IA compara conceptos de módulos distintos y conserva únicamente relaciones que puedan ayudarte a transferir conocimiento, no simples coincidencias de palabras.</p><button type="button" disabled={busy} onClick={generate} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent disabled:opacity-45">{busy ? <LoaderCircle className="size-4 animate-spin" /> : graph.connections.length ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />} {graph.connections.length ? "Recalcular mapa" : "Descubrir conexiones"}</button></div>
      </header>

      <section className="mt-6 flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2"><Network className="size-4 text-accent" /><p className="text-sm font-bold">{loading ? "Cargando…" : `${visible.length} conexiones visibles`}</p>{graph.provider && <span className="meta-font border border-line px-2 py-1 text-[8px] uppercase text-muted">{graph.provider} · {graph.model}</span>}</div>
        <label className="text-xs font-bold text-muted">Filtrar por módulo <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="focus-ring ml-2 min-h-11 border border-line-strong bg-surface px-3 text-sm text-ink"><option value="all">Todos</option>{modules.filter((module) => module.status !== "Archivado").map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
      </section>

      {message && <p role="status" className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6 text-ink">{message}</p>}

      {!loading && !visible.length ? (
        <section className="paper-sheet mt-7 border border-line p-6 sm:p-8"><GitBranch className="size-6 text-accent" /><h2 className="display-font mt-3 text-3xl">El grafo todavía está vacío.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Necesitas al menos dos módulos con Learning Manifest listo. Cuando los tengas, Maestría Lab podrá comparar sus conceptos y descubrir relaciones de prerrequisito, analogía, aplicación, contraste o extensión.</p></section>
      ) : (
        <section className="mt-7 border-t-2 border-ink">
          {visible.map((connection, index) => {
            const sourceSlug = slugById.get(connection.sourceModuleId);
            const targetSlug = slugById.get(connection.targetModuleId);
            return <article key={connection.id} className="grid gap-5 border-b border-line py-6 lg:grid-cols-[56px_minmax(0,1fr)_220px]">
              <div><span className="display-font text-3xl text-line-strong">{String(index + 1).padStart(2, "0")}</span><p className="meta-font mt-1 text-[8px] uppercase text-muted">{connection.strength}%</p></div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="meta-font border border-accent px-2 py-1 text-[8px] font-bold uppercase text-accent">{typeLabels[connection.relationshipType]}</span><span className="meta-font text-[8px] uppercase text-muted">{connection.sourceModuleTitle} ↔ {connection.targetModuleTitle}</span></div>
                <h2 className="display-font mt-3 text-2xl sm:text-3xl">{connection.title}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="border-l-2 border-accent pl-3"><p className="meta-font text-[8px] uppercase text-muted">Origen</p><p className="mt-1 text-sm font-bold leading-5">{connection.sourceConceptTitle}</p><p className="mt-1 text-xs text-muted">{connection.sourceTopicTitle}</p></div><ArrowRight className="hidden size-4 text-line-strong sm:block" /><div className="border-l-2 border-moss pl-3"><p className="meta-font text-[8px] uppercase text-muted">Destino</p><p className="mt-1 text-sm font-bold leading-5">{connection.targetConceptTitle}</p><p className="mt-1 text-xs text-muted">{connection.targetTopicTitle}</p></div></div>
                <p className="mt-4 text-sm leading-7 text-muted">{connection.explanation}</p>
                <div className="mt-4 border-l-2 border-moss bg-moss-soft/30 px-4 py-3"><p className="meta-font text-[8px] font-bold uppercase text-moss">Puente práctico</p><p className="mt-2 text-sm leading-6 text-ink">{connection.bridgeExample}</p></div>
              </div>
              <div className="flex flex-row gap-2 lg:flex-col lg:items-stretch">
                {sourceSlug && <Link href={`/modulos/${sourceSlug}/aprende?topicId=${encodeURIComponent(connection.sourceTopicId)}&conceptId=${encodeURIComponent(connection.sourceConceptId)}`} className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent">Abrir origen</Link>}
                {targetSlug && <Link href={`/modulos/${targetSlug}/aprende?topicId=${encodeURIComponent(connection.targetTopicId)}&conceptId=${encodeURIComponent(connection.targetConceptId)}`} className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center bg-ink px-3 text-xs font-bold text-white hover:bg-accent">Abrir destino</Link>}
                <p className="hidden text-xs leading-5 text-muted lg:block">Relación generada a partir de los Manifests. Las referencias del documento original permanecen en cada concepto.</p>
              </div>
            </article>;
          })}
        </section>
      )}

      <div className="mt-7 grid gap-4 border-t border-line pt-5 sm:grid-cols-2"><p className="text-sm leading-6 text-muted"><strong className="text-ink">Uso de Kimi.</strong> Si agregas `KIMI_API_KEY`, este análisis global usa Kimi de forma preferente y guarda el resultado. Si no, utiliza OpenAI.</p><p className="text-sm leading-6 text-muted"><strong className="text-ink">Costo controlado.</strong> El mapa se genera únicamente cuando pulsas el botón. Navegar por conexiones existentes no vuelve a llamar a ningún modelo.</p></div>
    </div>
  );
}
