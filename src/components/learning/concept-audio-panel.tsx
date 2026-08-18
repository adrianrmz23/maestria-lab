"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, LoaderCircle, RefreshCw, Sparkles, Volume2 } from "lucide-react";
import { generateConceptAudio, getConceptAudio } from "@/lib/audio-api";
import type { ConceptAudioResponse } from "@/lib/audio/types";

function durationLabel(seconds: number) {
  if (!seconds) return "2–4 min";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `≈ ${minutes} min`;
}

function Player({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speed, setSpeed] = useState(1);
  function chooseSpeed(next: number) { setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next; }
  return (
    <>
      <audio ref={audioRef} src={audioUrl} controls preload="none" className="mt-4 w-full" onLoadedMetadata={() => { if (audioRef.current) audioRef.current.playbackRate = speed; }}>Tu navegador no puede reproducir este audio.</audio>
      <div className="mt-3 flex flex-wrap items-center gap-2">{[1, 1.25, 1.5].map((value) => <button key={value} type="button" onClick={() => chooseSpeed(value)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${speed === value ? "border-[var(--study-accent)] study-accent-soft study-text" : "study-line study-muted"}`}>{value}x</button>)}</div>
    </>
  );
}

export function ConceptAudioPanel({ moduleId, topicId, conceptId, conceptTitle }: { moduleId: string; topicId: string; conceptId: string; conceptTitle: string }) {
  const [data, setData] = useState<ConceptAudioResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null); setMessage("");
    getConceptAudio(moduleId, topicId, conceptId).then((result) => { if (!cancelled) setData(result); }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "No se pudo cargar el audio de la lección."); });
    return () => { cancelled = true; };
  }, [moduleId, topicId, conceptId]);

  async function generate(force: boolean) {
    if (force && !window.confirm("Regenerar este audio consumirá nuevamente créditos de ElevenLabs. ¿Continuar?")) return;
    setBusy(true); setMessage("");
    try { setData(await generateConceptAudio(moduleId, topicId, conceptId, "lesson", force)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo generar el audio de la lección."); }
    finally { setBusy(false); }
  }

  const summary = data?.summary;
  const ready = summary?.status === "ready" && Boolean(summary.audioUrl);

  return (
    <section className="study-panel-elevated rounded-[18px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 study-accent"><Headphones className="size-4" /><p className="meta-font text-[8px] font-black uppercase">Audio de esta lección</p></div>
          <h4 className="mt-2 text-lg font-extrabold study-text">Explícame “{conceptTitle}”</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 study-muted">Se genera únicamente con el concepto actual: qué es, por qué importa, ejemplo, error común y mini comprobación. No resume todo el documento.</p>
        </div>
        <span className="rounded-full border study-line px-3 py-1 text-[11px] font-semibold study-muted">{summary ? durationLabel(summary.estimatedSeconds) : "2–4 min"}</span>
      </div>
      {ready && summary?.audioUrl ? <Player audioUrl={summary.audioUrl} /> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!summary || summary.status === "error" ? <button type="button" onClick={() => generate(false)} disabled={busy || !data?.manifestReady || !data?.configured || !data?.voiceConfigured} className="study-accent-bg inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-45">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Volume2 className="size-4" />} {busy ? "Generando…" : "Generar audio de la lección"}</button> : <button type="button" onClick={() => generate(true)} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border study-line px-4 text-sm font-bold study-text disabled:opacity-45">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {summary.stale ? "Actualizar audio" : "Regenerar"}</button>}
        {summary?.script && <details className="w-full rounded-xl border study-line p-3"><summary className="cursor-pointer text-sm font-bold study-accent">Ver guion</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 study-muted">{summary.script}</p></details>}
      </div>
      {!data?.manifestReady && <p className="mt-3 text-sm text-warn">Genera primero el Learning Manifest del módulo.</p>}
      {data && (!data.configured || !data.voiceConfigured) && <p className="mt-3 text-sm text-warn">Configura ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID para habilitar este audio.</p>}
      {message && <p className="mt-3 text-sm text-warn">{message}</p>}
      {!summary && !message && <p className="mt-3 inline-flex items-center gap-2 text-xs study-muted"><Sparkles className="size-3.5" /> Ideal para repasar caminando o sin mirar la pantalla.</p>}
    </section>
  );
}
