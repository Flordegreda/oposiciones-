"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MateriaFilter, type MateriaOption } from "@/components/MateriaFilter";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { usePersistence } from "@/components/PersistenceProvider";
import {
  getChecklistMarks,
  setMazoMarcado,
} from "@/lib/persistence/checklist-service";
import { isProgresoBanco } from "@/lib/persistence/account";
import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import { formatNotaSobre10 } from "@/lib/exam-utils";
import {
  construirTemarioChecklist,
  construirTemarioInventario,
  formatContenidoResumen,
  materiasAReforzar,
  type MateriaCatalogo,
  type TemarioChecklistItem,
  type TemarioMateriaResumen,
} from "@/lib/temario-checklist";

type Variant = "avance" | "material";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
  allMaterias: MateriaCatalogo[];
  /** avance = notas y progreso; material = inventario disponible. */
  variant?: Variant;
};

function progressBarColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-500";
}

function notaColor(nota: number | null): string {
  if (nota === null) return "text-slate-400";
  if (nota >= 7.5) return "text-emerald-600";
  if (nota >= 6) return "text-amber-600";
  return "text-red-600";
}

function ChecklistRow({
  item,
  onToggleFichas,
  variant,
}: {
  item: TemarioChecklistItem;
  onToggleFichas: (mazoId: string, done: boolean) => void;
  variant: Variant;
}) {
  const inventario = variant === "material";
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2.5 first:border-t-0 sm:px-4">
      {!inventario && (
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
      )}
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
          !inventario && item.kind === "fichas" && item.hecho
            ? "text-slate-500 line-through"
            : "text-slate-800"
        }`}
      >
        {item.nombre}
      </Link>
      <span className="shrink-0 text-xs tabular-nums text-slate-500">
        {item.count} {item.kind === "test" ? "preg." : "fich."}
      </span>
      {!inventario &&
        item.kind === "test" &&
        (item.notaSobre10 !== null ? (
          <span
            className="shrink-0 text-right"
            title={`${item.intentos} intento${item.intentos !== 1 ? "s" : ""} · acierto bruto ${item.porcentaje}%`}
          >
            <span className={`block text-sm font-bold tabular-nums ${notaColor(item.notaSobre10)}`}>
              {item.intentos}× · {formatNotaSobre10(item.notaSobre10)}
            </span>
            <span className="block text-[11px] tabular-nums text-slate-400">
              {item.porcentaje}% acierto
            </span>
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-slate-400">Sin hacer</span>
        ))}
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
  variant,
}: {
  materia: TemarioMateriaResumen;
  open: boolean;
  onToggle: () => void;
  onToggleFichas: (mazoId: string, done: boolean) => void;
  soloPendientes: boolean;
  variant: Variant;
}) {
  const inventario = variant === "material";
  const items = !inventario && soloPendientes
    ? materia.items.filter((i) => !i.hecho)
    : materia.items;

  if (!inventario && soloPendientes && items.length === 0) return null;

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
            {inventario ? (
              <>
                {materia.testsTotal} test{materia.testsTotal !== 1 ? "s" : ""}
                {materia.fichasTotal > 0 && (
                  <> · {materia.fichasTotal} mazo{materia.fichasTotal !== 1 ? "s" : ""}</>
                )}
                {" · "}
                {materia.total} ítem{materia.total !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                {materia.hechos}/{materia.total} completado
                {materia.total !== 1 ? "s" : ""}
                {materia.testsTotal > 0 && (
                  <> · Tests {materia.testsHechos}/{materia.testsTotal}</>
                )}
                {materia.fichasTotal > 0 && (
                  <> · Fichas {materia.fichasHechas}/{materia.fichasTotal}</>
                )}
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {!inventario && materia.mediaTests !== null && (
            <p className={`text-sm font-bold tabular-nums ${notaColor(materia.mediaTests)}`}>
              Media {formatNotaSobre10(materia.mediaTests)}
              <span className="text-xs font-semibold text-slate-400">/10</span>
              {materia.mediaPct !== null && (
                <span className="ml-1 text-xs font-medium text-slate-400">{materia.mediaPct}%</span>
              )}
            </p>
          )}
          {!inventario && (
            <p className="text-xs font-semibold tabular-nums text-slate-500">{materia.pctHecho}% hecho</p>
          )}
        </div>
      </button>
      {open && (
        <>
          {!inventario && (
            <div className="mx-4 mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${progressBarColor(materia.pctHecho)}`}
                style={{ width: `${materia.pctHecho}%` }}
              />
            </div>
          )}
          <ul className="pb-1">
            {items.length === 0 ? (
              <li className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 italic">
                Sin tests ni fichas en esta materia
              </li>
            ) : (
              items.map((item) => (
                <ChecklistRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onToggleFichas={onToggleFichas}
                  variant={variant}
                />
              ))
            )}
          </ul>
        </>
      )}
    </section>
  );
}

export function TemarioChecklist({
  testSections,
  fichaSections,
  allMaterias,
  variant = "avance",
}: Props) {
  const { revision } = usePersistence();
  const [resultados, setResultados] = useState<TestResultRecord[]>([]);
  const [marksVersion, setMarksVersion] = useState(0);
  const [materiaId, setMateriaId] = useState<string | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (variant === "material") return;
    let cancelled = false;
    void (async () => {
      const uid = getOrCreateUsuarioId();
      try {
        const rows = await getLocalCache().getAllResultados();
        if (!cancelled) {
          setResultados(
            rows.filter((r) => r.usuarioId === uid && !isProgresoBanco(r.banco)),
          );
        }
      } catch {
        if (!cancelled) setResultados([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, revision]);

  const marks = useMemo(
    () => (variant === "material" ? {} : getChecklistMarks()),
    [marksVersion, variant, revision],
  );

  const resumen = useMemo(
    () =>
      variant === "material"
        ? construirTemarioInventario(testSections, fichaSections, allMaterias)
        : construirTemarioChecklist(testSections, fichaSections, resultados, marks, allMaterias),
    [variant, testSections, fichaSections, resultados, marks, allMaterias],
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

  if (resumen.materias.length === 0) {
    return (
      <div className="card">
        <p className="muted">No hay materias definidas. Créalas en Material.</p>
        <Link href="/admin" className="btn-primary" style={{ marginTop: "1rem" }}>
          Ir a Material
        </Link>
      </div>
    );
  }

  if (resumen.totalItems === 0) {
    return (
      <div className="space-y-4">
        <div className="card">
          <p className="muted">
            Hay {resumen.materias.length} materia{resumen.materias.length !== 1 ? "s" : ""} pero
            ninguna tiene tests ni fichas cargados todavía.
          </p>
          <Link href="/admin" className="btn-primary" style={{ marginTop: "1rem" }}>
            Ir a Material
          </Link>
        </div>
        <ul className="space-y-2">
          {resumen.materias.map((m) => (
            <li key={m.materiaId} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {m.materiaNombre}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const pendientes = resumen.totalItems - resumen.hechos;
  const reforzar = variant === "avance" ? materiasAReforzar(resumen.materias) : [];
  const inventario = variant === "material";

  return (
    <div className="space-y-4">
      {inventario ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tests</p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{resumen.testsTotal}</p>
            <p className="text-sm text-slate-500">bancos disponibles</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fichas</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{resumen.fichasTotal}</p>
            <p className="text-sm text-slate-500">mazos disponibles</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Materias</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{resumen.materias.length}</p>
            <p className="text-sm text-slate-500">con material cargado</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nota media</p>
            <p className={`mt-1 text-2xl font-bold ${notaColor(resumen.mediaTests)}`}>
              {resumen.mediaTests !== null ? (
                <>
                  {formatNotaSobre10(resumen.mediaTests)}
                  <span className="ml-0.5 text-base font-semibold text-slate-400">/10</span>
                </>
              ) : (
                "—"
              )}
            </p>
            <p className="text-sm text-slate-500">
              {resumen.testsHechos === 0
                ? "haz un test para ver tu media"
                : `sobre 10 · ${resumen.mediaPct ?? "—"}% acierto bruto`}
            </p>
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
      )}

      {!inventario && reforzar.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">Céntrate más aquí</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Materias con la nota media más baja (penalizada sobre 10). Prioriza los tests en rojo
            (&lt;6).
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {reforzar.map((m) => (
              <li key={m.materiaId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-left text-sm hover:border-amber-400"
                  onClick={() => {
                    setSoloPendientes(false);
                    setMateriaId(m.materiaId);
                    setOpenIds((prev) => new Set(prev).add(m.materiaId));
                  }}
                >
                  <span className="min-w-0 truncate font-medium text-slate-800">{m.materiaNombre}</span>
                  <span className={`shrink-0 font-bold tabular-nums ${notaColor(m.mediaTests)}`}>
                    {formatNotaSobre10(m.mediaTests)}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      · {m.testsHechos} test{m.testsHechos !== 1 ? "s" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {inventario && (
        <p className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-800">Material total: </span>
          {formatContenidoResumen(resumen.contenido)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        {inventario ? (
          <a
            href="/imprimir/temario"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
          >
            🖨️ Imprimir inventario
          </a>
        ) : (
          <a
            href="/imprimir/temario/resultados"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
          >
            📄 Exportar notas PDF
          </a>
        )}
        {materiasOptions.length > 1 && (
          <MateriaFilter
            materias={materiasOptions}
            value={materiaId}
            onChange={setMateriaId}
          />
        )}
        {!inventario && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
              className="rounded border-slate-300"
            />
            Solo pendientes ({pendientes})
          </label>
        )}
        <button type="button" className="btn-link btn-sm" onClick={expandAll}>
          Expandir todo
        </button>
      </div>

      <div className="space-y-3">
        {visibleMaterias.map((m) => (
          <MateriaBlock
            key={m.materiaId}
            materia={m}
            open={openIds.has(m.materiaId)}
            onToggle={() => toggleOpen(m.materiaId)}
            onToggleFichas={onToggleFichas}
            soloPendientes={soloPendientes}
            variant={variant}
          />
        ))}
        {!inventario &&
          soloPendientes &&
          visibleMaterias.every(
            (m) => m.items.filter((i) => !i.hecho).length === 0,
          ) && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              🎉 No tienes pendientes en esta selección. ¡Buen trabajo!
            </p>
          )}
      </div>

      <p className="text-xs text-slate-500">
        {inventario
          ? "Esto es el material cargado: tests y fichas por materia. El avance de estudio (notas y pendientes) está en Resumen."
          : "Los tests se marcan solos al terminar un intento. La cifra principal es la nota penalizada sobre 10 (aciertos − incorrectas/4; en blanco, 0). El % es acierto bruto. Las fichas puedes marcarlas cuando las hayas repasado. El inventario del material está en Plan."}
      </p>
    </div>
  );
}
