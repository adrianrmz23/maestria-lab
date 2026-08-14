"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, BrainCircuit, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { generateLearningManifest, getLearningManifest } from "@/lib/learning-api";
import type { LearningManifestRecord } from "@/lib/pedagogy/types";
import type { StudyModule } from "@/lib/mock-data";

export function LearningManifestPanel({ module }: { module: StudyModule }) {
  const [record, setRecord] = useState<LearningManifestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await getLearningManifest(module.id);
      setRecord(next);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo consultar el Learning Manifest.");
    } finally {
      setLoading(false);
    }
  }, [module.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function generate() {
    setBusy(true);
    setMessage("Analizando todo el contenido extraído y construyendo la estructura pedagógica…");
    try {
      await generateLearningManifest(module.id);
      await refresh();
      setMessage("Learning Manifest generado. El modo Aprende ya está disponible.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el Learning Manifest.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const sourceReady = module.sourceDocument?.storage === "cloud" && module.sourceDocument.extractionStatus === "ready";
  const ready = record?.status === "ready" && Boolean(record.manifest);

  return (
    <section className="mt-8 border-t-2 border-ink pt-5" aria-labelledby="manifest-heading">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
        <div>
          <p className="meta-font text-[9px] font-bold uppercase text-accent">Motor pedagógico / Bloque 5</p>
          <h2 id="manifest-heading" className="display-font mt-1 text-3xl sm:text-4xl">Del documento a una ruta para entender.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">El Learning Manifest organiza temas y conceptos sin reemplazar la fuente. Conserva referencias al documento y separa explícitamente lo que viene de la fuente de las explicaciones y ejemplos generados.</p>
        </div>
        <div className="border-l-2 border-accent pl-4">
          <p className="meta-font text-[9px] font-bold uppercase text-muted">Estado pedagógico</p>
          <p className={`mt-2 text-sm font-bold ${ready ? "text-moss" : record?.status === "error" ? "text-warn" : "text-ink"}`}>
            {loading ? "Comprobando…" : ready ? "Manifest listo" : record?.status === "generating" ? "Generando…" : record?.status === "error" ? "Requiere atención" : "Pendiente"}
          </p>
        </div>
      </div>

      <div className="paper-sheet mt-5 border border-line">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[58px_minmax(0,1fr)_auto] lg:items-center">
          <span className={`grid size-12 place-items-center border ${ready ? "border-moss/40 bg-moss-soft text-moss" : "border-accent/35 bg-accent-soft/45 text-accent"}`}>
            {ready ? <BookOpenCheck className="size-5" aria-hidden="true" /> : <BrainCircuit className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-base font-bold text-ink">{ready ? "Contenido pedagógico estructurado" : "Learning Manifest aún no generado"}</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {!sourceReady
                ? "Primero necesitas un documento en Supabase con extracción completada."
                : ready
                  ? `${record?.topicCount ?? 0} temas · ${record?.conceptCount ?? 0} conceptos · ${record?.sourceUnitCount ?? 0} unidades de fuente analizadas.`
                  : "La fuente está lista. Puedes convertirla ahora en temas, conceptos y explicaciones navegables."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ready ? (
              <>
                <Link href={`/modulos/${module.slug}/aprende`} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent">Abrir Aprende <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
                <button type="button" onClick={generate} disabled={busy} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-4 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:opacity-50"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> Regenerar</button>
              </>
            ) : (
              <button type="button" onClick={generate} disabled={!sourceReady || busy || loading} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-accent px-4 text-xs font-bold text-white hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-45">
                {busy ? <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
                {busy ? "Construyendo…" : "Generar contenido"}
              </button>
            )}
          </div>
        </div>

        {ready && (
          <div className="grid border-t border-line sm:grid-cols-4">
            {[
              ["01", "Temas", String(record?.topicCount ?? 0)],
              ["02", "Conceptos", String(record?.conceptCount ?? 0)],
              ["03", "Fuente cubierta", `${record?.sourceUnitCount ?? 0} unidades`],
              ["04", "Modelo", record?.model ?? "Registrado"],
            ].map(([code, label, value], index) => (
              <div key={code} className={`min-h-24 p-4 ${index > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
                <p className="meta-font text-[9px] font-bold uppercase text-muted">{code} · {label}</p>
                <p className="mt-2 text-sm font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
        )}

        {record?.status === "error" && (
          <div className="flex items-start gap-3 border-t border-line bg-accent-soft/25 p-5 sm:p-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
            <div><p className="text-sm font-bold text-ink">No se pudo construir el Manifest.</p><p className="mt-1 text-sm leading-6 text-muted">{record.generationError}</p></div>
          </div>
        )}
      </div>

      {message && <div role="status" className={`mt-4 border-l-4 p-4 text-sm leading-6 ${message.includes("generado") || message.includes("disponible") ? "border-moss bg-moss-soft/45" : "border-warn bg-accent-soft/35"}`}>{message}</div>}
    </section>
  );
}
