"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen, File, FileAudio, FileImage, FileText, Film, Link2, LoaderCircle,
  Map, Music2, Pin, PinOff, Play, Plus, Presentation, Trash2, UploadCloud,
} from "lucide-react";
import { getLearningManifest } from "@/lib/learning-api";
import { externalResourceUsesHttp, inferExternalResourceType } from "@/lib/resources/client";
import { isEmbeddableResource, ResourcePreviewModal } from "@/components/resources/resource-preview-modal";
import {
  createExternalModuleResource,
  deleteModuleResource,
  getModuleResourceUrl,
  getModuleResources,
  updateModuleResource,
  uploadModuleResource,
} from "@/lib/resources-api";
import type { ModuleResource, ModuleResourceType } from "@/lib/resources/types";
import type { LearningManifest } from "@/lib/pedagogy/types";

const ACCEPT = ".mp3,.m4a,.wav,.ogg,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.txt,.md";

const labels: Record<ModuleResourceType, string> = {
  audio: "Audio", pdf: "PDF", document: "Documento", presentation: "Presentación", image: "Imagen",
  video: "Video", map: "Mapa", summary: "Resumen", quiz: "Cuestionario", link: "Enlace", other: "Recurso",
};

function resourceIcon(type: ModuleResourceType, className = "size-4") {
  if (type === "audio") return <Music2 className={className} />;
  if (type === "pdf") return <BookOpen className={className} />;
  if (type === "presentation") return <Presentation className={className} />;
  if (type === "image") return <FileImage className={className} />;
  if (type === "video") return <Film className={className} />;
  if (type === "map") return <Map className={className} />;
  if (type === "link") return <Link2 className={className} />;
  if (type === "summary") return <FileText className={className} />;
  return <File className={className} />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function parseScope(value: string) {
  if (value === "module") return { topicId: null, conceptId: null };
  const [topicId, conceptId] = value.split("::");
  return { topicId: topicId || null, conceptId: conceptId || null };
}


function scopeValue(resource: ModuleResource) {
  if (!resource.topicId) return "module";
  return `${resource.topicId}::${resource.conceptId || ""}`;
}

function scopeLabel(resource: ModuleResource, manifest: LearningManifest | null) {
  if (!resource.topicId) return "Todo el módulo";
  const topic = manifest?.topics.find((item) => item.id === resource.topicId);
  if (!resource.conceptId) return topic?.title || "Tema específico";
  const concept = topic?.concepts.find((item) => item.id === resource.conceptId);
  return concept?.title || topic?.title || "Concepto específico";
}



export function ModuleResourceHub({ moduleId }: { moduleId: string }) {
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [manifest, setManifest] = useState<LearningManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [source, setSource] = useState("NotebookLM");
  const [scope, setScope] = useState("module");
  const [pinUploads, setPinUploads] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<ModuleResourceType>("link");
  const [linkBusy, setLinkBusy] = useState(false);
  const [preview, setPreview] = useState<{ resource: ModuleResource; url: string } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const result = await getModuleResources(moduleId);
      setResources(result.resources);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los recursos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    getLearningManifest(moduleId).then((record) => setManifest(record.status === "ready" ? record.manifest || null : null)).catch(() => undefined);
    try {
      const warning = window.sessionStorage.getItem("maestria-lab.resource-warning");
      if (warning) { setMessage(warning); window.sessionStorage.removeItem("maestria-lab.resource-warning"); }
    } catch { /* opcional */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const featured = useMemo(() => {
    const pinned = resources.filter((item) => item.pinned);
    const base = pinned.length ? pinned : resources;
    return (showAll ? resources : base.slice(0, 4));
  }, [resources, showAll]);

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  async function uploadFiles() {
    if (!files.length) return;
    setUploading(true); setMessage("");
    const parsedScope = parseScope(scope);
    let completed = 0;
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      try {
        await uploadModuleResource(moduleId, file, { source, ...parsedScope, pinned: pinUploads && index < 4 });
        completed += 1;
      } catch (error) {
        failures.push(`${file.name}: ${error instanceof Error ? error.message : "error"}`);
      }
    }
    setFiles([]);
    setUploading(false);
    await load();
    if (failures.length) setMessage(`${completed} recurso(s) guardados. ${failures.length} fallaron: ${failures.join(" | ")}`);
    else setMessage(`${completed} recurso(s) agregados al módulo.`);
  }

  async function addLink() {
    if (!linkUrl.trim()) return;
    setLinkBusy(true); setMessage("");
    try {
      const parsedScope = parseScope(scope);
      await createExternalModuleResource(moduleId, { title: linkTitle.trim() || "Recurso externo", externalUrl: linkUrl.trim(), source, resourceType: linkType, ...parsedScope, pinned: pinUploads });
      setLinkTitle(""); setLinkUrl("");
      await load();
      setMessage("Enlace agregado al módulo.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo agregar el enlace."); }
    finally { setLinkBusy(false); }
  }

  async function togglePin(resource: ModuleResource) {
    try {
      const updated = await updateModuleResource(moduleId, resource.id, { pinned: !resource.pinned });
      setResources((current) => current.map((item) => item.id === resource.id ? updated : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar el recurso."); }
  }

  async function updateMetadata(resource: ModuleResource, input: { resourceType?: ModuleResourceType; scope?: string }) {
    try {
      const scopeInput = input.scope !== undefined ? parseScope(input.scope) : {};
      const updated = await updateModuleResource(moduleId, resource.id, {
        ...(input.resourceType ? { resourceType: input.resourceType } : {}),
        ...scopeInput,
      });
      setResources((current) => current.map((item) => item.id === resource.id ? updated : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar el recurso."); }
  }

  async function remove(resource: ModuleResource) {
    if (!window.confirm(`¿Eliminar “${resource.title}” del módulo?`)) return;
    try {
      await deleteModuleResource(moduleId, resource.id);
      setResources((current) => current.filter((item) => item.id !== resource.id));
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo eliminar el recurso."); }
  }

  async function openResource(resource: ModuleResource) {
    setOpeningId(resource.id); setMessage("");
    try {
      const result = await getModuleResourceUrl(moduleId, resource.id);
      if (isEmbeddableResource(resource)) {
        setPreview({ resource, url: result.url });
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo abrir el recurso."); }
    finally { setOpeningId(null); }
  }

  const resourceTypes: Array<{ value: ModuleResourceType; label: string }> = [
    { value: "audio", label: "Audio" },
    { value: "video", label: "Video" },
    { value: "pdf", label: "PDF" },
    { value: "image", label: "Imagen" },
    { value: "map", label: "Mapa mental" },
    { value: "presentation", label: "Presentación" },
    { value: "summary", label: "Resumen" },
    { value: "quiz", label: "Cuestionario" },
    { value: "document", label: "Documento" },
    { value: "link", label: "Enlace externo" },
    { value: "other", label: "Otro" },
  ];

  return (
    <section className="mt-3 rounded-[20px] border border-line bg-surface px-4 py-4 shadow-[0_7px_22px_rgba(23,53,91,.035)] sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><FileAudio className="size-4" /></span>
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-[17px] font-black text-ink">Recursos del módulo</h2>{resources.length > 0 && <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[11px] font-bold text-muted">{resources.length}</span>}</div><p className="mt-0.5 text-[13px] text-muted">Audios, mapas, resúmenes y materiales de NotebookLM a la mano.</p></div>
        </div>
        <div className="flex items-center gap-2">
          {resources.length > 4 && <button type="button" onClick={() => setShowAll((value) => !value)} className="focus-ring min-h-10 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted">{showAll ? "Ver destacados" : `Ver todos (${resources.length})`}</button>}
          <button type="button" onClick={() => setManagerOpen((value) => !value)} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-3.5 text-xs font-bold text-white"><Plus className="size-3.5" /> Agregar recurso</button>
        </div>
      </div>

      {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Cargando recursos…</div> : resources.length === 0 ? (
        <button type="button" onClick={() => setManagerOpen(true)} className="mt-4 flex w-full items-center justify-between gap-4 rounded-[16px] border border-dashed border-line-strong bg-surface-strong/50 px-4 py-4 text-left hover:border-accent/45">
          <div><p className="text-sm font-bold text-ink">Trae aquí lo que generes en NotebookLM</p><p className="mt-1 text-[13px] leading-5 text-muted">Puedes subir varios archivos ahora y seguir agregando recursos después.</p></div><UploadCloud className="size-5 shrink-0 text-accent" />
        </button>
      ) : (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((resource) => (
            <article key={resource.id} className="group relative rounded-[16px] border border-line bg-surface-strong/55 p-3.5 transition hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface">
              <div className="flex items-start justify-between gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent shadow-sm">{resourceIcon(resource.resourceType)}</span>
                {resource.pinned && <Pin className="size-3.5 fill-current text-[#d38a19]" />}
              </div>
              <p className="meta-font mt-3 text-[8px] font-bold uppercase text-muted">{labels[resource.resourceType]} · {resource.source}</p>
              <h3 className="mt-1 line-clamp-2 text-[14px] font-black leading-5 text-ink">{resource.title}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] text-muted">{scopeLabel(resource, manifest)}{resource.sizeBytes ? ` · ${formatSize(resource.sizeBytes)}` : ""}</p>
              <button type="button" onClick={() => openResource(resource)} disabled={openingId === resource.id} className="focus-ring mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-accent disabled:opacity-45">{openingId === resource.id ? <LoaderCircle className="size-3.5 animate-spin" /> : resource.resourceType === "audio" || resource.resourceType === "video" ? <Play className="size-3.5" /> : <BookOpen className="size-3.5" />} {resource.resourceType === "audio" ? "Reproducir aquí" : resource.resourceType === "video" ? "Ver aquí" : isEmbeddableResource(resource) ? "Ver aquí" : "Abrir"}</button>
            </article>
          ))}
        </div>
      )}

      {managerOpen && (
        <div className="mt-5 grid gap-5 border-t border-line pt-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)]">
          <section>
            <div className="flex items-center justify-between gap-3"><div><p className="meta-font text-[9px] font-bold uppercase text-accent">Subir archivos</p><h3 className="mt-1 text-lg font-black text-ink">Agrega varios recursos a la vez</h3></div><span className="text-[11px] text-muted">Máx. 100 MB c/u</span></div>
            <label className="mt-3 flex min-h-24 cursor-pointer items-center justify-center rounded-[16px] border border-dashed border-line-strong bg-surface-strong/50 p-4 text-center hover:border-accent/45">
              <input type="file" multiple accept={ACCEPT} onChange={onFiles} className="sr-only" />
              <span><UploadCloud className="mx-auto size-5 text-accent" /><span className="mt-2 block text-sm font-bold text-ink">Seleccionar recursos</span><span className="mt-1 block text-xs text-muted">Audio, PDF, PPTX, imágenes, video, DOCX, TXT…</span></span>
            </label>
            {files.length > 0 && <div className="mt-3 space-y-1.5">{files.map((file) => <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-2 rounded-xl bg-surface-strong px-3 py-2 text-xs"><span className="truncate font-semibold text-ink">{file.name}</span><span className="shrink-0 text-muted">{formatSize(file.size)}</span></div>)}</div>}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-ink">Origen<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="NotebookLM" className="focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm" /></label>
              <label className="text-xs font-bold text-ink">Relacionado con<select value={scope} onChange={(event) => setScope(event.target.value)} className="focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm"><option value="module">Todo el módulo</option>{manifest?.topics.map((topic) => <optgroup key={topic.id} label={topic.title}><option value={`${topic.id}::`}>Tema completo · {topic.title}</option>{topic.concepts.map((concept) => <option key={concept.id} value={`${topic.id}::${concept.id}`}>{concept.title}</option>)}</optgroup>)}</select></label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted"><input type="checkbox" checked={pinUploads} onChange={(event) => setPinUploads(event.target.checked)} /> Fijar arriba como recurso destacado</label>
            <button type="button" onClick={uploadFiles} disabled={uploading || files.length === 0} className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-45">{uploading ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} {uploading ? "Subiendo…" : `Subir ${files.length || ""} recurso${files.length === 1 ? "" : "s"}`}</button>
          </section>

          <section className="border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <p className="meta-font text-[9px] font-bold uppercase text-accent">Desde tu hosting</p><h3 className="mt-1 text-lg font-black text-ink">Inserta un recurso por URL</h3><p className="mt-1 text-xs leading-5 text-muted">Audio, video, PDF, imágenes y mapas se abrirán dentro de Maestría Lab. Usa una URL HTTPS directa al archivo.</p>
            <div className="mt-3 grid gap-3">
              <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Título del recurso" className="focus-ring min-h-10 rounded-xl border border-line bg-surface px-3 text-sm" />
              <input value={linkUrl} onChange={(event) => { const value = event.target.value; setLinkUrl(value); const inferred = inferExternalResourceType(value); if (inferred && inferred !== "link") setLinkType(inferred); }} placeholder="https://tudominio.com/maestria/recurso.mp3" className="focus-ring min-h-10 rounded-xl border border-line bg-surface px-3 text-sm" />
              <select value={linkType} onChange={(event) => setLinkType(event.target.value as ModuleResourceType)} className="focus-ring min-h-10 rounded-xl border border-line bg-surface px-3 text-sm">{resourceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              {externalResourceUsesHttp(linkUrl) && <p className="rounded-xl bg-[#fff5ec] px-3 py-2 text-xs font-semibold leading-5 text-warn">Tu web está en HTTPS. Una URL HTTP puede ser bloqueada por el navegador; usa HTTPS en tu hosting.</p>}
              <button type="button" onClick={addLink} disabled={linkBusy || !linkUrl.trim()} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-ink disabled:opacity-45">{linkBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4 text-accent" />} Guardar enlace</button>
            </div>
          </section>

          {resources.length > 0 && <section className="xl:col-span-2 border-t border-line pt-4"><div className="flex items-center justify-between"><p className="text-sm font-black text-ink">Administrar recursos</p><span className="text-xs text-muted">{resources.length} guardados</span></div><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <article key={resource.id} className="rounded-xl border border-line bg-surface p-3"><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-strong text-accent">{resourceIcon(resource.resourceType, "size-3.5")}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{resource.title}</p><p className="mt-0.5 truncate text-[10px] text-muted">{resource.source}</p></div><button type="button" onClick={() => togglePin(resource)} title={resource.pinned ? "Quitar de destacados" : "Fijar arriba"} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-strong hover:text-accent">{resource.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}</button><button type="button" onClick={() => remove(resource)} title="Eliminar" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-[#fff2ed] hover:text-warn"><Trash2 className="size-3.5" /></button></div><div className="mt-2 grid grid-cols-2 gap-2"><select value={resource.resourceType} onChange={(event) => updateMetadata(resource, { resourceType: event.target.value as ModuleResourceType })} className="min-h-8 min-w-0 rounded-lg border border-line bg-surface px-2 text-[10px] text-muted">{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><select value={scopeValue(resource)} onChange={(event) => updateMetadata(resource, { scope: event.target.value })} className="min-h-8 min-w-0 rounded-lg border border-line bg-surface px-2 text-[10px] text-muted"><option value="module">Todo el módulo</option>{manifest?.topics.map((topic) => <optgroup key={topic.id} label={topic.title}><option value={`${topic.id}::`}>Tema · {topic.title}</option>{topic.concepts.map((concept) => <option key={concept.id} value={`${topic.id}::${concept.id}`}>{concept.title}</option>)}</optgroup>)}</select></div></article>)}</div></section>}
        </div>
      )}

      {message && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${/falta ejecutar|fallaron|no se pudo|requieren/i.test(message) ? "bg-[#fff5ec] text-warn" : "bg-moss-soft text-moss"}`}>{message}</p>}
      {preview && <ResourcePreviewModal resource={preview.resource} url={preview.url} onClose={() => setPreview(null)} />}
    </section>
  );
}
