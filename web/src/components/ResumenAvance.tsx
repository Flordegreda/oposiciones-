"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePersistence } from "@/components/PersistenceProvider";
import { sugerenciasGlobales } from "@/lib/para-aprobar";
import { getChecklistMarks } from "@/lib/persistence/checklist-service";
import {
  getResultadosFromCache,
  obtenerPreguntasMasFalladas,
} from "@/lib/persistence/estadisticas-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { construirTemarioChecklist, type MateriaCatalogo } from "@/lib/temario-checklist";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
  allMaterias: MateriaCatalogo[];
};

export function ResumenAvance({ testSections, fichaSections, allMaterias }: Props) {
  const { revision } = usePersistence();
  const [resultados, setResultados] = useState<TestResultRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getResultadosFromCache()
      .then((rows) => !cancelled && setResultados(rows))
      .catch(() => !cancelled && setResultados([]));
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const resumen = useMemo(
    () =>
      construirTemarioChecklist(testSections, fichaSections, resultados, getChecklistMarks(), allMaterias),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las marcas manuales cambian con revision
    [testSections, fichaSections, resultados, allMaterias, revision],
  );

  const sugerencias = useMemo(
    () => sugerenciasGlobales(resumen.materias, obtenerPreguntasMasFalladas(resultados, 5000).length),
    [resumen, resultados],
  );

  if (resumen.totalItems === 0) {
    return (
      <div className="card">
        <p className="muted">No hay tests ni fichas cargados todavía.</p>
        <Link href="/practicar" className="btn-primary" style={{ marginTop: "1rem" }}>
          Ir a Tests
        </Link>
      </div>
    );
  }

  return (
    <div className="resumen-avance">
      <section className="resumen-hoy" aria-label="Siguiente paso">
        <h2>Para aprobar</h2>
        {sugerencias.map((s) => (
          <Link key={s.href + s.titulo} href={s.href}>
            {s.titulo}
            <span>{s.detalle}</span>
          </Link>
        ))}
      </section>

      <Link
        href="/estadisticas"
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 no-underline shadow-sm hover:border-blue-300"
      >
        <span className="flex flex-col gap-0.5">
          <strong className="text-sm">Tu progreso por bloques</strong>
          <span className="text-xs text-slate-500">
            Llevas el {resumen.pctHecho}% del temario · elige un bloque para ver notas, fallos y qué te queda
          </span>
        </span>
        <span aria-hidden className="text-lg text-blue-600">→</span>
      </Link>
    </div>
  );
}
