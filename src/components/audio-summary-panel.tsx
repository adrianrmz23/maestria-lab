"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, FileText, Headphones, LoaderCircle, RefreshCw, Sparkles, Volume2 } from "lucide-react";
import { generateAudioSummary, getAudioSummaries } from "@/lib/audio-api";
import type { AudioSummaryKind, AudioSummaryRecord, AudioSummaryResponse } from "@/lib/audio/types";

const modes: Array<{ kind: AudioSummaryKind; title: string; duration: string; description: string }> = [
  {
    kind: "short",
    title: "Resumen breve",
    duration: "2–3 min",
    description: "Ideas imprescindibles, conceptos centrales y aplicaciones clave para repasar rápido.",
  },
  {
    kind: "study",
    title: "Resumen de estudio",
    duration: "5–7 min",
    description: "Recorre todos los temas del módulo y cierra con una recapitulación útil para evaluación.",
  },
];

function durationLabel(seconds: number) {
  if (!seconds) return "duración estimada";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `≈ ${minutes} min`;
}

function AudioPlayer({ summary }: { summary: AudioSummaryRecord }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speed, setSpeed] = useState(1);

  function chooseSpeed(next: number) {
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <audio ref={audioRef} src={summary.audioUrl} controls preload="none" className="w-full" onLoadedMetadata={() => { if (audioRef.current) audioRef.current.playbackRate = speed; }}>
        Tu navegador no puede reproducir este audio.
      </audio>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="meta-font mr-1 text-[9px] font-bold uppercase text-muted">Velocidad</span>
        {[1, 1.25, 1.5, 1.75].map((value) => (
          <button key={value} type="button" onClick={() => chooseSpeed(value)} aria-pressed={speed === value} className={`focus-ring min-h-10 min-w-12 border px-2 text-xs font-bold ${speed === value ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:border-accent hover:text-accent"}`}>
            {value}x
          </button>
        ))}
      </div>
    </div>
  );
}

export function AudioSummaryPanel({ moduleId }: { moduleId: string }) {
  const [data, setData] = useState<AudioSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<AudioSummaryKind | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAudioSummaries(moduleId)
      .then((result) => { if (!cancelled) { setData(result); setMessage(""); } })
      .catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "No se pudo cargar el resumen en audio."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moduleId]);

  async function generate(kind: AudioSummaryKind, force: boolean) {
    if (force) {
      const confirmed = window.confirm("Regenerar este audio consumirá nuevamente créditos de ElevenLabs. ¿Continuar?");
      if (!confirmed) return;
    }
    setBusyKind(kind);
    setMessage("");
    try {
      const next = await generateAudioSummary(moduleId, kind, force);
      setData(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el resumen en audio.");
    } finally {
      setBusyKind(null);
    }
  }

  const summaries = new Map((data?.summaries ?? []).map((item) => [item.kind, item]));

  return (
    <section className="mt-8 border-y-2 border-ink py-7 sm:py-8">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div>
          <div className="flex items-center gap-2 text-accent"><Headphones className="size-4" aria-hidden="true" /><p className="meta-font text-[9px] font-bold uppercase">Resumen en audio</p></div>
          <h2 className="display-font mt-2 text-3xl leading-tight sm:text-4xl">Estudia también con los audífonos.</h2>
          <p className="mt-3 text-[16px] leading-7 text-muted md:text-[17px]">El guion se genera desde tu Learning Manifest y ElevenLabs lo narra una sola vez. El MP3 queda guardado en Storage para reproducirlo sin volver a gastar créditos.</p>
          <div className="mt-4 border-l-2 border-moss pl-4">
            <p className="meta-font text-[9px] font-bold uppercase text-moss">Control de costo</p>
            <p className="mt-2 text-sm leading-6 text-muted">Nada se genera automáticamente. Tú decides qué versión crear y cuándo regenerarla.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {modes.map((mode) => {
            const summary = summaries.get(mode.kind);
            const busy = busyKind === mode.kind;
            const ready = summary?.status === "ready" && Boolean(summary.audioUrl);
            const needsUpdate = Boolean(summary?.stale);
            return (
              <article key={mode.kind} className="paper-sheet border border-line p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="meta-font text-[9px] font-bold uppercase text-accent">{mode.kind === "short" ? "Escucha rápida" : "Sesión de estudio"}</p>
                    <h3 className="display-font mt-2 text-2xl sm:text-3xl">{summary?.title || mode.title}</h3>
                  </div>
                  <span className="meta-font shrink-0 border border-line px-2 py-1 text-[8px] uppercase text-muted">{summary ? durationLabel(summary.estimatedSeconds) : mode.duration}</span>
                </div>
                <p className="mt-3 text-[16px] leading-7 text-muted md:text-[17px]">{mode.description}</p>

                {needsUpdate && <div className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-3 text-sm leading-6 text-ink"><strong>Audio desactualizado.</strong> El Manifest cambió después de esta narración.</div>}
                {summary?.status === "error" && <div className="mt-4 border-l-4 border-warn bg-accent-soft/35 p-3 text-sm leading-6 text-ink">{summary.error || "La generación anterior requiere atención."}</div>}

                {summary?.status === "ready" && (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-3 text-sm">
                    <div className="flex items-center gap-2 text-muted"><Clock3 className="size-4 text-moss" /><span>{durationLabel(summary.estimatedSeconds)}</span></div>
                    <div className="flex items-center gap-2 text-muted"><Sparkles className="size-4 text-accent" /><span>≈ {summary.estimatedCredits.toLocaleString("es-MX")} créditos</span></div>
                  </div>
                )}

                {ready && summary && <AudioPlayer summary={summary} />}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {!summary || summary.status === "error" ? (
                    <button type="button" onClick={() => generate(mode.kind, false)} disabled={busy || loading || !data?.configured || !data?.voiceConfigured || !data?.manifestReady} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-bold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45">
                      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Volume2 className="size-4" />} {busy ? "Generando…" : "Generar audio"}
                    </button>
                  ) : (
                    <button type="button" onClick={() => generate(mode.kind, true)} disabled={busy || loading} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-4 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:opacity-45">
                      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {needsUpdate ? "Actualizar audio" : "Regenerar"}
                    </button>
                  )}
                  {summary?.script && (
                    <details className="group w-full pt-1">
                      <summary className="focus-ring inline-flex min-h-10 cursor-pointer list-none items-center gap-2 text-xs font-bold text-muted hover:text-accent"><FileText className="size-3.5" /> Ver guion</summary>
                      <p className="mt-3 whitespace-pre-line border-l-2 border-line-strong pl-4 text-[16px] leading-7 text-ink md:text-[17px]">{summary.script}</p>
                    </details>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {!loading && data && (!data.configured || !data.voiceConfigured || !data.manifestReady) && (
        <div className="mt-5 border-l-4 border-warn bg-accent-soft/35 p-4 text-[15px] leading-6 text-ink">
          {!data.manifestReady ? "Genera primero el Learning Manifest del módulo. Después podrás crear sus resúmenes en audio." : !data.configured ? "Agrega ELEVENLABS_API_KEY en Vercel para habilitar la narración." : "Agrega ELEVENLABS_VOICE_ID en Vercel para elegir la voz que narrará tus módulos."}
        </div>
      )}
      {message && <div role="status" className="mt-5 border-l-4 border-warn bg-accent-soft/35 p-4 text-[15px] leading-6 text-ink">{message}</div>}
    </section>
  );
}
