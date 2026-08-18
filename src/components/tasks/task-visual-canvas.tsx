"use client";

import { Plus, Trash2 } from "lucide-react";
import type { TaskVisual, VisualNode } from "@/lib/tasks/types";

type Props = {
  visual: TaskVisual;
  editable?: boolean;
  onChange?: (visual: TaskVisual) => void;
};

function wrapLabel(label: string, max = 22) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function layoutNodes(visual: TaskVisual) {
  const width = 1040;
  const height = Math.max(520, 180 + visual.nodes.length * 20);
  const groups = new Map<number, VisualNode[]>();
  for (const node of visual.nodes) {
    const level = Math.max(0, Number(node.level || 0));
    const group = groups.get(level) || [];
    group.push(node);
    groups.set(level, group);
  }
  const levels = [...groups.keys()].sort((a, b) => a - b);
  const maxLevel = Math.max(1, ...levels);
  const positions = new Map<string, { x: number; y: number }>();

  for (const level of levels) {
    const group = groups.get(level) || [];
    group.forEach((node, index) => {
      if (visual.orientation === "horizontal") {
        const x = 90 + (level / maxLevel) * (width - 180);
        const y = 90 + ((index + 1) / (group.length + 1)) * (height - 180);
        positions.set(node.id, { x, y });
      } else {
        const x = 90 + ((index + 1) / (group.length + 1)) * (width - 180);
        const y = 90 + (level / maxLevel) * (height - 180);
        positions.set(node.id, { x, y });
      }
    });
  }
  return { width, height, positions };
}

export function TaskVisualCanvas({ visual, editable = false, onChange }: Props) {
  const { width, height, positions } = layoutNodes(visual);
  const derivedEdges = visual.nodes.filter((node) => node.parentId).map((node) => ({ source: node.parentId!, target: node.id, label: "" }));
  const edges = derivedEdges.length ? derivedEdges : visual.edges;

  function updateNode(id: string, patch: Partial<VisualNode>) {
    onChange?.({ ...visual, nodes: visual.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) });
  }

  function addNode() {
    const id = `n-${Date.now()}`;
    const root = visual.nodes.find((node) => node.level === 0) || visual.nodes[0];
    onChange?.({
      ...visual,
      enabled: true,
      nodes: [...visual.nodes, { id, label: "Nuevo concepto", detail: "", level: root ? root.level + 1 : 0, parentId: root?.id || null }],
    });
  }

  function removeNode(id: string) {
    onChange?.({
      ...visual,
      nodes: visual.nodes.filter((node) => node.id !== id).map((node) => node.parentId === id ? { ...node, parentId: null } : node),
      edges: visual.edges.filter((edge) => edge.source !== id && edge.target !== id),
    });
  }

  if (!visual.enabled || visual.type === "none") return null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[22px] border border-line bg-surface-strong p-3">
        <svg id="academic-task-visual" role="img" aria-label="Vista visual de la tarea" viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          <defs>
            <marker id="task-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#9aabba" />
            </marker>
          </defs>
          <g>
            {edges.map((edge, index) => {
              const a = positions.get(edge.source);
              const b = positions.get(edge.target);
              if (!a || !b) return null;
              return <line key={`${edge.source}-${edge.target}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9aabba" strokeWidth="2" markerEnd="url(#task-arrow)" />;
            })}
          </g>
          {visual.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const lines = wrapLabel(node.label);
            const root = node.level === 0;
            return (
              <g key={node.id} transform={`translate(${pos.x},${pos.y})`}>
                <rect x={-82} y={-34} width={164} height={68} rx={16} fill={root ? "#0f6cbd" : "#ffffff"} stroke={root ? "#0f6cbd" : "#cfd9e2"} strokeWidth="2" />
                <text textAnchor="middle" fill={root ? "#ffffff" : "#12253a"} fontSize="15" fontWeight="700">
                  {lines.map((line, i) => <tspan key={line} x="0" dy={i === 0 ? `${-(lines.length - 1) * 9}px` : "18px"}>{line}</tspan>)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {editable && (
        <div className="rounded-[20px] border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="meta-font text-[9px] font-black uppercase text-muted">Editar estructura visual</p>
              <p className="mt-1 text-sm text-muted">Cambia textos, jerarquía y orientación antes de exportar.</p>
            </div>
            <div className="flex gap-2">
              <select value={visual.orientation} onChange={(event) => onChange?.({ ...visual, orientation: event.target.value as TaskVisual["orientation"] })} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink">
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
              <button type="button" onClick={addNode} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-bold text-white"><Plus className="size-4" /> Nodo</button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {visual.nodes.map((node) => (
              <div key={node.id} className="rounded-2xl border border-line bg-surface-strong p-3">
                <div className="flex gap-2">
                  <input value={node.label} onChange={(event) => updateNode(node.id, { label: event.target.value })} className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink" />
                  <button type="button" onClick={() => removeNode(node.id)} aria-label="Eliminar nodo" className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-warn"><Trash2 className="size-4" /></button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-[100px_minmax(0,1fr)]">
                  <input type="number" min={0} max={8} value={node.level} onChange={(event) => updateNode(node.id, { level: Number(event.target.value) || 0 })} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink" aria-label="Nivel" />
                  <select value={node.parentId || ""} onChange={(event) => updateNode(node.id, { parentId: event.target.value || null })} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink" aria-label="Padre">
                    <option value="">Sin padre</option>
                    {visual.nodes.filter((candidate) => candidate.id !== node.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
                  </select>
                </div>
                <textarea value={node.detail} onChange={(event) => updateNode(node.id, { detail: event.target.value })} rows={2} placeholder="Detalle opcional" className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
