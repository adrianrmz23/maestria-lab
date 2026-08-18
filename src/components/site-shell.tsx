"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  LibraryBig,
  Moon,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

const nav = [
  { href: "/", label: "Inicio", icon: BookOpen },
  { href: "/biblioteca", label: "Biblioteca", icon: LibraryBig },
  { href: "/progreso", label: "Progreso", icon: ChartNoAxesColumnIncreasing },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function routeLabel(pathname: string) {
  if (pathname === "/") return ["MAESTRÍA LAB ROADMAP", "Tu ruta de aprendizaje"];
  if (pathname.startsWith("/biblioteca")) return ["BIBLIOTECA", "Módulos y fuentes"];
  if (pathname.startsWith("/progreso")) return ["DOMINIO", "Progreso y retención"];
  if (pathname.includes("/tareas")) return ["ACADEMIC TASK STUDIO", "Tareas del módulo"];
  if (pathname.includes("/evaluacion")) return ["MODO EXAMEN", "Evaluación del módulo"];
  if (pathname.includes("/refuerzo")) return ["SESIÓN ADAPTATIVA", "Repaso inteligente"];
  if (pathname.startsWith("/modulos/")) return ["MESA DE APRENDIZAJE", "Módulo activo"];
  return ["MAESTRÍA LAB", "Mesa de aprendizaje"];
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("maestria-lab-theme");
    const next = saved === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("maestria-lab-theme", next);
  }

  if (pathname === "/acceso") return <>{children}</>;

  const [eyebrow, title] = routeLabel(pathname);
  const moduleMatch = pathname.match(/^\/modulos\/([^/]+)/);
  const activeModuleSlug = moduleMatch?.[1] && moduleMatch[1] !== "nuevo" ? moduleMatch[1] : null;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a href="#main-content" className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-white">Saltar al contenido</a>

      <aside className="lab-sidebar fixed inset-y-0 left-0 z-50 hidden w-[218px] flex-col lg:flex">
        <div className="flex h-[78px] items-center gap-3 border-b border-line px-4">
          <Link href="/" className="focus-ring flex min-w-0 items-center gap-3" aria-label="Maestría Lab, inicio">
            <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#0f6cbd] to-[#12a7a0] text-lg font-black text-white shadow-[0_10px_26px_rgba(15,108,189,.26)]">M</span>
            <span className="min-w-0">
              <span className="block truncate text-[17px] font-extrabold leading-none tracking-[-.025em]">Maestría Lab</span>
              <span className="meta-font mt-1.5 block truncate text-[7px] font-bold uppercase text-muted">Learning path</span>
            </span>
          </Link>
        </div>

        <div className="px-3 pt-5">
          <div className="grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-surface-strong p-1">
            <span className="rounded-[9px] bg-surface px-2 py-2 text-center text-[10px] font-extrabold text-accent shadow-sm">01 Maestría</span>
            <span className="rounded-[9px] px-2 py-2 text-center text-[10px] font-bold text-muted">IA + Data</span>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="mt-5 space-y-1 px-3">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition ${active ? "lab-nav-active" : "text-muted hover:bg-surface-strong hover:text-ink"}`}>
                <Icon className="size-[18px]" /> {item.label}
              </Link>
            );
          })}
          {activeModuleSlug && (
            <>
              <div className="mx-3 my-3 h-px bg-line" />
              <p className="meta-font px-3 pb-1 text-[8px] font-black uppercase text-muted">Módulo actual</p>
              <Link href={`/modulos/${activeModuleSlug}/tareas`} aria-current={pathname.includes("/tareas") ? "page" : undefined} className={`focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition ${pathname.includes("/tareas") ? "lab-nav-active" : "text-muted hover:bg-surface-strong hover:text-ink"}`}>
                <ClipboardList className="size-[18px]" /> Tareas
              </Link>
            </>
          )}
          <Link href="/modulos/nuevo" className="focus-ring mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-surface-strong hover:text-ink">
            <Plus className="size-[18px]" /> Nuevo módulo
          </Link>
        </nav>

        <div className="mt-auto space-y-3 p-3 pb-4">
          <div className="rounded-[14px] border border-line bg-surface-strong p-3">
            <div className="flex items-center gap-2 text-accent"><Sparkles className="size-4" /><span className="text-[13px] font-bold">Motor adaptativo</span></div>
            <p className="mt-2 text-[12px] leading-5 text-muted">Sesiones, repetición espaciada y tutor contextual activos.</p>
          </div>
          <div className="rounded-[14px] border border-line bg-surface p-3">
            <div className="flex items-center gap-2 text-moss"><span className="size-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" /><span className="text-[13px] font-bold">Progreso local</span></div>
            <p className="mt-1 text-[11px] text-muted">Sincroniza con Supabase cuando está disponible.</p>
          </div>
        </div>
      </aside>

      <header className="lab-topbar shell-topbar fixed inset-x-0 top-0 z-40 h-[68px] lg:left-[218px]">
        <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-7">
          <div className="min-w-0">
            <p className="meta-font truncate text-[8px] font-black uppercase text-muted">{eyebrow}</p>
            <p className="mt-1 truncate text-sm font-extrabold text-ink">{title}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 text-[11px] text-muted md:flex"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" /> Progreso local</span>
            <button type="button" onClick={toggleTheme} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-muted hover:text-ink" aria-label={theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}>
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}<span className="hidden sm:inline">{theme === "light" ? "Oscuro" : "Claro"}</span>
            </button>
            <Link href="/modulos/nuevo" className="focus-ring hidden min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-white shadow-[0_8px_22px_rgba(15,108,189,.22)] hover:bg-accent-ink xl:inline-flex"><Plus className="size-4" /> Nuevo módulo</Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="shell-main min-h-dvh pt-[68px] pb-24 lg:pb-0">{children}</main>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`focus-ring relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-bold ${active ? "text-accent" : "text-muted"}`}>
                <span className={`absolute top-[-6px] h-[3px] w-8 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
                <Icon className="size-[19px]" />{item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
