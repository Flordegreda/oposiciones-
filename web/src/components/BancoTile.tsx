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
  const numAciertos =
    numFallos === null ? null : Math.max(0, numPreguntas - numFallos);

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
        {numPreguntas > 0 && numAciertos !== null && (
          <span className="banco-progress">
            <span className="banco-progress-icon">
              {numAciertos === 0 ? "⚪" : numAciertos / numPreguntas >= 0.8 ? "🟢" : numAciertos / numPreguntas >= 0.6 ? "🟡" : numAciertos / numPreguntas >= 0.4 ? "🟠" : "🔴"}
            </span>
            <span className="banco-progress-text">
              {numAciertos}/{numPreguntas} ·{" "}
              {Math.round((numAciertos / numPreguntas) * 100)}%
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
