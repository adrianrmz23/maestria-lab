"use client";

import { useState } from "react";
import { Cloud, Database, HardDrive, RefreshCw, TriangleAlert, UploadCloud } from "lucide-react";
import { useModules } from "@/components/module-provider";

export function CloudStatusPanel({ compact = false }: { compact?: boolean }) {
  const { persistence, cloudStatus, cloudError, migrationCandidates, migrationBusy, migrateLocalData } = useModules();
  const [message, setMessage] = useState("");

  async function migrate() {
    setMessage("Migrando módulos y documentos locales…");
    const result = await migrateLocalData();
    if (result.failed) {
      setMessage(`Migración parcial: ${result.migrated} módulos, ${result.documents} documentos y ${result.failed} errores. ${result.errors[0] ?? ""}`);
    } else {
      setMessage(`Migración completada: ${result.migrated} módulos y ${result.documents} documentos transferidos a Supabase.`);
    }
  }

  if (persistence === "cloud") {
    return (
      <section className={`${compact ? "mt-4" : "mt-6"} border-l-4 border-moss bg-moss-soft/45 px-4 py-4 sm:px-5`} aria-label="Estado de infraestructura">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center border border-moss/35 bg-surface text-moss"><Cloud className="size-4" aria-hidden="true" /></span>
            <div>
              <p className="meta-font text-[9px] font-bold uppercase text-moss">Bloque 4 · infraestructura conectada</p>
              <p className="mt-1 text-sm font-bold text-ink">Supabase + Storage privado + persistencia remota</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><Database className="size-3.5" aria-hidden="true" /> Base lista</span>
                <span className="inline-flex items-center gap-1.5"><HardDrive className="size-3.5" aria-hidden="true" /> Storage listo</span>
              </div>
            </div>
          </div>
          {migrationCandidates.length > 0 && (
            <button type="button" onClick={migrate} disabled={migrationBusy} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-moss px-4 text-xs font-bold text-moss hover:bg-moss hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
              {migrationBusy ? <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-3.5" aria-hidden="true" />}
              Migrar {migrationCandidates.length} local{migrationCandidates.length === 1 ? "" : "es"}
            </button>
          )}
        </div>
        {message && <p role="status" className="mt-3 border-t border-moss/20 pt-3 text-xs leading-5 text-ink">{message}</p>}
      </section>
    );
  }

  return (
    <section className={`${compact ? "mt-4" : "mt-6"} border-l-4 border-warn bg-accent-soft/35 px-4 py-4 sm:px-5`} aria-label="Estado de infraestructura">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center border border-warn/35 bg-surface text-warn"><TriangleAlert className="size-4" aria-hidden="true" /></span>
        <div>
          <p className="meta-font text-[9px] font-bold uppercase text-warn">Modo local de respaldo</p>
          <p className="mt-1 text-sm font-bold text-ink">Supabase todavía no está operativo en este entorno.</p>
          <p className="mt-1 text-xs leading-5 text-muted">{cloudStatus?.message ?? "Crea .env.local y aplica la migración SQL para activar la persistencia cloud."}</p>
          {cloudError && <p className="mt-1 text-xs leading-5 text-warn">Detalle: {cloudError}</p>}
        </div>
      </div>
    </section>
  );
}
