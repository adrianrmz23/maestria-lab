"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileImage, Film, LoaderCircle, Music2, Play, Presentation } from "lucide-react";
import { isEmbeddableResource, ResourcePreviewModal } from "@/components/resources/resource-preview-modal";
import { getModuleResourceUrl, getModuleResources } from "@/lib/resources-api";
import type { ModuleResource } from "@/lib/resources/types";

function icon(resource: ModuleResource) {
  if (resource.resourceType === "audio") return <Music2 className="size-4" />;
  if (resource.resourceType === "presentation") return <Presentation className="size-4" />;
  if (resource.resourceType === "image" || resource.resourceType === "map") return <FileImage className="size-4" />;
  if (resource.resourceType === "video") return <Film className="size-4" />;
  return <BookOpen className="size-4" />;
}

export function ConceptResourceStrip({ moduleId, topicId, conceptId }: { moduleId: string; topicId: string; conceptId: string }) {
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [audioUrl, setAudioUrl] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ resource: ModuleResource; url: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setAudioUrl({});
    setPreview(null);
    setMessage("");
    getModuleResources(moduleId)
      .then((result) => {
        if (cancelled) return;
        setResources(result.resources.filter((resource) =>
          resource.conceptId === conceptId || (!resource.conceptId && resource.topicId === topicId),
        ).slice(0, 4));
      })
      .catch(() => { if (!cancelled) setResources([]); });
    return () => { cancelled = true; };
  }, [moduleId, topicId, conceptId]);

  async function open(resource: ModuleResource) {
    setBusyId(resource.id);
    setMessage("");
    try {
      const result = await getModuleResourceUrl(moduleId, resource.id);
      if (resource.resourceType === "audio") {
        setAudioUrl((current) => ({ ...current, [resource.id]: result.url }));
      } else if (isEmbeddableResource(resource)) {
        setPreview({ resource, url: result.url });
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir el recurso.");
    } finally {
      setBusyId(null);
    }
  }

  if (!resources.length) return null;

  return (
    <section className="lab-section border-t border-line pt-6">
      <div className="lab-section-heading"><span className="lab-step">R</span><div><p className="meta-font text-[9px] font-black uppercase text-accent">Recursos relacionados</p><h3 className="mt-1 text-[22px] font-black text-ink">También tienes material para esta lección</h3><p className="mt-1 text-sm leading-6 text-muted">Los recursos de tu hosting se reproducen o visualizan aquí mismo; no necesitas cambiar de pestaña.</p></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {resources.map((resource) => (
          <article key={resource.id} className="rounded-[16px] border border-line bg-surface-strong/55 p-4">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent">{icon(resource)}</span><div className="min-w-0"><p className="meta-font text-[8px] font-bold uppercase text-muted">{resource.source}{resource.externalUrl ? " · hosting" : ""}</p><p className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-ink">{resource.title}</p></div></div>
            {audioUrl[resource.id] ? (
              <div className="mt-3">
                <audio src={audioUrl[resource.id]} controls autoPlay preload="metadata" className="w-full" />
                <button type="button" onClick={() => setAudioUrl((current) => { const next = { ...current }; delete next[resource.id]; return next; })} className="focus-ring mt-2 text-xs font-bold text-muted hover:text-accent">Ocultar reproductor</button>
              </div>
            ) : (
              <button type="button" onClick={() => open(resource)} disabled={busyId === resource.id} className="focus-ring mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-accent disabled:opacity-45">
                {busyId === resource.id ? <LoaderCircle className="size-3.5 animate-spin" /> : resource.resourceType === "audio" || resource.resourceType === "video" ? <Play className="size-3.5" /> : <BookOpen className="size-3.5" />}
                {resource.resourceType === "audio" ? "Reproducir aquí" : isEmbeddableResource(resource) ? "Ver aquí" : "Abrir recurso"}
              </button>
            )}
          </article>
        ))}
      </div>
      {message && <p role="status" className="mt-3 rounded-xl bg-[#fff5ec] px-3 py-2 text-xs font-semibold text-warn">{message}</p>}
      {preview && <ResourcePreviewModal resource={preview.resource} url={preview.url} onClose={() => setPreview(null)} />}
    </section>
  );
}
