import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="meta-font text-[10px] font-bold uppercase text-accent">Error / 404</p>
      <h1 className="display-font mt-4 text-4xl leading-tight sm:text-5xl">Ese módulo todavía no existe.</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">Vuelve al índice general para continuar con los módulos disponibles.</p>
      <Link href="/biblioteca" className="focus-ring mt-7 inline-flex min-h-12 items-center bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-accent">Ir a Biblioteca</Link>
    </div>
  );
}
