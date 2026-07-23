"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDispositivoId } from "@/lib/dispositivo-id";

export function FichasNoSePromo() {
  const [total, setTotal] = useState<number | null>(null);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const dispositivoId = getDispositivoId();
    void fetch(`/api/repaso/fichas?dispositivoId=${encodeURIComponent(dispositivoId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        setReady(data.ready !== false);
        setTotal(typeof data.total === "number" ? data.total : 0);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  if (!ready || total === null || total === 0) return null;

  return (
    <div className="card card-elevated" style={{ marginBottom: "1rem" }}>
      <p style={{ margin: 0 }}>
        <strong>No sé:</strong> tienes {total} ficha{total !== 1 ? "s" : ""} pendiente
        {total !== 1 ? "s" : ""} de repasar.
      </p>
      <Link href="/fichas/repaso" className="btn-primary btn-sm" style={{ marginTop: "0.75rem" }}>
        Repasar fichas
      </Link>
    </div>
  );
}
