"use client";

import { useEffect, useState } from "react";
import { Headphones, LoaderCircle, Volume2 } from "lucide-react";
import { generateAudioSummary, getAudioSummaries } from "@/lib/audio-api";
import type { AudioSummaryResponse } from "@/lib/audio/types";

export function AudioQuickPanel({ moduleId }: { moduleId: string }) {
  const [data, setData] = useState<AudioSummaryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let cancelled = false; getAudioSummaries(moduleId).then((result) => { if (!cancelled) setData(result); }).catch(() => undefined); return () => { cancelled = true; }; }, [moduleId]);
  const summary = data?.summaries.find((item) => item.kind === "short" && item.status === "ready" && item.audioUrl);
  async function create() { setBusy(true); setMessage(""); try { setData(await generateAudioSummary(moduleId, "short", false)); } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo generar el audio."); } finally { setBusy(false); } }
  if (!data?.manifestReady) return null;
  return (
    <section className="workspace-panel rounded-[22px] p-4">
      <div className="flex items-center gap-2 text-signal"><Headphones className="size-4" /><p className="meta-font text-[9px] font-black uppercase">Repaso con audio</p></div>
      {summary?.audioUrl ? <><p className="mt-2 text-sm leading-6 text-muted">Resumen breve para caminar, trasladarte o repasar sin mirar la pantalla.</p><audio src={summary.audioUrl} controls preload="none" className="mt-3 w-full" /></> : <><p className="mt-2 text-sm leading-6 text-muted">Genera una versión de 2–3 minutos cuando quieras repasar fuera de la mesa.</p><button type="button" onClick={create} disabled={busy || !data.configured || !data.voiceConfigured} className="focus-ring mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-[#f8faff] px-3 text-sm font-bold text-signal disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Volume2 className="size-4" />} Generar resumen breve</button></>}
      {message && <p className="mt-2 text-xs font-bold text-warn">{message}</p>}
    </section>
  );
}
