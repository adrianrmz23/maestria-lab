import Link from "next/link";
import { Plus } from "lucide-react";
import { LibraryExplorer } from "@/components/library-explorer";

export default function LibraryPage() {
  return (
    <div className="app-frame py-6 lg:py-8">
      <section className="lab-hero rounded-[24px] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="meta-font text-[8px] font-black uppercase text-accent">Biblioteca · módulos</p>
            <h1 className="display-font mt-3 text-4xl sm:text-5xl">Tus materiales, listos para aprender.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">Cada documento conserva su fuente, pero la experiencia principal vive en la ruta interactiva: teoría, práctica, audio, laboratorio y evaluación.</p>
          </div>
          <Link href="/modulos/nuevo" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white"><Plus className="size-4" /> Nuevo módulo</Link>
        </div>
      </section>
      <LibraryExplorer />
    </div>
  );
}
