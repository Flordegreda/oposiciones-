"use client";

import { useEffect, useMemo, useState } from "react";
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
  formatContenidoResumen,
  materiasAReforzar,
  notaBanda,
  tipoCodigo,
  tipoEtiqueta,
  type MateriaCatalogo,
} from "@/lib/temario-checklist";
import { PrintTemarioToolbar } from "@/components/temario/PrintTemarioToolbar";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
  allMaterias: MateriaCatalogo[];
};

function formatNota(pct: number | null): string {
  return pct === null ? "—" : `${pct}%`;
}

export function TemarioResultadosPrintView({
  testSections,
  fichaSections,
  allMaterias,
}: Props) {
  const [stats, setStats] = useState<UserStatsRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const uid = getOrCreateUsuarioId();
      let s = await getLocalCache().getStats(uid);
      if (!s) {
        s = await getLocalCache().recomputeStats(uid);
      }
      if (!cancelled) {
        setStats(s);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const marks = useMemo(() => (ready ? getChecklistMarks() : {}), [ready]);

  const resumen = useMemo(
    () => construirTemarioChecklist(testSections, fichaSections, stats, marks, allMaterias),
    [testSections, fichaSections, stats, marks, allMaterias],
  );

  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const reforzar = materiasAReforzar(resumen.materias, 8);
  const testsConNota = resumen.materias.flatMap((m) =>
    m.items.filter((i) => i.kind === "test" && i.porcentaje !== null),
  );

  if (!ready) {
    return (
      <>
        <PrintTemarioToolbar showToggle={false} />
        <p className="print-sheet-meta">Cargando tus notas…</p>
      </>
    );
  }

  if (resumen.materias.length === 0) {
    return (
      <>
        <PrintTemarioToolbar showToggle={false} />
        <p className="print-sheet-meta">No hay materias definidas todavía.</p>
      </>
    );
  }

  return (
    <>
      <PrintTemarioToolbar showToggle={false} />
      <article className="print-document print-checklist-doc">
        <header className="print-sheet-head">
          <h1 className="print-sheet-title">Plan de temario — Notas de tests</h1>
          <p className="print-sheet-sub">Oposiciones JEX · Jurídica · Junta de Extremadura</p>
          <p className="print-sheet-meta">
            {resumen.testsHechos}/{resumen.testsTotal} tests hechos
            {resumen.mediaTests !== null && <> · Media global {resumen.mediaTests}%</>}
            {" · "}
            {date}
          </p>
          <p className="print-checklist-totales">{formatContenidoResumen(resumen.contenido)}</p>
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
            · Rojo &lt;60% · Ámbar 60–74% · Verde ≥75%
          </p>
        </header>

        {reforzar.length > 0 && (
          <section className="print-notas-focus">
            <h2 className="print-notas-focus-title">Céntrate más aquí</h2>
            <p className="print-checklist-materia-meta">
              Materias con la nota media más baja ({testsConNota.length} test
              {testsConNota.length !== 1 ? "s" : ""} con nota).
            </p>
            <ol className="print-notas-focus-list">
              {reforzar.map((m) => (
                <li key={m.materiaId}>
                  <strong>{m.materiaNombre}</strong>
                  {" · "}
                  media {m.mediaTests}%
                  {" · "}
                  {m.testsHechos}/{m.testsTotal} tests
                </li>
              ))}
            </ol>
          </section>
        )}

        {resumen.testsHechos === 0 && (
          <p className="print-checklist-empty" style={{ padding: "0.75rem 0" }}>
            Todavía no hay tests hechos en este dispositivo. Completa algún test en el plan y vuelve a
            exportar.
          </p>
        )}

        {resumen.materias.map((m) => (
          <section key={m.materiaId} className="print-checklist-materia">
            <h2 className="print-checklist-materia-title">{m.materiaNombre}</h2>
            <p className="print-checklist-materia-meta">
              {m.testsHechos}/{m.testsTotal} tests hechos
              {m.mediaTests !== null && <> · media {m.mediaTests}%</>}
              {m.fichasTotal > 0 && (
                <>
                  {" · "}
                  {m.fichasHechas}/{m.fichasTotal} mazos de fichas
                </>
              )}
            </p>
            <table className="print-checklist-table">
              <thead>
                <tr>
                  <th className="print-checklist-col-tipo" scope="col">
                    Tipo
                  </th>
                  <th className="print-checklist-col-nombre" scope="col">
                    Nombre
                  </th>
                  <th className="print-checklist-col-n" scope="col">
                    Nº
                  </th>
                  <th className="print-checklist-col-intentos" scope="col">
                    Veces
                  </th>
                  <th className="print-checklist-col-nota" scope="col">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="print-checklist-empty">
                      Sin tests ni fichas en esta materia
                    </td>
                  </tr>
                ) : (
                  m.items.map((item) => {
                    const banda = notaBanda(item.porcentaje);
                    return (
                      <tr
                        key={`${item.kind}-${item.id}`}
                        className={banda === "baja" ? "print-checklist-row--baja" : undefined}
                      >
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
                        <td className="print-checklist-col-intentos">
                          {item.kind === "test"
                            ? item.intentos > 0
                              ? `${item.intentos}×`
                              : "—"
                            : item.hecho
                              ? "✓"
                              : "—"}
                        </td>
                        <td className={`print-checklist-col-nota print-checklist-nota--${banda}`}>
                          {item.kind === "test" ? formatNota(item.porcentaje) : item.hecho ? "Hecho" : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        ))}
      </article>
    </>
  );
}
