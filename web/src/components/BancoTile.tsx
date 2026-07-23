"use client";

import Link from "next/link";
import type { BancoRow } from "@/lib/queries/bancos";

type Props = {
  banco: BancoRow;
};

export function BancoTile({ banco }: Props) {
  const numPreguntas = banco.numPreguntas ?? 0;

  return (
    <div className="banco-tile-card">
      <div className="banco-tile banco-tile--static">
        <div className="banco-tile-body">
          <span className="banco-tile-title">{banco.nombre}</span>
          <span className="banco-tile-meta">
            <span className={`tipo-pill ${banco.tipo}`}>{banco.tipo}</span>
            {numPreguntas > 0 && (
              <span className="banco-tile-count">{numPreguntas} preg.</span>
            )}
          </span>
        </div>
      </div>
      <div className="banco-tile-actions">
        <Link href={`/test/${banco.id}`} className="banco-tile-action">
          Test
        </Link>
      </div>
    </div>
  );
}
