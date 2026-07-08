import { Suspense } from "react";
import PrintSessionClient from "./PrintSessionClient";

export default function PrintSessionPage() {
  return (
    <Suspense fallback={<p className="print-route-hint">Cargando test…</p>}>
      <PrintSessionClient />
    </Suspense>
  );
}
