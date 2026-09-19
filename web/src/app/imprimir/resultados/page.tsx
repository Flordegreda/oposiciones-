import { Suspense } from "react";
import { ResultadosPrintView } from "@/components/stats/ResultadosPrintView";

export const dynamic = "force-dynamic";

export default function PrintResultadosPage() {
  return (
    <Suspense fallback={<p className="print-sheet-meta">Cargando informe…</p>}>
      <ResultadosPrintView />
    </Suspense>
  );
}
