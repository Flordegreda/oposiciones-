"use client";

import Link from "next/link";

type Props = {
  soloPendientes?: boolean;
  showToggle?: boolean;
};

export function PrintTemarioToolbar({ soloPendientes = true, showToggle = true }: Props) {
  return (
    <div className="print-toolbar no-print">
      <button type="button" className="print-toolbar-btn" onClick={() => window.print()}>
        Imprimir / guardar PDF
      </button>
      {showToggle && (
        <Link
          href={soloPendientes ? "/imprimir/temario?todo=1" : "/imprimir/temario"}
          className="print-toolbar-link"
        >
          {soloPendientes ? "Ver temario completo" : "Ver solo pendientes"}
        </Link>
      )}
      <Link href="/temario" className="print-toolbar-link">
        ← Volver al plan
      </Link>
    </div>
  );
}
