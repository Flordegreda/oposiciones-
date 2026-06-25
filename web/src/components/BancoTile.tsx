import Link from "next/link";
import type { BancoRow } from "@/lib/queries/bancos";

type Props = {
  banco: BancoRow;
};

export function BancoTile({ banco }: Props) {
  return (
    <Link href={`/test/${banco.id}`} className="banco-tile">
      <div className="banco-tile-body">
        <span className="banco-tile-title">{banco.nombre}</span>
        <span className="banco-tile-meta">
          <span className={`tipo-pill ${banco.tipo}`}>{banco.tipo}</span>
          {banco.numPreguntas !== undefined && banco.numPreguntas > 0 && (
            <span className="banco-tile-count">{banco.numPreguntas} preg.</span>
          )}
        </span>
      </div>
      <span className="banco-tile-chevron" aria-hidden>
        ›
      </span>
    </Link>
  );
}
