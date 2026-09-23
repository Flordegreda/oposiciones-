"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePersistence } from "@/components/PersistenceProvider";
import { formatNotaSobre10 } from "@/lib/exam-utils";
import { isProgresoBanco } from "@/lib/persistence/account";
import { getChecklistMarks } from "@/lib/persistence/checklist-service";
import {
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
import type { TestResultRecord } from "@/lib/persistence/types";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import {
  construirTemarioChecklist,
  formatContenidoResumen,
  type MateriaCatalogo,
  type TemarioMateriaResumen,
} from "@/lib/temario-checklist";
import { obtenerPreguntasMasFalladas } from "@/lib/persistence/estadisticas-service";

const nf = new Intl.NumberFormat("es-ES");

type FiltroResumen = "todo" | "algo" | "nada";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
  allMaterias: MateriaCatalogo[];
};

function notaClass(nota: number | null): string {
  if (nota === null) return "resumen-kpi-value--muted";
  if (nota >= 7.5) return "resumen-kpi-value--ok";
  if (nota >= 6) return "resumen-kpi-value--mid";
  return "resumen-kpi-value--low";
}

function materiaMaterial(m: TemarioMateriaResumen): string {
  const preg = m.items.filter((i) => i.kind === "test").reduce((s, i) => s + i.count, 0);
  const fichas = m.items.filter((i) => i.kind === "fichas").reduce((s, i) => s + i.count, 0);
  const parts: string[] = [];
  if (preg > 0) parts.push(`${nf.format(preg)} preg.`);
  if (fichas > 0) parts.push(`${nf.format(fichas)} fichas`);
  return parts.join(" · ");
}

function primerTest(m: TemarioMateriaResumen, soloPendiente: boolean) {
  return (
    m.items.find((i) => i.kind === "test" && i.count > 0 && (!soloPendiente || !i.hecho)) ??
    m.items.find((i) => i.kind === "test")
  );
}

export function ResumenAvance({ testSections, fichaSections, allMaterias }: Props) {
  const { revision } = usePersistence();
  const [resultados, setResultados] = useState<TestResultRecord[]>([]);
  const [filtro, setFiltro] = useState<FiltroResumen>("todo");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const uid = getOrCreateUsuarioId();
      try {
        const rows = await getLocalCache().getAllResultados();
        if (!cancelled) {
          setResultados(rows.filter((r) => r.usuarioId === uid && !isProgresoBanco(r.banco)));
        }
      } catch {
        if (!cancelled) setResultados([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const resumen = useMemo(
    () =>
      construirTemarioChecklist(
        testSections,
        fichaSections,
        resultados,
        getChecklistMarks(),
        allMaterias,
      ),
    [testSections, fichaSections, resultados, allMaterias, revision],
  );

  const pendientes = resumen.totalItems - resumen.hechos;
  const conMaterial = resumen.materias.filter((m) => m.total > 0);
  const c = resumen.contenido;
  const preguntas = c.preguntasTeorico + c.preguntasPractico;
  const bancos = c.bancosTeorico + c.bancosPractico;
  const materiasConMaterial = conMaterial.length;
  const empezadas = conMaterial.filter((m) => m.hechos > 0);
  const sinEmpezar = conMaterial.filter((m) => m.hechos === 0);
  const visibles =
    filtro === "algo" ? empezadas : filtro === "nada" ? sinEmpezar : conMaterial;
  const falladas = obtenerPreguntasMasFalladas(resultados, 5000);
  const hueco = [...sinEmpezar].sort(
    (a, b) =>
      b.items.reduce((s, i) => s + (i.kind === "test" ? i.count : 0), 0) -
      a.items.reduce((s, i) => s + (i.kind === "test" ? i.count : 0), 0),
  )[0];
  const floja = [...empezadas]
    .filter((m) => m.mediaTests !== null && m.hechos < m.total)
    .sort((a, b) => (a.mediaTests ?? 10) - (b.mediaTests ?? 10))[0];
  const huecoTest = hueco ? primerTest(hueco, true) : undefined;
  const flojaTest = floja ? primerTest(floja, true) : undefined;

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
      <div className="resumen-kpis">
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Nota media</p>
          <p className={`resumen-kpi-value ${notaClass(resumen.mediaTests)}`}>
            {resumen.mediaTests !== null ? formatNotaSobre10(resumen.mediaTests) : "—"}
          </p>
        </div>
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Hecho</p>
          <p className="resumen-kpi-value">{resumen.pctHecho}%</p>
        </div>
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Pendientes</p>
          <p className="resumen-kpi-value">{pendientes}</p>
        </div>
      </div>

      <section className="resumen-hoy" aria-label="Siguiente paso">
        <h2>Para aprobar</h2>
        {falladas.length > 0 && (
          <Link href="/repaso-fallos">
            Repasa lo que has fallado
            <span>{nf.format(falladas.length)} preguntas</span>
          </Link>
        )}
        {hueco && huecoTest && (
          <Link href={huecoTest.href}>
            Empieza {hueco.materiaNombre}
            <span>aún no la has tocado</span>
          </Link>
        )}
        {floja && flojaTest && (
          <Link href={flojaTest.href}>
            Refuerza {floja.materiaNombre}
            <span>nota {formatNotaSobre10(floja.mediaTests)}</span>
          </Link>
        )}
        <Link href="/simulacro">
          Simulacro con tiempo
          <span>como el examen</span>
        </Link>
      </section>

      <div className="resumen-kpis resumen-kpis--material">
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Preguntas</p>
          <p className="resumen-kpi-value">{nf.format(preguntas)}</p>
        </div>
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Fichas</p>
          <p className="resumen-kpi-value">{nf.format(c.totalFichas)}</p>
        </div>
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Bancos</p>
          <p className="resumen-kpi-value">{nf.format(bancos)}</p>
        </div>
        <div className="resumen-kpi">
          <p className="resumen-kpi-label">Materias</p>
          <p className="resumen-kpi-value">{nf.format(materiasConMaterial)}</p>
        </div>
      </div>

      <p className="resumen-inventario muted small">{formatContenidoResumen(c)}</p>

      <div className="resumen-prints">
        <a href="/imprimir/temario" target="_blank" rel="noopener noreferrer">
          Imprimir inventario
        </a>
        <a href="/imprimir/temario/resultados" target="_blank" rel="noopener noreferrer">
          Exportar notas PDF
        </a>
      </div>

      <div className="resumen-filtro" role="group" aria-label="Filtrar materias">
        {(
          [
            ["todo", "Todo", conMaterial.length],
            ["algo", "Hecho algo", empezadas.length],
            ["nada", "Sin empezar", sinEmpezar.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filtro === id}
            onClick={() => setFiltro(id)}
          >
            {label}
            <span className="resumen-filtro-count">{n}</span>
          </button>
        ))}
      </div>

      <ul className="resumen-materias">
        {visibles.map((m) => {
          const meta = materiaMaterial(m);
          return (
          <li key={m.materiaId} className="resumen-materia">
            <div className="resumen-materia-top">
              <span className="resumen-materia-name">{m.materiaNombre}</span>
              <span className="muted small">
                {m.hechos}/{m.total}
                {m.mediaTests !== null ? ` · ${formatNotaSobre10(m.mediaTests)}` : ""}
              </span>
            </div>
            {meta ? <p className="resumen-materia-meta muted small">{meta}</p> : null}
            <div className="resumen-bar" aria-hidden>
              <span
                className="resumen-bar-fill"
                style={{ width: `${m.pctHecho}%` }}
              />
            </div>
          </li>
          );
        })}
      </ul>
      {visibles.length === 0 && (
        <p className="muted small">Ninguna materia en este filtro.</p>
      )}
    </div>
  );
}
