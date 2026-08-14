"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { SourceDocumentPicker } from "@/components/source-document-picker";
import { useModules } from "@/components/module-provider";
import { titleFromFileName } from "@/lib/document-storage";

export function NewModuleForm() {
  const router = useRouter();
  const { persistence, createModule, attachSourceDocument, removeModule } = useModules();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function onDocumentChange(file: File | null, validationError?: string) {
    setSourceFile(file);
    setError(validationError ?? "");
    if (file && !title.trim()) setTitle(titleFromFileName(file.name));
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
    try {
      studyModule = await createModule({ title, subject, description });
      await attachSourceDocument(studyModule.id, sourceFile);
      router.push(`/modulos/${studyModule.slug}`);
    } catch (caught) {
      if (studyModule?.id) {
        try { await removeModule(studyModule.id); } catch { /* rollback best-effort */ }
      }
      setError(caught instanceof Error ? caught.message : "No se pudo crear el módulo con su documento fuente.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start" aria-busy={saving}>
      <aside className="border-l-4 border-moss bg-moss-soft/55 p-5 lg:sticky lg:top-24">
        <p className="meta-font text-[9px] font-bold uppercase text-moss">Bloque 4 / persistencia + extracción</p>
        <h2 className="display-font mt-3 text-2xl">El módulo nace conectado a su material académico.</h2>
        <ol className="mt-5 space-y-4 text-sm leading-6 text-muted">
          <li><strong className="text-ink">01.</strong> Selecciona un PDF o DOCX.</li>
          <li><strong className="text-ink">02.</strong> Define la ficha académica del módulo.</li>
          <li><strong className="text-ink">03.</strong> El archivo se guarda en Storage y se extrae su texto.</li>
        </ol>
        <div className="mt-6 border-t border-moss/25 pt-4">
          <p className="flex items-start gap-2 text-xs leading-5 text-moss"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> La extracción es determinista: todavía no enviamos el documento a ningún modelo de IA.</p>
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
                <p className="mt-1 text-xs text-muted">Un documento crea un módulo independiente.</p>
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

          <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-xs leading-5 text-muted">Con Supabase activo, la fuente queda en Storage privado y su texto se extrae al crear el módulo. Si Supabase no está configurado, se conserva el modo local como respaldo.</p>
            <button type="submit" disabled={saving || !sourceFile} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-bold text-white transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45">
              <FilePlus2 className="size-4" aria-hidden="true" /> {saving ? (persistence === "cloud" ? "Subiendo y extrayendo…" : "Guardando módulo…") : "Crear módulo"}
            </button>
          </div>

          {error && <div role="alert" className="border-l-4 border-warn bg-accent-soft/35 p-4 text-sm leading-6 text-ink">{error}</div>}
        </div>
      </div>
    </form>
  );
}
