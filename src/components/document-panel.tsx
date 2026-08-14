"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenText, Download, ExternalLink, FileCheck2, FileText, HardDrive, Link2Off, RefreshCw, ScanText, ShieldCheck, TriangleAlert } from "lucide-react";
import { SourceDocumentPicker } from "@/components/source-document-picker";
import { ExtractionInspector } from "@/components/extraction-inspector";
import { useModules } from "@/components/module-provider";
import { formatDocumentSize } from "@/lib/document-storage";
import type { SourceDocumentMeta, StudyModule } from "@/lib/mock-data";

function extractionLabel(document: SourceDocumentMeta) {
  if (document.storage !== "cloud") return { label: "Pendiente de Supabase", tone: "text-warn" };
  if (document.extractionStatus === "ready") return { label: "Texto extraído", tone: "text-moss" };
  if (document.extractionStatus === "error") return { label: "Extracción con error", tone: "text-warn" };
  if (document.extractionStatus === "extracting") return { label: "Extrayendo contenido…", tone: "text-accent" };
  return { label: "Pendiente de extracción", tone: "text-muted" };
}

export function DocumentPanel({ module }: { module: StudyModule }) {
  const { persistence, attachSourceDocument, detachSourceDocument, retrySourceExtraction, getSourceDocumentUrl } = useModules();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function onPick(file: File | null, error?: string) {
    setSelectedFile(file);
    setMessage(error ?? "");
  }

  async function attach() {
    if (!selectedFile) {
      setMessage("Selecciona un PDF o DOCX antes de guardar.");
      return;
    }

    setBusy(true);
    setMessage(persistence === "cloud"
      ? "Subiendo a Storage privado y extrayendo el contenido…"
      : "Supabase no está configurado; guardando una copia local de respaldo…");

    try {
      const document = await attachSourceDocument(module.id, selectedFile);
      setSelectedFile(null);
      if (document.storage === "cloud" && document.extractionStatus === "ready") {
        setMessage("Documento guardado en Supabase y texto extraído correctamente.");
      } else if (document.storage === "cloud" && document.extractionStatus === "error") {
        setMessage(`El archivo quedó guardado, pero la extracción necesita atención: ${document.extractionError ?? "revisa el documento y reintenta."}`);
      } else {
        setMessage("Documento asociado en modo local. Cuando actives Supabase podrás migrarlo.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo asociar el documento.");
    } finally {
      setBusy(false);
    }
  }

  async function openFile(download = false) {
    setBusy(true);
    try {
      const url = await getSourceDocumentUrl(module.id, download);
      if (!url) {
        setMessage("El archivo ya no está disponible. Puedes desvincularlo y volver a asociarlo.");
        return;
      }

      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        if (persistence === "local") anchor.download = module.sourceDocument?.name ?? "documento";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }

      if (persistence === "local") window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir el documento.");
    } finally {
      setBusy(false);
    }
  }

  async function detach() {
    const location = persistence === "cloud" ? "Supabase Storage" : "el almacenamiento local";
    const confirmed = window.confirm(`¿Desvincular el documento fuente? Se eliminará de ${location}, pero el módulo seguirá existiendo.`);
    if (!confirmed) return;

    setBusy(true);
    setMessage("Desvinculando documento…");
    try {
      await detachSourceDocument(module.id);
      setMessage("Documento desvinculado. Ya puedes asociar otra fuente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desvincular el documento.");
    } finally {
      setBusy(false);
    }
  }

  async function retryExtraction() {
    setBusy(true);
    setMessage("Reintentando extracción desde la copia almacenada en Supabase…");
    try {
      const document = await retrySourceExtraction(module.id);
      if (document?.extractionStatus === "ready") setMessage("Extracción completada correctamente.");
      else setMessage(document?.extractionError || "La extracción sigue sin poder completarse.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reintentar la extracción.");
    } finally {
      setBusy(false);
    }
  }

  const source = module.sourceDocument;
  const extraction = source ? extractionLabel(source) : null;

  return (
    <section className="mt-8 border-t-2 border-ink pt-5" aria-labelledby="source-document-heading">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="meta-font text-[9px] font-bold uppercase text-accent">Documento fuente / Bloque 4</p>
          <h2 id="source-document-heading" className="display-font mt-1 text-3xl">Fuente académica y extracción</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">El archivo original permanece separado del contenido extraído. En PDF conservamos una unidad por página para mantener trazabilidad hacia la fuente.</p>
        </div>
        <div className={`inline-flex min-h-10 items-center gap-2 border-l-2 pl-3 text-xs font-bold ${persistence === "cloud" ? "border-moss text-moss" : "border-warn text-warn"}`}>
          <ShieldCheck className="size-4" aria-hidden="true" /> {persistence === "cloud" ? "Storage privado activo" : "Modo local de respaldo"}
        </div>
      </div>

      {source ? (
        <div className="paper-sheet mt-5 border border-line">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[56px_minmax(0,1fr)_auto] lg:items-center">
            <span className={`grid size-12 place-items-center border ${source.extractionStatus === "error" ? "border-warn bg-accent-soft/40 text-warn" : "border-moss/40 bg-moss-soft/55 text-moss"}`}>
              {source.extractionStatus === "error" ? <TriangleAlert className="size-5" aria-hidden="true" /> : <FileCheck2 className="size-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{source.name}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{source.kind}</span>
                <span>{formatDocumentSize(source.size)}</span>
                <span className="font-bold text-moss">{source.storage === "cloud" ? "Supabase Storage" : "Copia local"}</span>
                {extraction && <span className={`font-bold ${extraction.tone}`}>{extraction.label}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openFile(false)} disabled={busy} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"><ExternalLink className="size-3.5" aria-hidden="true" /> Abrir</button>
              <button type="button" onClick={() => openFile(true)} disabled={busy} className="focus-ring inline-flex min-h-11 items-center gap-2 border border-line-strong px-4 text-xs font-bold text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"><Download className="size-3.5" aria-hidden="true" /> Descargar</button>
            </div>
          </div>

          <div className="grid border-t border-line sm:grid-cols-4">
            {[
              ["01", "Fuente", source.storage === "cloud" ? "Storage listo" : "Local", source.storage === "cloud"],
              ["02", "Extracción", source.extractionStatus === "ready" ? "Completada" : source.extractionStatus === "error" ? "Revisar" : "Pendiente", source.extractionStatus === "ready"],
              ["03", "Unidades", source.extractionStatus === "ready" ? `${source.unitCount ?? 0} registradas` : "Pendiente", source.extractionStatus === "ready"],
              ["04", "Learning Manifest", "Motor pedagógico", false],
            ].map(([code, label, state, ready], index) => (
              <div key={String(code)} className={`min-h-24 p-4 ${index > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
                <p className={`meta-font text-[9px] font-bold uppercase ${ready ? "text-moss" : state === "Revisar" ? "text-warn" : "text-muted"}`}>{code} · {state}</p>
                <p className="mt-2 text-sm font-bold text-ink">{label}</p>
              </div>
            ))}
          </div>

          {source.storage === "cloud" && source.extractionStatus === "ready" && (
            <div className="grid gap-5 border-t border-line p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-1">
                {source.pageCount !== undefined && <div><dt className="meta-font text-[9px] uppercase text-muted">Páginas PDF</dt><dd className="mt-1 display-font text-2xl">{source.pageCount}</dd></div>}
                <div><dt className="meta-font text-[9px] uppercase text-muted">Palabras</dt><dd className="mt-1 display-font text-2xl">{(source.wordCount ?? 0).toLocaleString("es-MX")}</dd></div>
                <div><dt className="meta-font text-[9px] uppercase text-muted">Caracteres</dt><dd className="mt-1 display-font text-2xl">{(source.charCount ?? 0).toLocaleString("es-MX")}</dd></div>
              </dl>
              <div className="border-l-2 border-moss pl-4">
                <div className="flex items-center gap-2 text-moss"><ScanText className="size-4" aria-hidden="true" /><span className="meta-font text-[9px] font-bold uppercase">Vista previa del contenido extraído</span></div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{source.previewText || "El texto fue extraído correctamente."}</p>
                <p className="meta-font mt-4 text-[9px] uppercase text-muted">Parser · {source.parser ?? "registrado"}</p>
                <div className="mt-4 flex flex-wrap gap-2"><Link href={`/modulos/${module.slug}/lector`} className="focus-ring inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent"><BookOpenText className="size-3.5" aria-hidden="true" /> Leer en modo cómodo</Link><ExtractionInspector moduleId={module.id} /></div>
              </div>
            </div>
          )}

          {source.storage === "cloud" && source.extractionStatus === "error" && (
            <div className="border-t border-line bg-accent-soft/25 p-5 sm:p-6">
              <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" /><div><p className="text-sm font-bold text-ink">El archivo está seguro, pero su texto no pudo extraerse.</p><p className="mt-1 text-sm leading-6 text-muted">{source.extractionError || "Puedes reintentar sin volver a subir el documento."}</p></div></div>
              <button type="button" onClick={retryExtraction} disabled={busy} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 border border-warn px-4 text-xs font-bold text-warn hover:bg-warn hover:text-white disabled:opacity-50"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> Reintentar extracción</button>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-start gap-2 text-xs leading-5 text-muted"><HardDrive className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> El documento fuente nunca se reemplaza silenciosamente. Desvincúlalo antes de asociar otro archivo.</p>
            <button type="button" onClick={detach} disabled={busy} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 text-xs font-bold text-warn hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-50"><Link2Off className="size-3.5" aria-hidden="true" /> Desvincular</button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <SourceDocumentPicker id={`source-document-${module.id}`} file={selectedFile} onChange={onPick} disabled={busy} />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs leading-5 text-muted"><FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {persistence === "cloud" ? "Al asociarlo, Storage conservará el original y el servidor extraerá su texto sin usar IA." : "Supabase no está configurado; el archivo se conservará localmente como respaldo."}</p>
            <button type="button" onClick={attach} disabled={!selectedFile || busy} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-ink px-4 text-xs font-bold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"><FileCheck2 className="size-3.5" aria-hidden="true" /> {busy ? "Procesando…" : "Asociar documento"}</button>
          </div>
        </div>
      )}

      {message && <div role="status" className={`mt-4 border-l-4 p-4 text-sm leading-6 ${message.includes("correctamente") || message.includes("completada") || message.includes("desvinculado") ? "border-moss bg-moss-soft/45 text-ink" : "border-warn bg-accent-soft/35 text-ink"}`}>{message}</div>}
    </section>
  );
}
