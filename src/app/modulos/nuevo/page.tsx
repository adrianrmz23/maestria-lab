import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewModuleForm } from "@/components/new-module-form";

export default function NewModulePage() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6 md:py-12 lg:px-10 lg:py-14">
      <Link href="/biblioteca" className="focus-ring inline-flex min-h-11 items-center gap-1 text-sm font-bold text-muted transition-colors hover:text-accent"><ChevronLeft className="size-4" aria-hidden="true" /> Biblioteca</Link>

      <header className="mt-4 border-b-2 border-ink pb-7">
        <p className="meta-font text-[10px] font-bold uppercase text-accent">Nuevo módulo / ficha de ingreso</p>
        <h1 className="display-font mt-3 max-w-4xl text-4xl leading-[0.98] sm:text-5xl md:text-6xl">Un documento entra.<br />Un espacio de aprendizaje nace.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Selecciona la fuente académica y crea una ficha independiente. Con Supabase activo, el PDF/DOCX se guarda en Storage privado y su texto se extrae de inmediato. Después de la extracción podrás generar el Learning Manifest y estudiar el módulo con Aprende, Laboratorio, Práctica y Evaluación.</p>
      </header>

      <NewModuleForm />
    </div>
  );
}
