"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Check, FileCheck2, FileWarning, FlaskConical, TimerReset } from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { useModules } from "@/components/module-provider";
import { formatModuleUpdated, sortModulesByUpdated } from "@/lib/module-utils";

export function HomeDashboard() {
  const { modules } = useModules();
  const visible = sortModulesByUpdated(modules.filter((module) => module.status !== "Archivado"));
  const active = visible.find((module) => module.status === "En curso") ?? visible[0];

  if (!active) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 md:py-12 lg:px-10 lg:py-14">
        <header className="border-b border-line pb-8">
          <p className="meta-font text-[10px] font-bold uppercase text-accent">Mesa de estudio / sesión actual</p>
          <h1 className="display-font mt-3 max-w-3xl text-[clamp(2.6rem,6vw,5.25rem)] leading-[0.95] text-ink">Tu maestría,<br className="hidden sm:block" /> convertida en práctica.</h1>
        </header>
        <section className="paper-sheet mt-8 border border-line p-6 md:p-8">
          <p className="meta-font text-[9px] font-bold uppercase text-muted">Biblioteca vacía</p>
          <h2 className="display-font mt-2 text-3xl">Crea tu primer módulo.</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">El sistema de módulos ya es persistente. Puedes crear uno ahora y su ficha quedará guardada en este navegador.</p>
          <Link href="/modulos/nuevo" className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 bg-ink px-5 text-sm font-bold text-white hover:bg-accent">Nuevo módulo <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>
      </div>
    );
  }

  const isLogic = active.slug === "logica-proposicional";
  const currentTopic = isLogic ? "Conectivos" : active.topics > 0 ? "Temario del módulo" : "Ficha del módulo";
  const nextTopic = isLogic ? "Tablas de verdad" : active.topics > 0 ? "Continuar recorrido" : "Documento pendiente";

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 md:py-12 lg:px-10 lg:py-14">
      <header className="grid gap-5 border-b border-line pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="meta-font text-[10px] font-bold uppercase text-accent">Mesa de estudio / sesión actual</p>
          <h1 className="display-font mt-3 max-w-3xl text-[clamp(2.6rem,6vw,5.25rem)] leading-[0.95] text-ink">Tu maestría,<br className="hidden sm:block" /> convertida en práctica.</h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted md:pb-1 md:text-right">Retoma conceptos, experimenta con ellos y registra qué tanto los dominas de verdad.</p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.72fr)]">
        <article className="paper-sheet border border-line">
          <div className="grid min-h-[410px] md:grid-cols-[62px_1fr]">
            <div className="hidden border-r border-line bg-accent text-white md:flex md:flex-col md:items-center md:justify-between md:py-6">
              <span className="meta-font text-[9px] uppercase [writing-mode:vertical-rl] rotate-180">Módulo activo</span>
              <span className="display-font text-2xl">01</span>
            </div>
            <div className="p-5 sm:p-7 md:p-9">
              <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
                <span className="meta-font text-[9px] font-bold uppercase text-muted">{active.subject}</span>
                <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
                <span className="meta-font text-[9px] font-bold uppercase text-moss">{active.status}</span>
                <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${active.sourceDocument ? "text-moss" : "text-warn"}`}>{active.sourceDocument ? <FileCheck2 className="size-3.5" aria-hidden="true" /> : <FileWarning className="size-3.5" aria-hidden="true" />}{active.sourceDocument ? (active.sourceDocument.storage === "cloud" && active.sourceDocument.extractionStatus === "ready" ? `${active.sourceDocument.kind} extraído` : `${active.sourceDocument.kind} vinculado`) : "Documento pendiente"}</span>
              </div>

              <div className="mt-8">
                <p className="text-sm font-semibold text-accent">Tema actual · {currentTopic}</p>
                <h2 className="display-font mt-3 max-w-3xl text-3xl leading-[1.03] sm:text-4xl lg:text-[3.15rem]">{active.title}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{active.description}</p>
              </div>

              <div className="mt-8 max-w-2xl">
                <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold">
                  <span className="meta-font uppercase text-muted">Avance del módulo</span>
                  <span>{active.progress}%</span>
                </div>
                <div className="h-[5px] bg-surface-strong" aria-hidden="true"><div className="h-full bg-accent" style={{ width: `${active.progress}%` }} /></div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={`/modulos/${active.slug}`} className="focus-ring inline-flex min-h-12 items-center gap-2 bg-ink px-5 text-sm font-bold text-white transition-colors duration-200 hover:bg-accent">
                  {active.progress > 0 ? "Continuar estudio" : "Abrir módulo"} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <span className="text-sm text-muted">{active.topics} temas · {formatModuleUpdated(active.updatedAt).toLowerCase()}</span>
              </div>
            </div>
          </div>
        </article>

        <aside className="border-t-4 border-moss bg-surface px-5 py-6 sm:px-6 lg:min-h-[410px]">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="meta-font text-[9px] font-bold uppercase text-muted">Siguiente tramo</p>
              <h2 className="display-font mt-1 text-2xl">{nextTopic}</h2>
            </div>
            <TimerReset className="size-5 text-moss" aria-hidden="true" />
          </div>

          <ol className="mt-6 space-y-5">
            {[
              ["01", "Comprender", isLogic ? "Leer el mecanismo y sus reglas." : "Revisar la ficha y el alcance del módulo."],
              ["02", "Experimentar", "Abrir un laboratorio generado para el concepto y manipularlo."],
              ["03", "Resolver", "Completar práctica progresiva y registrar los primeros intentos."],
            ].map(([num, title, text]) => (
              <li key={num} className="grid grid-cols-[28px_1fr] gap-3">
                <span className="meta-font pt-0.5 text-[9px] font-bold text-accent">{num}</span>
                <div><p className="text-sm font-bold text-ink">{title}</p><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div>
              </li>
            ))}
          </ol>

          <div className="mt-8 border-t border-line pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-moss"><FlaskConical className="size-4" aria-hidden="true" /> Laboratorio + práctica ya disponibles</div>
          </div>
        </aside>
      </section>

      <section className="mt-12 md:mt-16">
        <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
          <div><p className="meta-font text-[9px] font-bold uppercase text-muted">Catálogo personal</p><h2 className="display-font mt-1 text-3xl">Módulos recientes</h2></div>
          <Link href="/biblioteca" className="focus-ring hidden min-h-11 items-center gap-2 text-sm font-bold text-accent sm:inline-flex">Ver biblioteca <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="border-b border-line">
          {visible.slice(0, 4).map((module, index) => <ModuleCard key={module.id} module={module} compact index={index + 1} />)}
        </div>
      </section>

      <section className="mt-12 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <div className="flex gap-3"><BookOpenText className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" /><div><p className="font-bold">Módulos independientes</p><p className="mt-1 text-sm leading-6 text-muted">Cada registro conserva ahora su propia identidad, ruta, estado y metadatos.</p></div></div>
        <div className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-moss" aria-hidden="true" /><div><p className="font-bold">Ficha + documento persistentes</p><p className="mt-1 text-sm leading-6 text-muted">La fuente, el Manifest, las experiencias y los intentos ya forman una misma cadena persistente de estudio.</p></div></div>
      </section>
    </div>
  );
}
