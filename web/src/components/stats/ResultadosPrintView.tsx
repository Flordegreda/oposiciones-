"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PrintTemarioToolbar } from "@/components/temario/PrintTemarioToolbar";
import { JEX_SUBTITLE, SITE_TITLE } from "@/lib/constants";
import {
  examNotaSobre10,
  formatNeto,
  formatNotaSobre10,
} from "@/lib/exam-utils";
import {
  filtrarPorFecha,
  getResultadosFromCache,
  type FiltroTiempo,
} from "@/lib/persistence/estadisticas-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import { notaBanda } from "@/lib/temario-checklist";

const FILTRO_LABEL: Record<FiltroTiempo, string> = {
  "7dias": "Últimos 7 días",
  "30dias": "Últimos 30 días",
  "90dias": "Últimos 90 días",
  todo: "Todo el historial",
};

function parseFiltro(raw: string | null): FiltroTiempo {
  if (raw === "7dias" || raw === "30dias" || raw === "90dias" || raw === "todo") return raw;
  return "todo";
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function enBlancoDe(r: TestResultRecord): number {
  return Math.max(0, r.totalPreguntas - r.aciertos - r.fallos);
}

export function ResultadosPrintView() {
  const searchParams = useSearchParams();
  const filtro = parseFiltro(searchParams.get("periodo"));
  const [resultados, setResultados] = useState<TestResultRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getResultadosFromCache();
        if (!cancelled) setResultados(filtrarPorFecha(rows, filtro));
      } catch {
        if (!cancelled) setResultados([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtro]);

  const resumen = useMemo(() => {
    const rows = resultados ?? [];
    const tests = rows.length;
    const aciertos = rows.reduce((n, r) => n + r.aciertos, 0);
    const fallos = rows.reduce((n, r) => n + r.fallos, 0);
    const preguntas = rows.reduce((n, r) => n + r.totalPreguntas, 0);
    const blancos = rows.reduce((n, r) => n + enBlancoDe(r), 0);
    const notas = rows
      .map((r) => examNotaSobre10(r.aciertos, r.fallos, r.totalPreguntas))
      .filter((n): n is number => n != null);
    const media10 = notas.length
      ? notas.reduce((s, n) => s + n, 0) / notas.length
      : null;
    return { tests, aciertos, fallos, preguntas, blancos, media10 };
  }, [resultados]);

  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (resultados === null) {
    return (
      <>
        <PrintTemarioToolbar
          showToggle={false}
          backHref="/"
          backLabel="← Volver al resumen"
        />
        <p className="print-sheet-meta">Cargando tus tests…</p>
      </>
    );
  }

  return (
    <>
      <PrintTemarioToolbar
        showToggle={false}
        backHref="/"
        backLabel="← Volver al resumen"
      />
      <article className="print-document print-checklist-doc">
        <header className="print-sheet-head">
          <h1 className="print-sheet-title">Informe de tests hechos</h1>
          <p className="print-sheet-sub">
            {SITE_TITLE} · {JEX_SUBTITLE}
          </p>
          <p className="print-sheet-meta">
            {FILTRO_LABEL[filtro]} · {date} · {resumen.tests} test
            {resumen.tests !== 1 ? "s" : ""}
          </p>
          <p className="print-checklist-totales">
            {resumen.preguntas} pregunta{resumen.preguntas !== 1 ? "s" : ""} ·{" "}
            {resumen.aciertos} acierto{resumen.aciertos !== 1 ? "s" : ""} ·{" "}
            {resumen.fallos} fallo{resumen.fallos !== 1 ? "s" : ""} (incorrectas) ·{" "}
            {resumen.blancos} en blanco
            {resumen.media10 != null && (
              <>
                {" "}
                · media neta {formatNotaSobre10(resumen.media10)}/10
              </>
            )}
          </p>
          <p className="print-checklist-legend">
            Nota neta = aciertos − incorrectas/4 (en blanco, 0). La nota /10 es esa neta
            reescalada al tamaño del test.
          </p>
        </header>

        {resultados.length === 0 ? (
          <p className="print-checklist-empty" style={{ padding: "0.75rem 0" }}>
            No hay tests hechos en este periodo en este dispositivo.
          </p>
        ) : (
          <>
            <section className="print-informe-listado">
              <h2 className="print-checklist-materia-title">Listado</h2>
              <table className="print-checklist-table print-informe-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Test</th>
                    <th scope="col" className="print-informe-num">
                      Preg.
                    </th>
                    <th scope="col" className="print-informe-num">
                      Ac.
                    </th>
                    <th scope="col" className="print-informe-num">
                      Fallos
                    </th>
                    <th scope="col" className="print-informe-num">
                      Bl.
                    </th>
                    <th scope="col" className="print-informe-num">
                      Neto
                    </th>
                    <th scope="col" className="print-informe-num">
                      /10
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => {
                    const nota10 = examNotaSobre10(r.aciertos, r.fallos, r.totalPreguntas);
                    const banda = notaBanda(nota10);
                    return (
                      <tr
                        key={r.id}
                        className={banda === "baja" ? "print-checklist-row--baja" : undefined}
                      >
                        <td className="print-informe-fecha">{formatFecha(r.fecha)}</td>
                        <td className="print-checklist-col-nombre">{r.test}</td>
                        <td className="print-informe-num">{r.totalPreguntas}</td>
                        <td className="print-informe-num">{r.aciertos}</td>
                        <td className="print-informe-num">{r.fallos}</td>
                        <td className="print-informe-num">{enBlancoDe(r)}</td>
                        <td className="print-informe-num">{formatNeto(r.aciertos, r.fallos)}</td>
                        <td
                          className={`print-informe-num print-checklist-nota--${banda}`}
                        >
                          {formatNotaSobre10(nota10)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </article>
    </>
  );
}
