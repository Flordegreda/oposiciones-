"use client";

import { AdminFichasApply } from "@/components/admin/AdminFichasApply";

export function AdminFichasSetup() {
  return (
    <div className="card card-warning">
      <h2>Fichas (Anki)</h2>
      <p className="muted small">
        Activa las tablas <code>mazos_fichas</code> y <code>fichas</code> para importar
        pregunta/respuesta propias (sin depender de los tests). Gestiona los mazos en la
        pestaña <strong>Importar fichas</strong>.
      </p>
      <AdminFichasApply label="Activar fichas" busyLabel="Aplicando…" />
    </div>
  );
}
