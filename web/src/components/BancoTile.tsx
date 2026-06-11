import Link from "next/link";
import type { BancoRow } from "@/lib/queries/bancos";

type Props = {
  banco: BancoRow;
};

export function BancoTile({ banco }: Props) {
  return (
    <Link href={`/test/${banco.id}`} className="banco-tile banco-tile--stacked">
      <span className="banco-tile-title">{banco.nombre}</span>
      <span className="banco-tile-meta">
        <span className={`tipo-pill ${banco.tipo}`}>{banco.tipo}</span>
        <span className="muted small">Practicar</span>
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
