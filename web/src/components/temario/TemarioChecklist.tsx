"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MateriaFilter, type MateriaOption } from "@/components/MateriaFilter";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import {
  getChecklistMarks,
  setMazoMarcado,
} from "@/lib/persistence/checklist-service";
import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { UserStatsRecord } from "@/lib/persistence/types";
import {
  construirTemarioChecklist,
  type TemarioChecklistItem,
  type TemarioMateriaResumen,
} from "@/lib/temario-checklist";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
};

function progressBarColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-500";
}

function scoreColor(pct: number | null): string {
  if (pct === null) return "text-slate-400";
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}

function ChecklistRow({
  item,
  onToggleFichas,
}: {
  item: TemarioChecklistItem;
  onToggleFichas: (mazoId: string, done: boolean) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2.5 first:border-t-0 sm:px-4">
      <label className="flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
          checked={item.hecho}
          disabled={!item.manual}
          onChange={(e) => {
            if (item.manual && item.kind === "fichas") {
              onToggleFichas(item.id, e.target.checked);
            }
          }}
          title={
            item.manual
              ? "Marcar mazo como estudiado"
              : "Se marca al completar un test"
          }
        />
      </label>
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          item.kind === "test"
            ? item.tipo === "practico"
              ? "bg-violet-100 text-violet-700"
              : "bg-sky-100 text-sky-700"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {item.kind === "test" ? (item.tipo === "practico" ? "Práct." : "Test") : "Fichas"}
      </span>
      <Link
        href={item.href}
        className={`min-w-0 flex-1 text-sm font-medium hover:text-blue-700 ${
          item.hecho ? "text-slate-500 line-through" : "text-slate-800"
        }`}
      >
        {item.nombre}
      </Link>
      <span className="shrink-0 text-xs tabular-nums text-slate-500">
        {item.count} {item.kind === "test" ? "preg." : "fich."}
      </span>
      {item.kind === "test" && item.porcentaje !== null && (
        <span className={`shrink-0 text-xs font-semibold tabular-nums ${scoreColor(item.porcentaje)}`}>
          {item.porcentaje}%
        </span>
      )}
      <Link
        href={item.href}
        className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
      >
        {item.kind === "test" ? "Hacer test" : "Estudiar"}
      </Link>
    </li>
  );
}

function MateriaBlock({
  materia,
  open,
  onToggle,
  onToggleFichas,
  soloPendientes,
}: {
  materia: TemarioMateriaResumen;
  open: boolean;
  onToggle: () => void;
  onToggleFichas: (mazoId: string, done: boolean) => void;
  soloPendientes: boolean;
}) {
  const items = soloPendientes
    ? materia.items.filter((i) => !i.hecho)
    : materia.items;

  if (soloPendientes && items.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-lg leading-none text-slate-400">{open ? "▾" : "▸"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-800">{materia.materiaNombre}</h3>
          <p className="text-xs text-slate-500">
            {materia.hechos}/{materia.total} completado
            {materia.total !== 1 ? "s" : ""}
            {materia.testsTotal > 0 && (
              <> · Tests {materia.testsHechos}/{materia.testsTotal}</>
            )}
            {materia.fichasTotal > 0 && (
              <> · Fichas {materia.fichasHechas}/{materia.fichasTotal}</>
            )}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-600">
          {materia.pctHecho}%
        </span>
      </button>
      {open && (
        <>
          <div className="mx-4 mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${progressBarColor(materia.pctHecho)}`}
              style={{ width: `${materia.pctHecho}%` }}
            />
          </div>
          <ul className="pb-1">
            {items.map((item) => (
              <ChecklistRow key={`${item.kind}-${item.id}`} item={item} onToggleFichas={onToggleFichas} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function TemarioChecklist({ testSections, fichaSections }: Props) {
  const [stats, setStats] = useState<UserStatsRecord | null>(null);
  const [marksVersion, setMarksVersion] = useState(0);
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const uid = getOrCreateUsuarioId();
      let s = await getLocalCache().getStats(uid);
      if (!s) {
        s = await getLocalCache().recomputeStats(uid);
      }
      if (!cancelled) setStats(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const marks = useMemo(() => getChecklistMarks(), [marksVersion]);

  const resumen = useMemo(
    () => construirTemarioChecklist(testSections, fichaSections, stats, marks),
    [testSections, fichaSections, stats, marks],
  );

  const materiasOptions: MateriaOption[] = useMemo(
    () => resumen.materias.map((m) => ({ id: m.materiaId, nombre: m.materiaNombre })),
    [resumen.materias],
  );

  const visibleMaterias = useMemo(() => {
    let list = resumen.materias;
    if (materiaId) list = list.filter((m) => m.materiaId === materiaId);
    return list;
  }, [resumen.materias, materiaId]);

  const onToggleFichas = useCallback((mazoId: string, done: boolean) => {
    setMazoMarcado(mazoId, done);
    setMarksVersion((v) => v + 1);
  }, []);

  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenIds(new Set(visibleMaterias.map((m) => m.materiaId)));
  }, [visibleMaterias]);

  if (resumen.totalItems === 0) {
    return (
      <div className="card">
        <p className="muted">No hay material cargado todavía. Importa bancos y fichas en Material.</p>
        <Link href="/admin" className="btn-primary" style={{ marginTop: "1rem" }}>
          Ir a Material
        </Link>
      </div>
    );
  }

  const pendientes = resumen.totalItems - resumen.hechos;

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Progreso total</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{resumen.pctHecho}%</p>
          <p className="text-sm text-slate-500">
            {resumen.hechos}/{resumen.totalItems} ítems
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${progressBarColor(resumen.pctHecho)}`}
              style={{ width: `${resumen.pctHecho}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tests</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">
            {resumen.testsHechos}/{resumen.testsTotal}
          </p>
          <p className="text-sm text-slate-500">bancos practicados al menos una vez</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fichas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {resumen.fichasHechas}/{resumen.fichasTotal}
          </p>
          <p className="text-sm text-slate-500">mazos marcados como estudiados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <a
          href="/imprimir/temario"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
        >
          🖨️ Imprimir checklist
        </a>
        {materiasOptions.length > 1 && (
          <MateriaFilter
            materias={materiasOptions}
            value={materiaId}
            onChange={setMateriaId}
          />
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
            className="rounded border-slate-300"
          />
          Solo pendientes ({pendientes})
        </label>
        <button type="button" className="btn-link btn-sm" onClick={expandAll}>
          Expandir todo
        </button>
      </div>

      {/* Lista por materia */}
      <div className="space-y-3">
        {visibleMaterias.map((m) => (
          <MateriaBlock
            key={m.materiaId}
            materia={m}
            open={openIds.has(m.materiaId)}
            onToggle={() => toggleOpen(m.materiaId)}
            onToggleFichas={onToggleFichas}
            soloPendientes={soloPendientes}
          />
        ))}
        {soloPendientes &&
          visibleMaterias.every(
            (m) => m.items.filter((i) => !i.hecho).length === 0,
          ) && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              🎉 No tienes pendientes en esta selección. ¡Buen trabajo!
            </p>
          )}
      </div>

      <p className="text-xs text-slate-500">
        Los tests se marcan solos al terminar un intento. Las fichas puedes marcarlas manualmente
        cuando las hayas repasado.
      </p>
    </div>
  );
}
