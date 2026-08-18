"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { FilePlus2, Files, Link2, Plus, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { SourceDocumentPicker } from "@/components/source-document-picker";
import { useModules } from "@/components/module-provider";
import { titleFromFileName } from "@/lib/document-storage";
import { createExternalModuleResource, uploadModuleResource } from "@/lib/resources-api";
import { externalResourceUsesHttp, inferExternalResourceType } from "@/lib/resources/client";
import type { ModuleResourceType } from "@/lib/resources/types";

const RESOURCE_ACCEPT = ".mp3,.m4a,.wav,.ogg,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.txt,.md";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

type PendingExternalResource = {
  id: string;
  title: string;
  url: string;
  resourceType: ModuleResourceType;
  source: string;
};

const EXTERNAL_RESOURCE_TYPES: Array<{ value: ModuleResourceType; label: string }> = [
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Imagen" },
  { value: "map", label: "Mapa mental" },
  { value: "presentation", label: "Presentación" },
  { value: "summary", label: "Resumen" },
  { value: "quiz", label: "Cuestionario" },
  { value: "document", label: "Documento" },
  { value: "link", label: "Enlace" },
  { value: "other", label: "Otro" },
];

function newExternalResource(): PendingExternalResource {
  return { id: crypto.randomUUID(), title: "", url: "", resourceType: "link", source: "NotebookLM" };
}

export function NewModuleForm() {
  const router = useRouter();
  const { persistence, createModule, attachSourceDocument, removeModule } = useModules();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [resourceFiles, setResourceFiles] = useState<File[]>([]);
  const [resourceSource, setResourceSource] = useState("NotebookLM");
  const [externalResources, setExternalResources] = useState<PendingExternalResource[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function onDocumentChange(file: File | null, validationError?: string) {
    setSourceFile(file);
    setError(validationError ?? "");
    if (file && !title.trim()) setTitle(titleFromFileName(file.name));
  }

  function onResourcesChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const oversized = selected.find((file) => file.size > 100 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} supera el límite de 100 MB por recurso.`);
      event.target.value = "";
      return;
    }
    setResourceFiles((current) => [...current, ...selected].filter((file, index, all) => all.findIndex((item) => item.name === file.name && item.lastModified === file.lastModified) === index));
    event.target.value = "";
  }

  function removeResource(index: number) {
    setResourceFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addExternalResource() {
    setExternalResources((current) => [...current, newExternalResource()]);
  }

  function updateExternalResource(id: string, updates: Partial<PendingExternalResource>) {
    setExternalResources((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  function updateExternalUrl(id: string, url: string) {
    const inferred = inferExternalResourceType(url);
    setExternalResources((current) => current.map((item) => item.id === id ? {
      ...item,
      url,
      ...(inferred && inferred !== "link" ? { resourceType: inferred } : {}),
    } : item));
  }

  function removeExternalResource(id: string) {
    setExternalResources((current) => current.filter((item) => item.id !== id));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceFile) {
      setError("Selecciona el documento fuente PDF o DOCX para crear el módulo.");
      return;
    }

    if (!title.trim() || !subject.trim()) {
      setError("Título y materia son obligatorios.");
      return;
    }

    setSaving(true);
    setError("");
    let studyModule;
    let sourceAttached = false;
    try {
      studyModule = await createModule({ title, subject, description });
      await attachSourceDocument(studyModule.id, sourceFile);
      sourceAttached = true;

      const validExternalResources = externalResources.filter((item) => item.url.trim());
      if (resourceFiles.length > 0 || validExternalResources.length > 0) {
        if (persistence !== "cloud") {
          try { window.sessionStorage.setItem("maestria-lab.resource-warning", "El módulo se creó, pero los recursos adicionales requieren Supabase activo para guardar sus metadatos. Puedes agregarlos después desde Recursos del módulo."); } catch { /* opcional */ }
        } else {
          const failures: string[] = [];
          let pinIndex = 0;
          for (const file of resourceFiles) {
            try {
              await uploadModuleResource(studyModule.id, file, {
                source: resourceSource.trim() || "NotebookLM",
                pinned: pinIndex++ < 4,
              });
            } catch (caught) {
              failures.push(`${file.name}: ${caught instanceof Error ? caught.message : "error"}`);
            }
          }
          for (const resource of validExternalResources) {
            try {
              await createExternalModuleResource(studyModule.id, {
                title: resource.title.trim() || "Recurso externo",
                externalUrl: resource.url.trim(),
                resourceType: resource.resourceType,
                source: resource.source.trim() || "NotebookLM",
                pinned: pinIndex++ < 4,
              });
            } catch (caught) {
              failures.push(`${resource.title || resource.url}: ${caught instanceof Error ? caught.message : "error"}`);
            }
          }
          if (failures.length) {
            try { window.sessionStorage.setItem("maestria-lab.resource-warning", `El módulo quedó creado, pero algunos recursos no pudieron guardarse: ${failures.join(" | ")}`); } catch { /* opcional */ }
          }
        }
      }

      router.push(`/modulos/${studyModule.slug}`);
    } catch (caught) {
      // Si la fuente principal ya quedó vinculada no eliminamos el módulo por un fallo opcional posterior.
      if (studyModule?.id && !sourceAttached) {
        try { await removeModule(studyModule.id); } catch { /* rollback best-effort */ }
      }
      setError(caught instanceof Error ? caught.message : "No se pudo crear el módulo con su documento fuente.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start" aria-busy={saving}>
      <aside className="border-l-4 border-moss bg-moss-soft/55 p-5 lg:sticky lg:top-24">
        <p className="meta-font text-[9px] font-bold uppercase text-moss">Módulo + recursos en un solo paso</p>
        <h2 className="display-font mt-3 text-2xl">El módulo nace conectado a todo lo que usarás para estudiar.</h2>
        <ol className="mt-5 space-y-4 text-sm leading-6 text-muted">
          <li><strong className="text-ink">01.</strong> Selecciona el PDF o DOCX principal.</li>
          <li><strong className="text-ink">02.</strong> Define la ficha académica.</li>
          <li><strong className="text-ink">03.</strong> Opcionalmente agrega audios, mapas, presentaciones y resúmenes de NotebookLM.</li>
        </ol>
        <div className="mt-6 border-t border-moss/25 pt-4">
          <p className="flex items-start gap-2 text-xs leading-5 text-moss"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Puedes subir archivos a Storage o registrar URLs de tu hosting. Los recursos no sustituyen al documento académico principal.</p>
        </div>
      </aside>

      <div className="paper-sheet border border-line">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <p className="meta-font text-[9px] font-bold uppercase text-muted">Registro académico / nuevo módulo</p>
        </div>

        <div className="space-y-7 p-5 sm:p-6 md:p-8">
          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">Documento fuente</p>
                <p className="mt-1 text-xs text-muted">El PDF o DOCX de la maestría sigue siendo la fuente principal.</p>
              </div>
              <span className="meta-font text-[9px] font-bold uppercase text-accent">Obligatorio</span>
            </div>
            <SourceDocumentPicker file={sourceFile} onChange={onDocumentChange} disabled={saving} id="new-module-document" />
          </div>

          <div className="grid gap-5 border-t border-line pt-6">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-bold text-ink">Título</label>
              <input id="title" name="title" required value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} placeholder="Ej. Probabilidad" disabled={saving} className="focus-ring min-h-12 w-full border border-line-strong bg-transparent px-4 text-base outline-none transition-colors focus:border-accent placeholder:text-muted/60 disabled:opacity-60" />
              <p className="mt-1.5 text-xs leading-5 text-muted">Si el título está vacío, usamos el nombre del archivo como punto de partida.</p>
            </div>
            <div>
              <label htmlFor="subject" className="mb-2 block text-sm font-bold text-ink">Materia</label>
              <input id="subject" name="subject" required value={subject} onChange={(event: ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)} placeholder="Ej. Matemáticas para IA" disabled={saving} className="focus-ring min-h-12 w-full border border-line-strong bg-transparent px-4 text-base outline-none transition-colors focus:border-accent placeholder:text-muted/60 disabled:opacity-60" />
            </div>
            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-bold text-ink">Descripción <span className="font-normal text-muted">(opcional)</span></label>
              <textarea id="description" name="description" rows={4} value={description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} placeholder="¿Qué estudiarás en este módulo?" disabled={saving} className="focus-ring w-full resize-y border border-line-strong bg-transparent px-4 py-3 text-base leading-6 outline-none transition-colors focus:border-accent placeholder:text-muted/60 disabled:opacity-60" />
            </div>
          </div>

          <section className="border-t border-line pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><div className="flex items-center gap-2"><Files className="size-4 text-accent" /><p className="text-sm font-bold text-ink">Recursos adicionales</p></div><p className="mt-1 text-xs text-muted">Opcional · puedes agregar más después dentro del módulo.</p></div>
              <span className="meta-font text-[9px] font-bold uppercase text-muted">NotebookLM / externos</span>
            </div>

            <label className={`mt-3 flex min-h-24 cursor-pointer items-center justify-center border border-dashed border-line-strong bg-surface-strong/45 p-4 text-center transition hover:border-accent/45 ${saving ? "pointer-events-none opacity-50" : ""}`}>
              <input type="file" multiple accept={RESOURCE_ACCEPT} onChange={onResourcesChange} disabled={saving} className="sr-only" />
              <span><UploadCloud className="mx-auto size-5 text-accent" /><span className="mt-2 block text-sm font-bold text-ink">Agregar audios, mapas, presentaciones o resúmenes</span><span className="mt-1 block text-xs text-muted">MP3/M4A/WAV · PDF/DOCX/PPTX · PNG/JPG/WEBP · MP4 · TXT/MD · 100 MB máximo por archivo</span></span>
            </label>

            {resourceFiles.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {resourceFiles.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 border border-line bg-surface px-3 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center bg-accent-soft text-accent"><Files className="size-3.5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{file.name}</p><p className="mt-0.5 text-[10px] text-muted">{formatSize(file.size)}</p></div>
                    <button type="button" onClick={() => removeResource(index)} disabled={saving} aria-label={`Quitar ${file.name}`} className="focus-ring grid size-8 shrink-0 place-items-center text-muted hover:bg-[#fff3ed] hover:text-warn"><X className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {resourceFiles.length > 0 && <label className="mt-3 block max-w-sm text-xs font-bold text-ink">Origen de estos recursos<input value={resourceSource} onChange={(event) => setResourceSource(event.target.value)} disabled={saving} placeholder="NotebookLM" className="focus-ring mt-1.5 min-h-10 w-full border border-line bg-surface px-3 text-sm font-normal" /></label>}

            <div className="mt-5 border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="flex items-center gap-2"><Link2 className="size-4 text-accent" /><p className="text-sm font-bold text-ink">Recursos desde tu hosting</p></div><p className="mt-1 text-xs leading-5 text-muted">Pega URLs directas HTTPS a MP3, MP4, PDF, imágenes u otros archivos. Los recursos compatibles se insertan dentro de Maestría Lab.</p></div>
                <button type="button" onClick={addExternalResource} disabled={saving} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-accent"><Plus className="size-3.5" /> Agregar URL</button>
              </div>

              {externalResources.length > 0 && <div className="mt-3 space-y-3">
                {externalResources.map((resource) => (
                  <article key={resource.id} className="rounded-[16px] border border-line bg-surface-strong/45 p-3.5">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.4fr)_170px_150px_auto] md:items-center">
                      <input value={resource.title} onChange={(event) => updateExternalResource(resource.id, { title: event.target.value })} disabled={saving} placeholder="Título" className="focus-ring min-h-10 min-w-0 rounded-xl border border-line bg-surface px-3 text-sm" />
                      <input value={resource.url} onChange={(event) => updateExternalUrl(resource.id, event.target.value)} disabled={saving} placeholder="https://tudominio.com/maestria/audio.mp3" className="focus-ring min-h-10 min-w-0 rounded-xl border border-line bg-surface px-3 text-sm" />
                      <select value={resource.resourceType} onChange={(event) => updateExternalResource(resource.id, { resourceType: event.target.value as ModuleResourceType })} disabled={saving} className="focus-ring min-h-10 min-w-0 rounded-xl border border-line bg-surface px-3 text-sm">{EXTERNAL_RESOURCE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                      <input value={resource.source} onChange={(event) => updateExternalResource(resource.id, { source: event.target.value })} disabled={saving} placeholder="NotebookLM" className="focus-ring min-h-10 min-w-0 rounded-xl border border-line bg-surface px-3 text-sm" />
                      <button type="button" onClick={() => removeExternalResource(resource.id)} disabled={saving} aria-label="Quitar recurso externo" className="focus-ring grid size-10 place-items-center rounded-xl text-muted hover:bg-[#fff3ed] hover:text-warn"><X className="size-4" /></button>
                    </div>
                    {externalResourceUsesHttp(resource.url) && <p className="mt-2 rounded-xl bg-[#fff5ec] px-3 py-2 text-xs font-semibold leading-5 text-warn">Usa HTTPS: Maestría Lab está en HTTPS y el navegador puede bloquear este recurso HTTP.</p>}
                  </article>
                ))}
              </div>}
            </div>

            {persistence !== "cloud" && (resourceFiles.length > 0 || externalResources.some((item) => item.url.trim())) && <p className="mt-3 border-l-2 border-warn pl-3 text-xs leading-5 text-muted">En modo local se creará el módulo y podrás añadir estos recursos después cuando Supabase esté conectado.</p>}
          </section>

          <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-xs leading-5 text-muted">Con Supabase activo, guardamos la fuente, los archivos subidos y las URLs de tu hosting. Los primeros cuatro recursos se fijan automáticamente en la parte superior del módulo.</p>
            <button type="submit" disabled={saving || !sourceFile} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-bold text-white transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45">
              <FilePlus2 className="size-4" aria-hidden="true" /> {saving ? (persistence === "cloud" ? "Creando y subiendo…" : "Guardando módulo…") : "Crear módulo"}
            </button>
          </div>

          {error && <div role="alert" className="border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6 text-ink">{error}</div>}
        </div>
      </div>
    </form>
  );
}
