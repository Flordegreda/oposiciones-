"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFalloIds } from "@/lib/test-progress";
import type { BancoRow } from "@/lib/queries/bancos";

type Props = {
  banco: BancoRow;
};

export function BancoTile({ banco }: Props) {
  const [numFallos, setNumFallos] = useState<number | null>(null);

  useEffect(() => {
    const numPreguntas = banco.numPreguntas ?? 0;
    if (numPreguntas === 0) return;

    setNumFallos(getFalloIds(banco.id).size);

    function handleUpdate() {
      setNumFallos(getFalloIds(banco.id).size);
    }

    window.addEventListener("opo-progress-changed", handleUpdate);
    return () => window.removeEventListener("opo-progress-changed", handleUpdate);
  }, [banco.id, banco.numPreguntas]);

  const numPreguntas = banco.numPreguntas ?? 0;

  return (
    <Link href={`/test/${banco.id}`} className="banco-tile">
      <div className="banco-tile-body">
        <span className="banco-tile-title">{banco.nombre}</span>
        <span className="banco-tile-meta">
          <span className={`tipo-pill ${banco.tipo}`}>{banco.tipo}</span>
          {numPreguntas > 0 && (
            <span className="banco-tile-count">{numPreguntas} preg.</span>
          )}
        </span>
        {numPreguntas > 0 && numFallos !== null && (
          <span className="banco-progress">
            <span className="banco-progress-icon">
              {numFallos === 0 ? "🟢" : numFallos <= Math.max(1, Math.round(numPreguntas * 0.1)) ? "🟡" : numFallos <= Math.max(2, Math.round(numPreguntas * 0.25)) ? "🟠" : "🔴"}
            </span>
            <span className="banco-progress-text">
              {numFallos} fallos pendientes
            </span>
          </span>
        )}
      </div>
      <span className="banco-tile-chevron" aria-hidden>
        ›
      </span>
    </Link>
  );
}
