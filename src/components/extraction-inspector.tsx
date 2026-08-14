"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ScanText } from "lucide-react";

type Unit = {
  unit_index: number;
  page_number: number | null;
  label: string | null;
  content: string;
  char_count: number;
};

type ExtractionPage = {
  units: Unit[];
  total: number;
  offset: number;
  limit: number;
};

const PAGE_SIZE = 6;

export function ExtractionInspector({ moduleId }: { moduleId: string }) {
  const [data, setData] = useState<ExtractionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function load(offset: number) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/document/extraction?offset=${offset}&limit=${PAGE_SIZE}`, { cache: "no-store" });
      const payload = await response.json() as ExtractionPage & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo consultar la extracción.");
      setData(payload);
      setOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo consultar la extracción.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-4">
        <button type="button" onClick={() => load(0)} disabled={loading} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-moss px-4 text-xs font-bold text-moss hover:bg-moss hover:text-white disabled:opacity-50">
          <ScanText className="size-3.5" aria-hidden="true" /> {loading ? "Leyendo extracción…" : "Inspeccionar texto extraído"}
        </button>
        {error && <p role="alert" className="mt-2 text-xs text-warn">{error}</p>}
      </div>
    );
  }

  const offset = data?.offset ?? 0;
  const total = data?.total ?? 0;
  const canBack = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="meta-font text-[9px] font-bold uppercase text-moss">Inspector de extracción</p><p className="mt-1 text-xs text-muted">Unidades {total ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} de ${total}` : "sin contenido"}</p></div>
        <button type="button" onClick={() => setOpen(false)} className="focus-ring min-h-11 px-3 text-xs font-bold text-muted hover:text-accent">Cerrar inspector</button>
      </div>

      <div className="mt-4 border-y border-line">
        {data?.units.map((unit) => (
          <article key={unit.unit_index} className="border-t border-line py-4 first:border-t-0">
            <div className="flex items-center justify-between gap-4"><p className="meta-font text-[9px] font-bold uppercase text-accent">{unit.label || `Unidad ${unit.unit_index}`}</p><span className="meta-font text-[8px] uppercase text-muted">{unit.char_count.toLocaleString("es-MX")} caracteres</span></div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{unit.content || "[Sin texto seleccionable]"}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" disabled={!canBack || loading} onClick={() => load(Math.max(0, offset - PAGE_SIZE))} className="focus-ring inline-flex min-h-11 items-center gap-1 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:opacity-35"><ChevronLeft className="size-3.5" aria-hidden="true" /> Anteriores</button>
        <button type="button" disabled={!canNext || loading} onClick={() => load(offset + PAGE_SIZE)} className="focus-ring inline-flex min-h-11 items-center gap-1 border border-line-strong px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:opacity-35">Siguientes <ChevronRight className="size-3.5" aria-hidden="true" /></button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-warn">{error}</p>}
    </div>
  );
}
