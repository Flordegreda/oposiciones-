"use client";

import Link from "next/link";

export function PrintTemarioToolbar() {
  return (
    <div className="print-toolbar no-print">
      <button type="button" className="print-toolbar-btn" onClick={() => window.print()}>
        Imprimir / guardar PDF
      </button>
      <Link href="/temario" className="print-toolbar-link">
        ← Volver al plan
      </Link>
    </div>
  );
}
