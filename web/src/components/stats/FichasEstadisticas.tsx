"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Anillo } from "@/components/stats/Anillo";
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
    };
  }
  const pendientes = deck ? Math.min(deck.pendientes, mazo.numFichas) : mazo.numFichas;
  const sabidas = mazo.numFichas - pendientes;
  return {
    mazo,
    estado: sabidas > 0 || noSe > 0 ? "en-curso" : "sin-empezar",
    sabidas,
    noSe,
  };
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
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

  const r = useMemo(() => {
    const rows = stats ?? [];
    const totalFichas = rows.reduce((n, x) => n + x.mazo.numFichas, 0);
    const sabidas = rows.reduce((n, x) => n + x.sabidas, 0);
    const noSe = rows.reduce((n, x) => n + x.noSe, 0);
    const repasados = rows.filter((x) => x.estado === "repasado").length;
    const enCurso = rows.filter((x) => x.estado === "en-curso");
    const conDudas = rows
      .filter((x) => x.noSe > 0)
      .sort((a, b) => b.noSe / b.mazo.numFichas - a.noSe / a.mazo.numFichas)
      .slice(0, 4);
    const siguiente = enCurso[0] ?? rows.find((x) => x.estado === "sin-empezar");
    return { totalFichas, sabidas, noSe, repasados, enCurso: enCurso.length, conDudas, siguiente };
  }, [stats]);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">Fichas</h2>
        <Link href="/fichas" className="text-xs font-medium text-blue-700 hover:underline">
          Ir a fichas →
        </Link>
      </div>

      {!mazos.length ? (
        <p className="text-sm text-slate-500">Este bloque no tiene mazos de fichas.</p>
      ) : stats === null ? (
        <p className="text-sm text-slate-500">Cargando fichas…</p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Anillo pct={pct(r.sabidas, r.totalFichas)} color="#10b981" size={104}>
              <span className="text-xl font-bold tabular-nums text-slate-800">
                {pct(r.sabidas, r.totalFichas)}%
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-500">sabidas</span>
            </Anillo>
            <dl className="grid flex-1 grid-cols-1 gap-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Mazos repasados</dt>
                <dd className="font-semibold tabular-nums text-slate-800">
                  {r.repasados}/{mazos.length}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Fichas sabidas</dt>
                <dd className="font-semibold tabular-nums text-slate-800">
                  {r.sabidas}/{r.totalFichas}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">A medias</dt>
                <dd className="font-semibold tabular-nums text-slate-800">{r.enCurso}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">«No sé»</dt>
                <dd className={`font-semibold tabular-nums ${r.noSe ? "text-red-600" : "text-slate-800"}`}>
                  {r.noSe}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {r.conDudas.length ? "Donde más dudas" : "Siguiente mazo"}
            </p>
            {r.conDudas.length ? (
              <ul className="space-y-1.5">
                {r.conDudas.map((x) => (
                  <li key={x.mazo.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/fichas/${x.mazo.id}`}
                      className="truncate font-medium text-slate-800 hover:text-[var(--primary)]"
                    >
                      {x.mazo.nombre}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-red-600">
                      {x.noSe} de {x.mazo.numFichas}
                    </span>
                  </li>
                ))}
              </ul>
            ) : r.siguiente ? (
              <Link
                href={`/fichas/${r.siguiente.mazo.id}`}
                className="block truncate text-sm font-medium text-slate-800 hover:text-[var(--primary)]"
              >
                {r.siguiente.mazo.nombre} · {r.siguiente.mazo.numFichas} fichas
              </Link>
            ) : (
              <p className="text-sm text-emerald-700">Todos los mazos repasados.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
