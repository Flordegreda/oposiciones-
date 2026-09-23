"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readFichaDeckResumen } from "@/lib/ficha-deck-storage";
import {
  getChecklistMarks,
  mazoChecklistKey,
  type ChecklistMark,
} from "@/lib/persistence/checklist-service";
import type { MazoFichas } from "@/lib/queries/fichas";

type EstadoMazo = "repasado" | "en-curso" | "sin-empezar";

type MazoStats = {
  mazo: MazoFichas;
  estado: EstadoMazo;
  sabidas: number;
  noSe: number;
  repasadoEl: string | null;
};

function calcularMazo(mazo: MazoFichas, marks: Record<string, ChecklistMark>): MazoStats {
  const mark = marks[mazoChecklistKey(mazo.id)];
  const deck = readFichaDeckResumen(`ficha:${mazo.id}`);
  const marcado = mark?.done ?? false;
  const noSe = deck?.unknown ?? 0;

  if (marcado || deck?.completed) {
    return {
      mazo,
      estado: "repasado",
      sabidas:
        deck?.completed && deck.known != null
          ? Math.min(deck.known, mazo.numFichas)
          : mazo.numFichas,
      noSe,
      repasadoEl: marcado ? mark!.at : null,
    };
  }
  const pendientes = deck ? Math.min(deck.pendientes, mazo.numFichas) : mazo.numFichas;
  const sabidas = mazo.numFichas - pendientes;
  return {
    mazo,
    estado: sabidas > 0 || noSe > 0 ? "en-curso" : "sin-empezar",
    sabidas,
    noSe,
    repasadoEl: null,
  };
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function barColor(p: number): string {
  if (p >= 75) return "bg-emerald-500";
  if (p >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function formatDia(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function FichasEstadisticas({ mazos }: { mazos: MazoFichas[] }) {
  const [stats, setStats] = useState<MazoStats[] | null>(null);

  useEffect(() => {
    const recalcular = () => {
      const marks = getChecklistMarks();
      setStats(mazos.map((m) => calcularMazo(m, marks)));
    };
    recalcular();
    window.addEventListener("jex-progreso-changed", recalcular);
    window.addEventListener("storage", recalcular);
    return () => {
      window.removeEventListener("jex-progreso-changed", recalcular);
      window.removeEventListener("storage", recalcular);
    };
  }, [mazos]);

  const resumen = useMemo(() => {
    const rows = stats ?? [];
    const totalFichas = rows.reduce((n, r) => n + r.mazo.numFichas, 0);
    const sabidas = rows.reduce((n, r) => n + r.sabidas, 0);
    const noSe = rows.reduce((n, r) => n + r.noSe, 0);
    const repasados = rows.filter((r) => r.estado === "repasado").length;
    const enCurso = rows.filter((r) => r.estado === "en-curso").length;

    const porMateria = new Map<
      string,
      { nombre: string; mazos: number; repasados: number; fichas: number; sabidas: number }
    >();
    for (const r of rows) {
      const cur = porMateria.get(r.mazo.materiaId) ?? {
        nombre: r.mazo.materiaNombre,
        mazos: 0,
        repasados: 0,
        fichas: 0,
        sabidas: 0,
      };
      cur.mazos += 1;
      if (r.estado === "repasado") cur.repasados += 1;
      cur.fichas += r.mazo.numFichas;
      cur.sabidas += r.sabidas;
      porMateria.set(r.mazo.materiaId, cur);
    }

    const conDudas = rows
      .filter((r) => r.noSe > 0)
      .sort((a, b) => b.noSe / b.mazo.numFichas - a.noSe / a.mazo.numFichas)
      .slice(0, 10);

    const ultimos = rows
      .filter((r) => r.repasadoEl)
      .sort((a, b) => (b.repasadoEl! > a.repasadoEl! ? 1 : -1))
      .slice(0, 5);

    return {
      totalFichas,
      sabidas,
      noSe,
      repasados,
      enCurso,
      porMateria: [...porMateria.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
      ),
      conDudas,
      ultimos,
    };
  }, [stats]);

  if (!mazos.length) return null;

  return (
    <section className="mt-6 space-y-6 rounded-2xl bg-[#f8fafc] p-3 sm:p-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Fichas</h2>
        <p className="text-sm text-slate-500">
          Mazos repasados, fichas que te sabes y dónde dudas más. Lo que tienes a medias y
          los «no sé» se guardan en este dispositivo.
        </p>
      </div>

      {stats === null ? (
        <p className="text-sm text-slate-500">Cargando fichas…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              title="Mazos repasados"
              value={`${resumen.repasados} / ${mazos.length}`}
              sub={`${pct(resumen.repasados, mazos.length)}%`}
            />
            <Kpi
              title="Fichas que te sabes"
              value={`${resumen.sabidas} / ${resumen.totalFichas}`}
              sub={`${pct(resumen.sabidas, resumen.totalFichas)}%`}
            />
            <Kpi
              title="Mazos a medias"
              value={String(resumen.enCurso)}
              sub={resumen.enCurso ? "sin terminar" : "ninguno"}
            />
            <Kpi
              title="«No sé» pulsados"
              value={String(resumen.noSe)}
              sub={
                resumen.sabidas + resumen.noSe > 0
                  ? `${pct(resumen.noSe, resumen.sabidas + resumen.noSe)}% de dudas`
                  : "—"
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-1 text-lg font-semibold text-slate-800">Avance por materia</h3>
              <p className="mb-4 text-sm text-slate-500">Mazos repasados sobre el total</p>
              <ul className="space-y-3">
                {resumen.porMateria.map((m) => {
                  const p = pct(m.repasados, m.mazos);
                  return (
                    <li key={m.nombre} className="text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-700">{m.nombre}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {m.repasados}/{m.mazos} mazos · {m.sabidas}/{m.fichas} fichas
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${barColor(p)}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="mb-1 text-lg font-semibold text-slate-800">
                  Mazos donde más dudas
                </h3>
                <p className="mb-3 text-sm text-slate-500">
                  «No sé» por ficha del mazo · clic para repasarlo
                </p>
                {resumen.conDudas.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Aún no has marcado ningún «no sé» en este dispositivo.
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {resumen.conDudas.map((r, i) => (
                      <li
                        key={r.mazo.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-5 shrink-0 tabular-nums text-slate-400">
                            {i + 1}
                          </span>
                          <Link
                            href={`/fichas/${r.mazo.id}`}
                            className="truncate font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-[var(--primary)] hover:decoration-current"
                          >
                            {r.mazo.nombre}
                          </Link>
                        </span>
                        <span className="shrink-0 tabular-nums text-red-600">
                          {r.noSe} de {r.mazo.numFichas}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-lg font-semibold text-slate-800">
                  Últimos mazos repasados
                </h3>
                {resumen.ultimos.length === 0 ? (
                  <p className="text-sm text-slate-500">Todavía no has terminado ningún mazo.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {resumen.ultimos.map((r) => (
                      <li
                        key={r.mazo.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <Link
                          href={`/fichas/${r.mazo.id}`}
                          className="truncate font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-[var(--primary)] hover:decoration-current"
                        >
                          {r.mazo.nombre}
                        </Link>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {formatDia(r.repasadoEl!)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
