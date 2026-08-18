"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, RefreshCw } from "lucide-react";
import type { LabSpec, LogicOperator } from "@/lib/experience/types";

function logicValue(operator: LogicOperator, a: boolean, b: boolean) {
  if (operator === "and") return a && b;
  if (operator === "or") return a || b;
  if (operator === "implies") return !a || b;
  if (operator === "xor") return a !== b;
  return !a;
}

function valueLabel(value: boolean) {
  return value ? "VERDADERO" : "FALSO";
}

function Toggle({ value, onChange, label, description }: { value: boolean; onChange: () => void; label: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`focus-ring group min-h-28 rounded-2xl border p-4 text-left transition-all ${value ? "border-moss bg-moss-soft/70" : "border-line-strong bg-surface hover:border-accent"}`}
      aria-pressed={value}
    >
      <span className="meta-font text-[9px] font-bold uppercase text-muted">{label}</span>
      <span className="mt-2 block text-sm font-bold leading-6 text-ink">{description}</span>
      <span className="mt-4 flex items-center justify-between gap-3">
        <span className={`text-xs font-black ${value ? "text-moss" : "text-muted"}`}>{valueLabel(value)}</span>
        <span className={`relative h-7 w-12 rounded-full border transition-colors ${value ? "border-moss bg-moss" : "border-line-strong bg-surface-strong"}`}>
          <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
        </span>
      </span>
    </button>
  );
}

function LogicSwitchLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const operator = lab.operator ?? "and";
  const result = logicValue(operator, a, b);
  const propositions = lab.propositions.slice(0, 2);
  const labels = propositions.length
    ? propositions
    : [
        { id: "p", label: "p", description: "Primera proposición" },
        { id: "q", label: "q", description: "Segunda proposición" },
      ];

  return (
    <div className="learning-lab rounded-[26px] border border-line p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {labels.map((prop, index) => {
          if (operator === "not" && index > 0) return null;
          const value = index === 0 ? a : b;
          return (
            <Toggle
              key={prop.id}
              value={value}
              label={prop.label}
              description={prop.description}
              onChange={() => {
                if (index === 0) setA((current) => !current); else setB((current) => !current);
                onComplete?.(100);
              }}
            />
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-ink/10 bg-ink p-5 text-center text-white">
        <p className="meta-font text-[9px] font-bold uppercase text-white/60">Resultado en vivo</p>
        <p className="display-font mt-2 text-3xl sm:text-4xl">{lab.expression || `${labels[0]?.label ?? "p"} ${operator.toUpperCase()} ${labels[1]?.label ?? "q"}`}</p>
        <p className={`mt-3 text-xl font-black ${result ? "text-[#b9e3d4]" : "text-[#ffb6a7]"}`}>{valueLabel(result)}</p>
        <p className="mt-2 text-xs leading-5 text-white/65">Toca las condiciones. La regla se recalcula inmediatamente.</p>
      </div>
    </div>
  );
}

function TruthTableLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const operator = lab.operator ?? "and";
  const props = lab.propositions.slice(0, operator === "not" ? 1 : 2);
  const labels = props.length ? props : [{ id: "p", label: "p", description: "p" }, { id: "q", label: "q", description: "q" }];
  const rows = operator === "not" ? [[true], [false]] : [[true, true], [true, false], [false, true], [false, false]];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  function expected(row: boolean[]) {
    return logicValue(operator, row[0], row[1] ?? false);
  }

  const correctCount = rows.filter((row, index) => answers[index] === String(expected(row))).length;

  return (
    <div className="overflow-hidden rounded-[26px] border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse text-sm">
          <thead className="bg-canvas">
            <tr>
              {labels.map((prop) => <th key={prop.id} className="border-b border-r border-line px-4 py-3 text-left meta-font text-[9px] uppercase">{prop.label}</th>)}
              <th className="border-b border-line px-4 py-3 text-left meta-font text-[9px] uppercase">{lab.expression || "Resultado"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const expectedValue = expected(row);
              const answer = answers[index];
              const isRight = answer === String(expectedValue);
              return (
                <tr key={index} className="border-b border-line last:border-b-0">
                  {row.map((value, cell) => <td key={cell} className="border-r border-line px-4 py-4 text-base font-black">{value ? "V" : "F"}</td>)}
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Resultado fila ${index + 1}`}
                      value={answer ?? ""}
                      onChange={(event) => {
                        setChecked(false);
                        setAnswers((current) => ({ ...current, [index]: event.target.value }));
                      }}
                      className={`focus-ring min-h-11 rounded-xl border bg-surface px-3 text-sm font-bold ${checked ? isRight ? "border-moss text-moss" : "border-warn text-warn" : "border-line-strong"}`}
                    >
                      <option value="">?</option>
                      <option value="true">V</option>
                      <option value="false">F</option>
                    </select>
                    {checked && !isRight && <span className="ml-3 text-xs font-bold text-warn">Era {expectedValue ? "V" : "F"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
        <p className="text-sm text-muted">{checked ? `${correctCount}/${rows.length} filas correctas.` : "Completa las filas y comprueba el patrón."}</p>
        <button type="button" onClick={() => { setChecked(true); onComplete?.(Math.round((correctCount / rows.length) * 100)); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-bold text-white hover:bg-accent"><Check className="size-3.5" /> Comprobar</button>
      </div>
    </div>
  );
}

function MatchingLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const rights = useMemo(() => [...lab.matchingPairs].reverse().map((pair) => pair.right), [lab.matchingPairs]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const correct = lab.matchingPairs.filter((pair) => answers[pair.id] === pair.right).length;

  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <div className="space-y-3">
        {lab.matchingPairs.map((pair, index) => (
          <div key={pair.id} className="grid gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[34px_minmax(0,1fr)_minmax(210px,.85fr)] sm:items-center">
            <span className="display-font text-xl text-accent">{String(index + 1).padStart(2, "0")}</span>
            <p className="text-sm font-bold leading-6">{pair.left}</p>
            <select
              value={answers[pair.id] ?? ""}
              onChange={(event) => {
                setChecked(false);
                setAnswers((current) => ({ ...current, [pair.id]: event.target.value }));
              }}
              className={`focus-ring min-h-11 rounded-xl border bg-surface px-3 text-sm ${checked ? answers[pair.id] === pair.right ? "border-moss" : "border-warn" : "border-line-strong"}`}
            >
              <option value="">Relaciona…</option>
              {rights.map((right) => <option key={right} value={right}>{right}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{checked ? `${correct}/${lab.matchingPairs.length} asociaciones correctas.` : "Une cada concepto con su pareja."}</p>
        <button type="button" onClick={() => { setChecked(true); onComplete?.(Math.round((correct / Math.max(1, lab.matchingPairs.length)) * 100)); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-bold text-white"><Check className="size-3.5" /> Comprobar</button>
      </div>
    </div>
  );
}

function SequenceLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const initial = useMemo(() => [...lab.sequenceItems].sort((a, b) => b.order - a.order), [lab.sequenceItems]);
  const [items, setItems] = useState(initial);
  const [checked, setChecked] = useState(false);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setChecked(false);
  }

  function reset() {
    setItems(initial);
    setChecked(false);
  }

  const correct = items.every((item, index) => item.order === index + 1);

  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[34px_minmax(0,1fr)_92px] items-center gap-3 rounded-2xl border border-line p-3">
            <span className="display-font text-xl text-accent">{String(index + 1).padStart(2, "0")}</span>
            <p className="text-sm font-bold leading-6">{item.label}</p>
            <div className="flex justify-end gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" className="focus-ring grid size-10 place-items-center rounded-xl border border-line-strong disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar" className="focus-ring grid size-10 place-items-center rounded-xl border border-line-strong disabled:opacity-30"><ArrowDown className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm font-medium ${checked ? correct ? "text-moss" : "text-warn" : "text-muted"}`}>{checked ? correct ? "Secuencia correcta." : "Todavía hay pasos fuera de lugar." : "Reconstruye el proceso."}</p>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="focus-ring grid size-11 place-items-center rounded-xl border border-line-strong text-muted" aria-label="Reiniciar"><RefreshCw className="size-3.5" /></button>
          <button type="button" onClick={() => { setChecked(true); onComplete?.(correct ? 100 : 40); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-bold text-white"><Check className="size-3.5" /> Comprobar</button>
        </div>
      </div>
    </div>
  );
}


function ProbabilitySimulatorLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const probabilityParameter = lab.parameters.find((item) => item.id.toLowerCase().includes("p")) ?? lab.parameters[0] ?? { id: "p", label: "Probabilidad", min: 0, max: 1, step: 0.05, defaultValue: 0.5 };
  const trialsParameter = lab.parameters.find((item) => item.id.toLowerCase().includes("trial")) ?? { id: "trials", label: "Intentos", min: 20, max: 500, step: 20, defaultValue: 100 };
  const [p, setP] = useState(Math.min(probabilityParameter.max, Math.max(probabilityParameter.min, probabilityParameter.defaultValue)));
  const [trials, setTrials] = useState(Math.round(trialsParameter.defaultValue));
  const [successes, setSuccesses] = useState<number | null>(null);

  function simulate() {
    let count = 0;
    for (let index = 0; index < trials; index += 1) if (Math.random() < p) count += 1;
    setSuccesses(count);
    onComplete?.(100);
  }

  const observed = successes === null ? null : successes / Math.max(1, trials);
  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">{probabilityParameter.label}<span className="ml-2 text-accent">{p.toFixed(2)}</span><input type="range" min={probabilityParameter.min} max={probabilityParameter.max} step={probabilityParameter.step} value={p} onChange={(event) => { setP(Number(event.target.value)); setSuccesses(null); }} className="mt-3 w-full accent-[#5146e5]" /></label>
        <label className="text-sm font-bold">{trialsParameter.label}<span className="ml-2 text-accent">{trials}</span><input type="range" min={trialsParameter.min} max={trialsParameter.max} step={trialsParameter.step} value={trials} onChange={(event) => { setTrials(Number(event.target.value)); setSuccesses(null); }} className="mt-3 w-full accent-[#0d9e98]" /></label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#f5f7ff] p-4"><p className="meta-font text-[8px] uppercase text-muted">Esperado</p><strong className="mt-1 block text-2xl text-[#34428f]">{Math.round(p * trials)}</strong></div><div className="rounded-2xl bg-[#f0faf7] p-4"><p className="meta-font text-[8px] uppercase text-muted">Observado</p><strong className="mt-1 block text-2xl text-moss">{successes ?? "—"}</strong></div><div className="rounded-2xl bg-[#fff8ef] p-4"><p className="meta-font text-[8px] uppercase text-muted">Frecuencia</p><strong className="mt-1 block text-2xl text-warn">{observed === null ? "—" : observed.toFixed(3)}</strong></div></div>
      <button type="button" onClick={simulate} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-bold text-white"><RefreshCw className="size-3.5" /> Simular</button>
      {observed !== null && <p className="mt-3 text-sm leading-6 text-muted">Con más intentos, la frecuencia observada tiende a acercarse a la probabilidad configurada. Prueba extremos y tamaños de muestra distintos.</p>}
    </div>
  );
}

function StatisticsOutlierLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const base = lab.dataset.length >= 5 ? lab.dataset : [10, 11, 12, 13, 14, 15];
  const [outlier, setOutlier] = useState(base[base.length - 1]);
  const values = [...base.slice(0, -1), outlier];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const min = Math.min(...base.slice(0, -1), 0);
  const max = Math.max(...base) * 4 || 100;
  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <label className="text-sm font-bold">Mueve el último dato <span className="ml-2 text-warn">{outlier.toFixed(1)}</span><input type="range" min={min} max={max} step="1" value={outlier} onChange={(event) => { setOutlier(Number(event.target.value)); onComplete?.(100); }} className="mt-3 w-full accent-[#f17327]" /></label>
      <div className="mt-4 flex h-28 items-end gap-2 rounded-2xl bg-[#f8faff] p-4">{values.map((value, index) => { const height = Math.max(8, Math.round((value / Math.max(...values, 1)) * 84)); return <div key={`${index}-${value}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><div className={`w-full max-w-10 rounded-t-lg ${index === values.length - 1 ? "bg-[#f59b61]" : "bg-[#6478e8]"}`} style={{ height }} /><span className="text-[9px] font-bold text-muted">{value.toFixed(0)}</span></div>; })}</div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f2f4ff] p-4"><p className="meta-font text-[8px] uppercase text-muted">Media</p><strong className="mt-1 block text-2xl text-[#384794]">{mean.toFixed(2)}</strong></div><div className="rounded-2xl bg-[#eef9f6] p-4"><p className="meta-font text-[8px] uppercase text-muted">Mediana</p><strong className="mt-1 block text-2xl text-moss">{median.toFixed(2)}</strong></div></div>
      <p className="mt-3 text-sm leading-6 text-muted">Observa qué medida cambia más cuando empujas un valor lejos del resto.</p>
    </div>
  );
}

function MlThresholdLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const scores = lab.dataset.length >= 6 ? lab.dataset : [0.92, 0.82, 0.73, 0.64, 0.42, 0.31, 0.18, 0.08];
  const labels = lab.binaryLabels.length === scores.length ? lab.binaryLabels : [1, 1, 1, 0, 1, 0, 0, 0].slice(0, scores.length);
  const thresholdParameter = lab.parameters.find((item) => item.id.toLowerCase().includes("threshold")) ?? { id: "threshold", label: "Threshold", min: 0, max: 1, step: 0.05, defaultValue: 0.5 };
  const [threshold, setThreshold] = useState(thresholdParameter.defaultValue);
  let tp = 0, fp = 0, tn = 0, fn = 0;
  scores.forEach((score, index) => { const predicted = score >= threshold ? 1 : 0; const actual = labels[index] ?? 0; if (predicted === 1 && actual === 1) tp += 1; else if (predicted === 1) fp += 1; else if (actual === 0) tn += 1; else fn += 1; });
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <label className="text-sm font-bold">{thresholdParameter.label}<span className="ml-2 text-accent">{threshold.toFixed(2)}</span><input type="range" min={thresholdParameter.min} max={thresholdParameter.max} step={thresholdParameter.step} value={threshold} onChange={(event) => { setThreshold(Number(event.target.value)); onComplete?.(100); }} className="mt-3 w-full accent-[#5146e5]" /></label>
      <div className="mt-4 grid grid-cols-4 gap-2">{[["TP", tp, "#eef9f6"], ["FP", fp, "#fff6ee"], ["TN", tn, "#f2f5ff"], ["FN", fn, "#fff1f0"]].map(([label, value, bg]) => <div key={String(label)} className="rounded-2xl p-3 text-center" style={{ background: String(bg) }}><p className="meta-font text-[8px] uppercase text-muted">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-line p-3"><p className="text-xs font-bold text-muted">Precisión</p><p className="display-font mt-1 text-3xl text-[#384794]">{(precision * 100).toFixed(0)}%</p></div><div className="rounded-2xl border border-line p-3"><p className="text-xs font-bold text-muted">Recall</p><p className="display-font mt-1 text-3xl text-moss">{(recall * 100).toFixed(0)}%</p></div></div>
      <p className="mt-3 text-sm leading-6 text-muted">Mueve el threshold y observa el intercambio entre falsos positivos, falsos negativos, precisión y recall.</p>
    </div>
  );
}

function VectorTransformLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const matrix = lab.matrix.length === 4 ? lab.matrix : [1, 0.5, 0, 1];
  const initial = lab.vector.length === 2 ? lab.vector : [1, 1];
  const [x, setX] = useState(initial[0]);
  const [y, setY] = useState(initial[1]);
  const tx = matrix[0] * x + matrix[1] * y;
  const ty = matrix[2] * x + matrix[3] * y;
  const scale = 28;
  const origin = 100;
  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Vector x <span className="text-accent">{x.toFixed(1)}</span><input type="range" min="-3" max="3" step="0.25" value={x} onChange={(event) => { setX(Number(event.target.value)); onComplete?.(100); }} className="mt-2 w-full accent-[#5146e5]" /></label><label className="text-sm font-bold">Vector y <span className="text-moss">{y.toFixed(1)}</span><input type="range" min="-3" max="3" step="0.25" value={y} onChange={(event) => { setY(Number(event.target.value)); onComplete?.(100); }} className="mt-2 w-full accent-[#0d9e98]" /></label></div>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center"><svg viewBox="0 0 200 200" className="h-auto w-full max-w-[220px] rounded-2xl bg-[#f8faff]" role="img" aria-label="Vector original y transformado"><line x1="0" y1={origin} x2="200" y2={origin} stroke="#d5dbea" /><line x1={origin} y1="0" x2={origin} y2="200" stroke="#d5dbea" /><line x1={origin} y1={origin} x2={origin + x * scale} y2={origin - y * scale} stroke="#5146e5" strokeWidth="4" strokeLinecap="round" /><circle cx={origin + x * scale} cy={origin - y * scale} r="5" fill="#5146e5" /><line x1={origin} y1={origin} x2={origin + tx * scale} y2={origin - ty * scale} stroke="#0d9e98" strokeWidth="4" strokeLinecap="round" /><circle cx={origin + tx * scale} cy={origin - ty * scale} r="5" fill="#0d9e98" /></svg><div><p className="meta-font text-[8px] uppercase text-muted">Matriz 2×2</p><p className="mt-2 rounded-xl bg-[#f5f7ff] p-3 font-mono text-sm">[{matrix[0]}, {matrix[1]}]<br />[{matrix[2]}, {matrix[3]}]</p><p className="mt-3 text-sm leading-6 text-muted">Original: ({x.toFixed(2)}, {y.toFixed(2)})<br /><strong className="text-moss">Transformado: ({tx.toFixed(2)}, {ty.toFixed(2)})</strong></p></div></div>
    </div>
  );
}

function CodePredictionLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
      <pre className="overflow-x-auto rounded-2xl bg-ink p-5 text-sm leading-6 text-white"><code>{lab.codeSnippet}</code></pre>
      <p className="mt-5 text-sm font-bold leading-6">{lab.codeQuestion}</p>
      <div className="mt-3 grid gap-2">
        {lab.codeOptions.map((option, index) => (
          <button
            key={`${option}-${index}`}
            type="button"
            onClick={() => { setChoice(index); setChecked(false); }}
            className={`focus-ring min-h-12 rounded-xl border px-4 text-left text-sm ${choice === index ? "border-ink bg-surface-strong font-bold" : "border-line-strong bg-surface"}`}
          >
            {String.fromCharCode(65 + index)} · {option}
          </button>
        ))}
      </div>
      {checked && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm font-medium ${choice === lab.codeAnswerIndex ? "border-moss bg-moss-soft/55 text-moss" : "border-warn bg-accent-soft/35 text-warn"}`}>
          {choice === lab.codeAnswerIndex ? "Predicción correcta." : `Revisa el flujo. La opción correcta es ${lab.codeAnswerIndex === null ? "la indicada" : String.fromCharCode(65 + lab.codeAnswerIndex)}.`}
        </div>
      )}
      <button type="button" disabled={choice === null} onClick={() => { setChecked(true); onComplete?.(choice === lab.codeAnswerIndex ? 100 : 0); }} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-bold text-white disabled:opacity-40"><Check className="size-3.5" /> Comprobar</button>
    </div>
  );
}

export function InteractiveLab({ lab, onComplete }: { lab: LabSpec; onComplete?: (score: number) => void }) {
  if (lab.type === "logic_switch") return <LogicSwitchLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "truth_table") return <TruthTableLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "matching") return <MatchingLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "sequence") return <SequenceLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "probability_simulator") return <ProbabilitySimulatorLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "statistics_outlier") return <StatisticsOutlierLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "ml_threshold") return <MlThresholdLab lab={lab} onComplete={onComplete} />;
  if (lab.type === "vector_transform") return <VectorTransformLab lab={lab} onComplete={onComplete} />;
  return <CodePredictionLab lab={lab} onComplete={onComplete} />;
}
