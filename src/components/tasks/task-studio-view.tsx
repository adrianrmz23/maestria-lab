"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, BrainCircuit, CheckCircle2, FileText, LayoutDashboard, LoaderCircle, Network, Plus, ScrollText, Search, Sparkles, Trash2 } from "lucide-react";
import { TaskEditor } from "@/components/tasks/task-editor";
import { createAcademicTask, deleteAcademicTask, getAcademicTask, getAcademicTasks } from "@/lib/tasks-api";
import type { AcademicTaskRecord, AcademicTaskType, TaskProvider, TaskProviderStatus, TaskQuality, TaskSourceScope, TaskWorkMode } from "@/lib/tasks/types";
import { useModules } from "@/components/module-provider";

type Detail = Awaited<ReturnType<typeof getAcademicTask>>;

const types: Array<{ value: AcademicTaskType; label: string; description: string; icon: typeof FileText }> = [
  { value: "concept_map", label: "Mapa conceptual", description: "Nodos, relaciones y jerarquía editable.", icon: Network },
  { value: "synoptic", label: "Cuadro sinóptico", description: "Estructura jerárquica de lo general a lo específico.", icon: LayoutDashboard },
  { value: "summary", label: "Resumen", description: "Fiel al documento y con extensión configurable.", icon: FileText },
  { value: "essay", label: "Ensayo", description: "Tesis, desarrollo argumentativo y conclusión.", icon: ScrollText },
  { value: "report", label: "Reporte", description: "Estructura técnica, análisis y hallazgos.", icon: BookOpen },
  { value: "research", label: "Investigación", description: "Fuente del módulo + investigación externa opcional.", icon: Search },
  { value: "infographic", label: "Infografía", description: "Arquitectura visual y mensajes principales.", icon: Sparkles },
  { value: "presentation", label: "Presentación", description: "Guion por diapositivas exportable a PPTX.", icon: LayoutDashboard },
  { value: "questions", label: "Preguntas", description: "Banco de preguntas con respuestas razonadas.", icon: BrainCircuit },
  { value: "custom", label: "Otro", description: "Pega la consigna y deja que la IA interprete el formato.", icon: Plus },
];

const providerLabel: Record<TaskProvider, string> = { auto: "Automático", openai: "OpenAI", kimi: "Kimi", deepseek: "DeepSeek" };
const qualityLabel: Record<TaskQuality, string> = { fast: "Rápido · 1 modelo", quality: "Calidad · genera + revisa", max: "Máxima calidad · genera + revisa + pule" };

function taskTypeLabel(value: AcademicTaskType) {
  return types.find((type) => type.value === value)?.label || value;
}

export function TaskStudioView() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { modules, hydrated } = useModules();
  const studyModule = modules.find((item) => item.slug === params.slug);
  const [tasks, setTasks] = useState<AcademicTaskRecord[]>([]);
  const [providers, setProviders] = useState<TaskProviderStatus[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(searchParams.get("nueva") === "1");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const [taskType, setTaskType] = useState<AcademicTaskType>("summary");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [providerPreference, setProviderPreference] = useState<TaskProvider>("auto");
  const [qualityMode, setQualityMode] = useState<TaskQuality>("quality");
  const [workMode, setWorkMode] = useState<TaskWorkMode>("guided");
  const [sourceScope, setSourceScope] = useState<TaskSourceScope>({ document: true, manifest: true, notes: false, externalResearch: false, topicId: searchParams.get("topicId"), conceptId: searchParams.get("conceptId") });

  async function loadList(selectFirst = false) {
    if (!studyModule) return;
    setLoading(true);
    try {
      const result = await getAcademicTasks(studyModule.id);
      setTasks(result.tasks);
      setProviders(result.providers);
      if (selectFirst && result.tasks[0]) setActiveId(result.tasks[0].id);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar las tareas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!studyModule) return;
    void loadList(true);
  }, [studyModule?.id]);

  useEffect(() => {
    if (!studyModule || !activeId) { setDetail(null); return; }
    let cancelled = false;
    getAcademicTask(studyModule.id, activeId)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "No se pudo cargar la tarea."); });
    return () => { cancelled = true; };
  }, [studyModule?.id, activeId]);

  const configuredCount = providers.filter((provider) => provider.configured).length;
  const activeTask = useMemo(() => tasks.find((task) => task.id === activeId) || null, [tasks, activeId]);

  async function create() {
    if (!studyModule || !instructions.trim()) return;
    setCreating(true);
    setMessage("");
    try {
      const result = await createAcademicTask(studyModule.id, { title, taskType, instructions, rubricText, providerPreference, qualityMode, workMode, sourceScope });
      await loadList(false);
      setActiveId(result.task.id);
      setComposer(false);
      setTitle("");
      setInstructions("");
      setRubricText("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la tarea.");
    } finally {
      setCreating(false);
    }
  }

  async function removeActive() {
    if (!studyModule || !activeId) return;
    if (!window.confirm("¿Eliminar esta tarea y todo su historial de versiones?")) return;
    try {
      await deleteAcademicTask(studyModule.id, activeId);
      setDetail(null);
      setActiveId(null);
      await loadList(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la tarea.");
    }
  }

  if (!hydrated || !studyModule) {
    return <div className="app-frame py-12"><p className="text-sm text-muted">{hydrated ? "Módulo no encontrado." : "Cargando módulo…"}</p></div>;
  }

  return (
    <div className="app-frame py-6 lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/modulos/${studyModule.slug}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted hover:text-accent"><ArrowLeft className="size-4" /> Volver al módulo</Link>
          <p className="meta-font mt-4 text-[9px] font-black uppercase text-accent">Bloque 12 · Academic Task Studio</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-ink sm:text-4xl">Tareas · {studyModule.title}</h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-muted">Convierte la consigna de tu profesor en mapas conceptuales, cuadros sinópticos, resúmenes, ensayos, reportes o presentaciones usando las fuentes del módulo y revisión multi-modelo.</p>
        </div>
        <button type="button" onClick={() => setComposer((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white"><Plus className="size-4" /> Nueva tarea</button>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Tareas</p><p className="mt-2 text-2xl font-black text-ink">{tasks.length}</p><p className="mt-1 text-[13px] text-muted">en este módulo</p></div>
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Modelos</p><p className="mt-2 text-2xl font-black text-ink">{configuredCount}/3</p><p className="mt-1 text-[13px] text-muted">proveedores configurados</p></div>
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Fuentes</p><p className="mt-2 text-lg font-black text-ink">Módulo + extras</p><p className="mt-1 text-[13px] text-muted">documento, manifest, notas y archivos</p></div>
        <div className="lab-stat rounded-[16px] p-4"><p className="meta-font text-[9px] font-bold uppercase text-muted">Revisión</p><p className="mt-2 text-lg font-black text-ink">Por rúbrica</p><p className="mt-1 text-[13px] text-muted">sin “detectores de IA”</p></div>
      </section>

      {composer && (
        <section className="lab-card mt-5 rounded-[22px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="meta-font text-[9px] font-black uppercase text-accent">Nueva tarea</p><h2 className="mt-2 text-2xl font-extrabold text-ink">Pega exactamente lo que te pidió el profesor</h2><p className="mt-2 text-sm leading-6 text-muted">Primero interpretamos la consigna. Después puedes confirmar fuentes, adjuntar rúbrica y generar.</p></div><button type="button" onClick={() => setComposer(false)} className="text-sm font-bold text-muted">Cerrar</button></div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {types.map(({ value, label, description, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setTaskType(value)} className={`rounded-[16px] border p-3 text-left transition ${taskType === value ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"}`}>
                <Icon className={`size-4 ${taskType === value ? "text-accent" : "text-muted"}`} />
                <p className="mt-2 text-sm font-extrabold text-ink">{label}</p>
                <p className="mt-1 text-[12px] leading-5 text-muted">{description}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.7fr)]">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-ink">Título opcional<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Si lo dejas vacío, la IA lo infiere" className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink" /></label>
              <label className="block text-sm font-bold text-ink">Instrucciones<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={7} placeholder="Ej. Elabora un mapa conceptual sobre..." className="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-7 text-ink" /></label>
              <label className="block text-sm font-bold text-ink">Rúbrica / criterios <span className="font-normal text-muted">(opcional)</span><textarea value={rubricText} onChange={(event) => setRubricText(event.target.value)} rows={4} placeholder="Pega aquí los criterios de evaluación si te los dieron." className="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-7 text-ink" /></label>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface-strong p-4">
                <p className="text-sm font-extrabold text-ink">Modo de trabajo</p>
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setWorkMode("guided")} className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${workMode === "guided" ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted"}`}>Hazlo conmigo</button><button type="button" onClick={() => setWorkMode("generate")} className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${workMode === "generate" ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted"}`}>Generar borrador</button></div>
              </div>

              <label className="block text-sm font-extrabold text-ink">Modelo<select value={providerPreference} onChange={(event) => setProviderPreference(event.target.value as TaskProvider)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"><option value="auto">✨ Automático — recomendado</option>{providers.map((provider) => <option key={provider.provider} value={provider.provider} disabled={!provider.configured}>{providerLabel[provider.provider]} · {provider.configured ? provider.model : "sin configurar"}</option>)}</select></label>
              <label className="block text-sm font-extrabold text-ink">Calidad<select value={qualityMode} onChange={(event) => setQualityMode(event.target.value as TaskQuality)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink">{Object.entries(qualityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-sm font-extrabold text-ink">Fuentes</p>
                <div className="mt-3 space-y-3 text-sm">
                  {[{ key: "document", label: "Documento del módulo" }, { key: "manifest", label: "Learning Manifest" }, { key: "notes", label: "Mis notas" }, { key: "externalResearch", label: "Investigación web adicional" }].map(({ key, label }) => <label key={key} className="flex items-center justify-between gap-3"><span className="text-muted">{label}</span><input type="checkbox" checked={Boolean(sourceScope[key as keyof TaskSourceScope])} onChange={(event) => setSourceScope((current) => ({ ...current, [key]: event.target.checked }))} className="size-4" /></label>)}
                </div>
                {sourceScope.externalResearch && <p className="mt-3 text-xs leading-5 text-muted">La búsqueda web se realiza con OpenAI Web Search y se separa claramente de la fuente universitaria.</p>}
                {sourceScope.conceptId && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs font-bold text-accent">Contexto actual: tarea enfocada al concepto abierto en la Mesa de Aprendizaje.</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><p className="text-sm text-muted">Tipo: <strong className="text-ink">{taskTypeLabel(taskType)}</strong> · {qualityLabel[qualityMode]}</p><button type="button" onClick={create} disabled={creating || !instructions.trim() || configuredCount === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white disabled:opacity-40">{creating ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Interpretar consigna</button></div>
        </section>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lab-card rounded-[22px] p-4 xl:sticky xl:top-[88px] xl:self-start">
          <div className="flex items-center justify-between"><div><p className="meta-font text-[9px] font-black uppercase text-muted">Tareas del módulo</p><p className="mt-1 text-sm font-extrabold text-ink">{tasks.length} guardadas</p></div><button type="button" onClick={() => setComposer(true)} className="grid size-9 place-items-center rounded-xl bg-accent text-white" aria-label="Nueva tarea"><Plus className="size-4" /></button></div>
          {loading ? <div className="grid place-items-center py-12"><LoaderCircle className="size-5 animate-spin text-accent" /></div> : tasks.length === 0 ? <div className="py-10 text-center"><FileText className="mx-auto size-6 text-muted" /><p className="mt-3 text-sm font-bold text-ink">Aún no hay tareas</p><p className="mt-1 text-xs leading-5 text-muted">Crea la primera desde la consigna de tu plataforma.</p></div> : <div className="mt-4 space-y-2">{tasks.map((task) => <button key={task.id} type="button" onClick={() => setActiveId(task.id)} className={`w-full rounded-2xl border p-3 text-left ${activeId === task.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase text-accent">{taskTypeLabel(task.taskType)}</span><span className="text-[10px] font-bold text-muted">v{task.currentVersion}</span></div><p className="mt-2 line-clamp-2 text-sm font-extrabold leading-5 text-ink">{task.title}</p><p className="mt-2 text-[11px] text-muted">{task.status === "ready" ? "Lista para editar/exportar" : task.status === "draft" ? "Consigna interpretada" : task.status}</p></button>)}</div>}
        </aside>

        <main>
          {detail && activeTask ? <TaskEditor moduleId={studyModule.id} initial={detail} onChanged={(next) => { setDetail(next); void loadList(false); }} onDelete={removeActive} /> : <section className="lab-card rounded-[22px] p-10 text-center"><Sparkles className="mx-auto size-7 text-accent" /><h2 className="mt-3 text-xl font-extrabold text-ink">Selecciona una tarea o crea una nueva.</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">Academic Task Studio conserva versiones, fuentes y revisiones dentro del módulo.</p></section>}
        </main>
      </div>

      {message && <p className="mt-5 rounded-2xl border border-warn/25 bg-surface p-4 text-sm font-semibold text-warn">{message}</p>}
    </div>
  );
}
