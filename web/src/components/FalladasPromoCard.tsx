"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDispositivoId } from "@/lib/dispositivo-id";

type Counts = { total: number; falladas: number; dudosas: number };

/** Tarjeta en Tests: cuántas hay pendientes de repasar. */
export function FalladasPromoCard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const dispositivoId = getDispositivoId();
    void fetch(`/api/repaso/falladas?dispositivoId=${encodeURIComponent(dispositivoId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        setReady(data.ready !== false);
        setCounts(data.counts ?? { total: 0, falladas: 0, dudosas: 0 });
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  if (!ready) {
    return (
      <div className="card" style={{ marginBottom: "1rem" }}>
        <p className="muted small" style={{ margin: 0 }}>
          Para guardar falladas entre sesiones, actívalo en{" "}
          <Link href="/admin">Material</Link> (tarjeta <strong>Cola de falladas</strong>).
        </p>
      </div>
    );
  }

  if (!counts || counts.total === 0) return null;

  return (
    <div className="card card-elevated" style={{ marginBottom: "1rem" }}>
      <p style={{ margin: 0 }}>
        <strong>Repaso:</strong> tienes {counts.total} pregunta
        {counts.total !== 1 ? "s" : ""} pendiente
        {counts.total !== 1 ? "s" : ""} (falladas/dudosas).
      </p>
      <Link href="/repaso" className="btn-primary btn-sm" style={{ marginTop: "0.75rem" }}>
        Repasar falladas
      </Link>
    </div>
  );
}
