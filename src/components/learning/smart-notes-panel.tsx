"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, NotebookPen, Plus, Trash2 } from "lucide-react";
import { getStudyNotes, removeStudyNote, saveStudyNote } from "@/lib/learning-engine-api";
import type { StudyNote } from "@/lib/learning-engine/types";

export function SmartNotesPanel({ moduleId, topicId, conceptId }: { moduleId: string; topicId: string; conceptId: string }) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setNotes([]);
    getStudyNotes(moduleId, topicId, conceptId).then((result) => { if (!cancelled) setNotes(result.notes); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [moduleId, topicId, conceptId]);

  async function save() {
    if (!text.trim()) return;
    setBusy(true); setMessage("");
    try { const note = await saveStudyNote(moduleId, topicId, conceptId, text.trim()); setNotes((current) => [note, ...current]); setText(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar la nota."); }
    finally { setBusy(false); }
  }

  async function remove(noteId: string) {
    try { await removeStudyNote(moduleId, noteId); setNotes((current) => current.filter((note) => note.id !== noteId)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo eliminar la nota."); }
  }

  return (
    <section className="study-panel-elevated rounded-[18px] p-4">
      <div className="flex items-center gap-2 study-accent"><NotebookPen className="size-4" /><p className="meta-font text-[8px] font-black uppercase">Notas inteligentes</p></div>
      <p className="mt-2 text-sm leading-6 study-muted">Guarda solo lo que no quieres olvidar; cada nota puede convertirse en una pregunta de repaso.</p>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={2} placeholder="Ej. La implicación solo falla cuando…" className="mt-3 w-full rounded-xl border study-line bg-transparent px-3 py-3 text-sm leading-6 study-text outline-none" />
      <button type="button" disabled={busy || !text.trim()} onClick={save} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border study-line px-3 text-sm font-bold study-text disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Guardar nota</button>
      {notes.length > 0 && <div className="mt-3 space-y-2">{notes.slice(0,3).map((note) => <article key={note.id} className="rounded-xl border study-line p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs leading-5 study-text">{note.noteText}</p><button type="button" onClick={() => remove(note.id)} aria-label="Eliminar nota" className="grid size-8 shrink-0 place-items-center rounded-lg study-muted hover:text-warn"><Trash2 className="size-3.5" /></button></div>{note.recallQuestion && <p className="mt-2 border-l-2 border-[var(--study-accent)] pl-2 text-[11px] leading-5 study-muted">Repaso: {note.recallQuestion}</p>}</article>)}</div>}
      {message && <p className="mt-2 text-xs font-bold text-warn">{message}</p>}
    </section>
  );
}
