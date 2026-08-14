import Link from "next/link";
import { Plus } from "lucide-react";
import { LibraryExplorer } from "@/components/library-explorer";

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 md:py-12 lg:px-10 lg:py-14">
      <header className="grid gap-6 border-b-2 border-ink pb-7 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="meta-font text-[10px] font-bold uppercase text-accent">Biblioteca / índice general</p>
          <h1 className="display-font mt-3 text-4xl leading-none sm:text-5xl md:text-6xl">Tus materiales,<br />convertidos en módulos.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Cada documento conserva su propia ficha y archivo fuente. Temario, extracción y experiencias de aprendizaje se incorporarán sobre esa misma identidad en los siguientes bloques.</p>
        </div>
        <Link href="/modulos/nuevo" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 self-start bg-accent px-5 text-sm font-bold text-white transition-colors duration-200 hover:bg-accent-ink md:self-end">
          <Plus className="size-4" aria-hidden="true" /> Nuevo módulo
        </Link>
      </header>
      <LibraryExplorer />
    </div>
  );
}
