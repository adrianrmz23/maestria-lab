"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import { useModules } from "@/components/module-provider";

export function LearnView() {
  const params = useParams<{ slug: string }>();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);

  if (!studyModule) {
    return <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-10">{hydrated ? <><h1 className="display-font text-4xl">Módulo no encontrado.</h1><Link href="/biblioteca" className="mt-5 inline-flex min-h-11 items-center font-bold text-accent">Volver a Biblioteca</Link></> : <p className="text-sm text-muted">Cargando módulo…</p>}</div>;
  }

  return <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><StudyWorkspace module={studyModule} /></div>;
}
