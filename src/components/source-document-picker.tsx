"use client";

import { type ChangeEvent, type DragEvent, type KeyboardEvent, useRef, useState } from "react";
import { FileCheck2, FileUp, X } from "lucide-react";
import { formatDocumentSize, validateSourceDocument } from "@/lib/document-storage";

export function SourceDocumentPicker({
  file,
  onChange,
  disabled = false,
  id = "source-document",
}: {
  file: File | null;
  onChange: (file: File | null, error?: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function acceptFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const validationError = validateSourceDocument(nextFile);
    if (validationError) {
      onChange(null, validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(nextFile);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function clear() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPickerKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  if (file) {
    return (
      <div className="grid gap-4 border border-moss bg-moss-soft/45 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <span className="grid size-11 place-items-center border border-moss/40 bg-surface text-moss"><FileCheck2 className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{file.name}</p>
          <p className="meta-font mt-1 text-[9px] uppercase text-muted">{file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF"} · {formatDocumentSize(file.size)} · listo para guardar</p>
        </div>
        <button type="button" onClick={clear} disabled={disabled} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 border border-line-strong px-3 text-xs font-bold text-muted hover:border-warn hover:text-warn disabled:cursor-not-allowed disabled:opacity-50">
          <X className="size-3.5" aria-hidden="true" /> Quitar
        </button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); }}
      onDrop={onDrop}
      className={`relative border border-dashed px-5 py-7 transition-colors sm:px-6 ${dragging ? "border-accent bg-accent-soft/45" : "border-line-strong bg-canvas/35"} ${disabled ? "opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onInputChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center border border-line bg-surface text-accent"><FileUp className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">Arrastra tu documento aquí</p>
          <p className="mt-1 text-sm leading-6 text-muted">PDF o DOCX · máximo 50 MB. Con Supabase activo se guarda en Storage privado y se extrae su texto automáticamente.</p>
        </div>
        <label htmlFor={id} role="button" tabIndex={disabled ? -1 : 0} onKeyDown={onPickerKeyDown} className={`focus-ring inline-flex min-h-11 shrink-0 items-center justify-center border border-ink px-4 text-xs font-bold text-ink transition-colors ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-ink hover:text-white"}`}>
          Elegir archivo
        </label>
      </div>
    </div>
  );
}
