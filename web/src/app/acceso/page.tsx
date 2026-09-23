import { Suspense } from "react";
import { AccesoForm } from "./AccesoForm";

export default function AccesoPage() {
  return (
    <Suspense fallback={<p className="gate-lead">Cargando…</p>}>
      <AccesoForm />
    </Suspense>
  );
}
