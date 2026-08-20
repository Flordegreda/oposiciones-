"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PrintTemarioToolbar } from "@/components/temario/PrintTemarioToolbar";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { getChecklistMarks } from "@/lib/persistence/checklist-service";
import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { UserStatsRecord } from "@/lib/persistence/types";
import {
  construirTemarioChecklist,
  filtrarTemarioPendientes,
  tipoCodigo,
  tipoEtiqueta,
  type TemarioMateriaResumen,
  type TemarioResumenGlobal,
} from "@/lib/temario-checklist";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
};

function PrintBody({
  testSections,
  fichaSections,
  soloPendientes,
}: Props & { soloPendientes: boolean }) {
  const [stats, setStats] = useState<UserStatsRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const uid = getOrCreateUsuarioId();
      let s = await getLocalCache().getStats(uid);
      if (!s) s = await getLocalCache().recomputeStats(uid);
      if (!cancelled) {
        setStats(s);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const marks = useMemo(() => getChecklistMarks(), [ready]);

  const resumenCompleto = useMemo(
    () => construirTemarioChecklist(testSections, fichaSections, stats, marks),
    [testSections, fichaSections, stats, marks],
  );

  const resumen: TemarioResumenGlobal = soloPendientes
    ? filtrarTemarioPendientes(resumenCompleto)
    : resumenCompleto;

  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const pendientes = resumenCompleto.totalItems - resumenCompleto.hechos;

  if (!ready) {
    return (
      <>
        <PrintTemarioToolbar soloPendientes={soloPendientes} />
        <p className="print-sheet-meta">Cargando tu progreso…</p>
      </>
    );
  }

  if (resumen.totalItems === 0) {
    return (
      <>
        <PrintTemarioToolbar soloPendientes={soloPendientes} />
        <article className="print-document print-checklist-doc">
          <header className="print-sheet-head">
            <h1 className="print-sheet-title">
              {soloPendientes ? "Lo que te falta — Checklist" : "Plan de temario — Checklist"}
            </h1>
            <p className="print-sheet-meta">{date}</p>
          </header>
          <p className="print-checklist-empty">
            {soloPendientes
              ? "🎉 No tienes pendientes. Has completado todo el material registrado."
              : "No hay material cargado para imprimir."}
          </p>
          {!soloPendientes && pendientes > 0 && (
            <p className="print-sheet-meta">
              <Link href="/imprimir/temario">Ver lista de pendientes ({pendientes})</Link>
            </p>
          )}
        </article>
      </>
    );
  }

  return (
    <>
      <PrintTemarioToolbar soloPendientes={soloPendientes} />
      <article className="print-document print-checklist-doc">
        <header className="print-sheet-head">
          <h1 className="print-sheet-title">
            {soloPendientes ? "Lo que te falta por hacer" : "Plan de temario completo"}
          </h1>
          <p className="print-sheet-sub">Oposiciones JEX · Jurídica · Junta de Extremadura</p>
          <p className="print-sheet-meta">
            {soloPendientes ? (
              <>
                <strong>{resumen.totalItems} pendiente{resumen.totalItems !== 1 ? "s" : ""}</strong>{" "}
                de {resumenCompleto.totalItems} · {resumenCompleto.hechos} ya hecho
                {resumenCompleto.hechos !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                {resumen.materias.length} materia{resumen.materias.length !== 1 ? "s" : ""} ·{" "}
                {resumen.testsTotal} test{resumen.testsTotal !== 1 ? "s" : ""} ·{" "}
                {resumen.fichasTotal} mazo{resumen.fichasTotal !== 1 ? "s" : ""} de fichas ·{" "}
                {resumen.totalItems} ítems · {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
              </>
            )}{" "}
            · {date}
          </p>
          <p className="print-checklist-legend">
            <span className="print-checklist-legend-item">
              <strong>T</strong> = Test teórico
            </span>
            <span className="print-checklist-legend-item">
              <strong>P</strong> = Test práctico
            </span>
            <span className="print-checklist-legend-item">
              <strong>F</strong> = Fichas
            </span>
            · Marca con ✓ cada ítem cuando lo completes
          </p>
        </header>

        {resumen.materias.map((m) => (
          <MateriaPrintSection key={m.materiaId} materia={m} />
        ))}

        <footer className="print-checklist-footer">
          <p>
            Completados: _____ /{" "}
            {soloPendientes ? resumen.totalItems : resumenCompleto.totalItems} ítems
            {soloPendientes ? " (de esta lista pendiente)" : ""}
          </p>
        </footer>
      </article>
    </>
  );
}

function MateriaPrintSection({ materia }: { materia: TemarioMateriaResumen }) {
  return (
    <section className="print-checklist-materia">
      <h2 className="print-checklist-materia-title">{materia.materiaNombre}</h2>
      <p className="print-checklist-materia-meta">
        {materia.testsTotal} test{materia.testsTotal !== 1 ? "s" : ""}
        {" · "}
        {materia.fichasTotal} ficha{materia.fichasTotal !== 1 ? "s" : ""}
        {" · "}
        {materia.total} ítem{materia.total !== 1 ? "s" : ""}
      </p>
      <table className="print-checklist-table">
        <thead>
          <tr>
            <th className="print-checklist-col-check" scope="col">
              ✓
            </th>
            <th className="print-checklist-col-tipo" scope="col">
              Tipo
            </th>
            <th className="print-checklist-col-nombre" scope="col">
              Nombre
            </th>
            <th className="print-checklist-col-n" scope="col">
              Nº
            </th>
            <th className="print-checklist-col-notas" scope="col">
              Notas
            </th>
          </tr>
        </thead>
        <tbody>
          {materia.items.map((item) => (
            <tr key={`${item.kind}-${item.id}`}>
              <td className="print-checklist-col-check">
                <span className="print-check-box" aria-hidden="true" />
              </td>
              <td className="print-checklist-col-tipo">
                <span
                  className={`print-checklist-tipo print-checklist-tipo--${tipoCodigo(item).toLowerCase()}`}
                  title={tipoEtiqueta(item)}
                >
                  {tipoCodigo(item)}
                </span>
              </td>
              <td className="print-checklist-col-nombre">{item.nombre}</td>
              <td className="print-checklist-col-n">
                {item.count} {item.kind === "test" ? "preg." : "fich."}
              </td>
              <td className="print-checklist-col-notas">
                <span className="print-checklist-notes-line" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PrintInner(props: Props) {
  const searchParams = useSearchParams();
  const soloPendientes = searchParams.get("todo") !== "1";
  return <PrintBody {...props} soloPendientes={soloPendientes} />;
}

export function TemarioChecklistPrintView(props: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PrintTemarioToolbar soloPendientes />
          <p className="print-sheet-meta">Preparando…</p>
        </>
      }
    >
      <PrintInner {...props} />
    </Suspense>
  );
}
