"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, LoaderCircle, Network, RefreshCw } from "lucide-react";
import { getKnowledgeMap } from "@/lib/learning-engine-api";
import type { KnowledgeMap, KnowledgeMapNode } from "@/lib/learning-engine/types";

const stateClass: Record<KnowledgeMapNode["state"], string> = {
  dominated: "border-[#bfe5dc] bg-[#effaf6] text-[#167c72]",
  progress: "border-[#cfd9fb] bg-[#f1f4ff] text-[#4355c9]",
  review: "border-[#f2d4b7] bg-[#fff7ee] text-[#c36221]",
  new: "border-[#e1e5ed] bg-white text-[#7b8497]",
};

const stateLabel: Record<KnowledgeMapNode["state"], string> = {
  dominated: "Dominado",
  progress: "En progreso",
  review: "Repasar",
  new: "Nuevo",
};

export function KnowledgeMapPanel() {
  const [graph, setGraph] = useState<KnowledgeMap | null>(null);
  const [selected, setSelected] = useState<KnowledgeMapNode | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setBusy(true); setMessage("");
    try { setGraph(await getKnowledgeMap()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo cargar el mapa."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);

  const groups = useMemo(() => {
    const map = new Map<string, KnowledgeMapNode[]>();
    for (const node of graph?.nodes ?? []) map.set(node.moduleId, [...(map.get(node.moduleId) ?? []), node]);
    return Array.from(map.values());
  }, [graph]);

  const related = selected ? (graph?.edges ?? []).filter((edge) => edge.source === selected.id || edge.target === selected.id).slice(0, 5) : [];

  return (
    <section className="modern-card mt-8 rounded-[28px] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-soft text-violet"><Network className="size-5" /></span><div><p className="meta-font text-[9px] font-black uppercase text-violet">Mapa de conocimiento</p><h2 className="display-font mt-1 text-3xl">Mira cómo se conectan tus materias.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Cada nodo cambia según dominio y retención. Las conexiones fuertes aparecen cuando ya fueron descubiertas entre módulos.</p></div></div>
        <button type="button" onClick={load} disabled={busy} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-white px-3 text-xs font-bold text-muted disabled:opacity-40"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> Actualizar</button>
      </div>
      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Construyendo el mapa…</div>}
      {!busy && graph && graph.nodes.length === 0 && <p className="mt-6 text-sm text-muted">Todavía no hay Learning Manifests suficientes para dibujar el mapa.</p>}
      {!busy && groups.length > 0 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {groups.map((nodes) => <article key={nodes[0].moduleId} className="rounded-[22px] border border-line bg-[#fbfcff] p-4"><div className="flex items-center gap-2 text-accent"><GitBranch className="size-4" /><p className="meta-font text-[8px] font-black uppercase">{nodes[0].subject}</p></div><h3 className="mt-2 text-sm font-black text-[#19244e]">{nodes[0].moduleTitle}</h3><div className="mt-3 flex flex-wrap gap-2">{nodes.slice(0, 18).map((node) => <button key={node.id} type="button" onClick={() => setSelected(node)} className={`focus-ring rounded-full border px-2.5 py-1.5 text-left text-[11px] font-bold transition hover:-translate-y-0.5 ${stateClass[node.state]} ${selected?.id === node.id ? "ring-2 ring-accent/25" : ""}`}>{node.conceptTitle}</button>)}</div></article>)}
          </div>
          <aside className="rounded-[22px] border border-[#dfe4f2] bg-white p-4 xl:sticky xl:top-24">
            {selected ? <><div className="flex items-center justify-between gap-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${stateClass[selected.state]}`}>{stateLabel[selected.state]}</span><span className="text-xs font-bold text-muted">{selected.masteryScore}% dominio</span></div><h3 className="display-font mt-3 text-2xl">{selected.conceptTitle}</h3><p className="mt-1 text-xs font-bold text-muted">{selected.moduleTitle} · {selected.topicTitle}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f5f7ff] p-3"><p className="meta-font text-[8px] uppercase text-muted">Comprensión</p><strong className="mt-1 block text-xl text-[#33428f]">{selected.masteryScore}%</strong></div><div className="rounded-xl bg-[#f0faf7] p-3"><p className="meta-font text-[8px] uppercase text-muted">Retención</p><strong className="mt-1 block text-xl text-moss">{selected.retentionScore}%</strong></div></div><div className="mt-4"><p className="meta-font text-[8px] font-black uppercase text-muted">Conexiones</p>{related.length ? <div className="mt-2 space-y-2">{related.map((edge) => <div key={edge.id} className="rounded-xl border border-line p-3"><p className="text-xs font-black">{edge.title}</p><p className="mt-1 text-[11px] text-muted">{edge.type} · fuerza {edge.strength}%</p></div>)}</div> : <p className="mt-2 text-xs leading-5 text-muted">Aún no hay conexiones guardadas para este concepto. Puedes generarlas desde la sección de conexiones existente.</p>}</div></> : <><p className="meta-font text-[8px] font-black uppercase text-muted">Explora</p><p className="mt-2 text-sm leading-6 text-muted">Toca un concepto para ver dominio, retención y las conexiones que comparte con otras materias.</p><div className="mt-4 space-y-2 text-xs"><p><span className="inline-block size-2 rounded-full bg-[#4d5fd6]" /> En progreso</p><p><span className="inline-block size-2 rounded-full bg-[#168b80]" /> Dominado</p><p><span className="inline-block size-2 rounded-full bg-[#d46a25]" /> Necesita repaso</p></div></>}
          </aside>
        </div>
      )}
      {message && <p className="mt-4 text-sm font-bold text-warn">{message}</p>}
    </section>
  );
}
