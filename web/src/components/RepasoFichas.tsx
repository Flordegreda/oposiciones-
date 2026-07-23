"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getDispositivoId } from "@/lib/dispositivo-id";
import type { FichaCard } from "@/lib/queries/fichas";
import { AnkiDeck } from "@/components/AnkiDeck";

export function RepasoFichas() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [total, setTotal] = useState(0);
  const [fichas, setFichas] = useState<FichaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [studying, setStudying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const dispositivoId = getDispositivoId();
      const res = await fetch(
        `/api/repaso/fichas?dispositivoId=${encodeURIComponent(dispositivoId)}&fichas=1`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar");
      setReady(data.ready !== false);
      setTotal(data.total ?? 0);
      setFichas(Array.isArray(data.fichas) ? data.fichas : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (studying && fichas.length) {
    return (
      <AnkiDeck
        fichas={fichas}
        repasoMode
        exitHref="/fichas"
        onQueueEmpty={() => {
          setStudying(false);
          void load();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Cargando fichas «No sé»…</p>
      </div>
    );
  }

  if (ready === false) {
    return (
      <div className="card card-warning">
        <h2>Cola de fichas</h2>
        <p className="muted">
          Actívala en <Link href="/admin">Material</Link> (tarjeta{" "}
          <strong>Cola de falladas</strong> — también crea la cola de fichas).
        </p>
        {err && <p className="error">{err}</p>}
      </div>
    );
  }

  if (!total) {
    return (
      <div className="card">
        <h2>Sin fichas pendientes</h2>
        <p className="muted">
          Al estudiar un mazo, pulsa <strong>No sé</strong> tras ver la respuesta. Esas fichas
          se guardan en la cola de repaso de este navegador.
        </p>
        <Link href="/fichas" className="btn-primary">
          Ir a mazos
        </Link>
      </div>
    );
  }

  return (
    <div className="card card-elevated">
      <h2>Fichas que no sabías</h2>
      <p className="muted">
        {total} ficha{total !== 1 ? "s" : ""} en cola. Si marcas <strong>Sé</strong>, salen;
        si marcas <strong>No sé</strong>, se quedan.
      </p>
      {err && <p className="error">{err}</p>}
      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={() => setStudying(true)}>
          Repasar ({fichas.length})
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
        <Link href="/fichas" className="btn-link btn-sm">
          Mazos
        </Link>
      </div>
    </div>
  );
}
