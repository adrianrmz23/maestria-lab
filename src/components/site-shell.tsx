"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesColumnIncreasing, LibraryBig, Network, Plus } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Estudio", icon: BookOpen },
  { href: "/biblioteca", label: "Biblioteca", icon: LibraryBig },
  { href: "/progreso", label: "Dominio", icon: ChartNoAxesColumnIncreasing },
  { href: "/conexiones", label: "Conexiones", icon: Network },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/acceso") return <>{children}</>;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main-content"
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-canvas/96 backdrop-blur-lg">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link href="/" className="focus-ring min-w-0 shrink-0" aria-label="Maestría Lab, inicio">
            <span className="display-font block text-[21px] leading-none text-ink">Maestría Lab</span>
            <span className="meta-font mt-1 block text-[9px] uppercase text-muted">IA · Ciencia de Datos</span>
          </Link>

          <div className="hidden h-7 w-px bg-line lg:block" aria-hidden="true" />

          <nav aria-label="Navegación principal" className="hidden h-full items-stretch gap-7 lg:flex">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring relative flex items-center text-sm font-semibold transition-colors duration-200 ${active ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {item.label}
                  <span className={`absolute inset-x-0 bottom-0 h-[3px] transition-colors ${active ? "bg-accent" : "bg-transparent"}`} aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="meta-font hidden text-[9px] uppercase text-muted md:inline">Bloque 8 · Tutor + RAG + conexiones</span>
            <Link
              href="/modulos/nuevo"
              className="focus-ring inline-flex min-h-11 items-center gap-2 border border-ink bg-ink px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-accent hover:border-accent"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo módulo</span>
              <span className="sm:hidden">Nuevo</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="pb-24 lg:pb-0">
        {children}
      </main>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/98 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-200 ${active ? "text-accent" : "text-muted"}`}
              >
                <span className={`absolute top-[-6px] h-[3px] w-8 ${active ? "bg-accent" : "bg-transparent"}`} aria-hidden="true" />
                <Icon className="size-[19px]" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
