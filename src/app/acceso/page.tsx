"use client";

import { type FormEvent, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

export default function AccessPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/access/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo validar el acceso.");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo validar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink">
      <section className="paper-sheet w-full max-w-[480px] border border-line p-6 sm:p-8">
        <div className="flex size-11 items-center justify-center border border-ink"><KeyRound className="size-5" /></div>
        <p className="meta-font mt-6 text-[9px] font-bold uppercase text-accent">Acceso personal</p>
        <h1 className="display-font mt-2 text-4xl leading-none">Maestría Lab</h1>
        <p className="mt-4 text-sm leading-6 text-muted">Esta instalación contiene documentos académicos, progreso y conversaciones de estudio. Introduce la contraseña configurada para continuar.</p>
        <form onSubmit={submit} className="mt-6">
          <label htmlFor="access-password" className="mb-2 block text-sm font-bold">Contraseña</label>
          <input id="access-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring min-h-12 w-full border border-line-strong bg-transparent px-4 text-base outline-none focus:border-accent" />
          {message && <p role="alert" className="mt-3 border-l-4 border-warn bg-accent-soft/35 p-3 text-sm text-ink">{message}</p>}
          <button type="submit" disabled={busy} className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-5 text-sm font-bold text-white hover:bg-accent disabled:opacity-45">{busy && <LoaderCircle className="size-4 animate-spin" />} Entrar</button>
        </form>
        <p className="meta-font mt-6 border-t border-line pt-4 text-[8px] uppercase leading-5 text-muted">La puerta de acceso es opcional. Si APP_ACCESS_PASSWORD no existe, Maestría Lab funciona normalmente sin esta pantalla.</p>
      </section>
    </main>
  );
}
