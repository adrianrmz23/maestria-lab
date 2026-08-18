"use client";

import { type RefObject, useRef, useState } from "react";
import { ExternalLink, Maximize2, Minus, Plus, X } from "lucide-react";
import type { ModuleResource } from "@/lib/resources/types";

const typeLabels: Record<ModuleResource["resourceType"], string> = {
  audio: "Audio",
  pdf: "PDF",
  document: "Documento",
  presentation: "Presentación",
  image: "Imagen",
  video: "Video",
  map: "Mapa",
  summary: "Resumen",
  quiz: "Cuestionario",
  link: "Enlace",
  other: "Recurso",
};

function MediaSpeed<T extends HTMLMediaElement>({ elementRef }: { elementRef: RefObject<T | null> }) {
  const [speed, setSpeed] = useState(1);
  const speeds = [1, 1.25, 1.5, 1.75, 2];

  function choose(next: number) {
    setSpeed(next);
    if (elementRef.current) elementRef.current.playbackRate = next;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="meta-font mr-1 text-[9px] font-bold uppercase text-muted">Velocidad</span>
      {speeds.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          className={`focus-ring min-h-9 rounded-lg border px-2.5 text-xs font-bold ${speed === value ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted hover:border-accent hover:text-accent"}`}
        >
          {value}x
        </button>
      ))}
    </div>
  );
}

function AudioPreview({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  return (
    <div className="mx-auto w-full max-w-3xl rounded-[18px] border border-line bg-surface p-4 sm:p-5">
      <audio ref={audioRef} src={url} controls autoPlay preload="metadata" className="w-full" />
      <MediaSpeed elementRef={audioRef} />
      <p className="mt-3 text-xs leading-5 text-muted">Si puedes reproducir pero no adelantar correctamente, revisa que tu hosting permita solicitudes HTTP Range.</p>
    </div>
  );
}

function VideoPreview({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <video ref={videoRef} src={url} controls autoPlay preload="metadata" playsInline className="mx-auto max-h-[66vh] w-full rounded-xl bg-black" />
      <MediaSpeed elementRef={videoRef} />
    </div>
  );
}

function ImagePreview({ resource, url }: { resource: ModuleResource; url: string }) {
  const [zoom, setZoom] = useState(1);
  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setZoom((value) => Math.max(.5, value - .25))} className="focus-ring grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted"><Minus className="size-4" /></button>
        <span className="min-w-14 text-center text-xs font-bold text-muted">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(3, value + .25))} className="focus-ring grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted"><Plus className="size-4" /></button>
      </div>
      <div className="max-h-[67vh] overflow-auto rounded-xl bg-[#eef2f8] p-3 text-center">
        <img src={url} alt={resource.title} className="mx-auto h-auto max-w-none rounded-xl object-contain transition-transform" style={{ width: `${zoom * 100}%` }} />
      </div>
    </div>
  );
}

export function isEmbeddableResource(resource: ModuleResource) {
  return ["audio", "video", "image", "map", "pdf"].includes(resource.resourceType);
}

export function ResourcePreviewModal({ resource, url, onClose }: { resource: ModuleResource; url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#07111f]/65 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[24px] border border-line bg-surface shadow-[0_30px_100px_rgba(8,29,55,.30)]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="meta-font text-[9px] font-bold uppercase text-accent">{typeLabels[resource.resourceType]} · {resource.source}{resource.externalUrl ? " · Hosting externo" : ""}</p>
            <h3 className="mt-1 truncate text-lg font-black text-ink sm:text-xl">{resource.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} className="focus-ring hidden min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted hover:border-accent hover:text-accent sm:inline-flex"><ExternalLink className="size-3.5" /> Abrir original</button>
            <button type="button" onClick={onClose} className="focus-ring grid size-10 place-items-center rounded-xl border border-line bg-surface text-muted"><X className="size-4" /></button>
          </div>
        </header>
        <div className="max-h-[80vh] overflow-auto bg-surface-strong p-4 sm:p-6">
          {resource.resourceType === "audio" && <AudioPreview url={url} />}
          {resource.resourceType === "video" && <VideoPreview url={url} />}
          {(resource.resourceType === "image" || resource.resourceType === "map") && <ImagePreview resource={resource} url={url} />}
          {resource.resourceType === "pdf" && (
            <div>
              <iframe src={url} title={resource.title} className="h-[70vh] w-full rounded-xl border border-line bg-white" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>Si tu hosting bloque el visor incrustado, usa “Abrir original”.</span>
                <button type="button" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 font-bold text-accent"><Maximize2 className="size-3.5" /> Abrir PDF</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
