"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RebalancePreview } from "@/lib/rebalance-bancos";

type Materia = { id: string; nombre: string };

type Props = {
  materias: Materia[];
};

export function AdminRebalanceBancos({ materias }: Props) {
  const router = useRouter();
  const [targetSize, setTargetSize] = useState(50);
  const [materiaId, setMateriaId] = useState("");
  const [preview, setPreview] = useState<RebalancePreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function cargarPreview() {
    setBusy("preview");
    setErr(null);
    setMsg(null);
    setPreview(null);
    try {
      const qs = new URLSearchParams({ targetSize: String(targetSize) });
      if (materiaId) qs.set("materiaId", materiaId);
      const res = await fetch(`/api/admin/bancos/rebalance?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al previsualizar");
      setPreview(data as RebalancePreview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function aplicar() {
    if (
      !preview ||
      (!preview.partir && !preview.fusionar) ||
      !confirm(
        `¿Reequilibrar bancos?\n\n` +
          `Antes: ${preview.bancosAntes} bancos\n` +
          `Después: ${preview.bancosDespues} bancos\n\n` +
          `Partidos: ${preview.partir} · Fusionados: ${preview.fusionar}\n\n` +
          `Haz copia de seguridad antes. Los bancos originales partidos/fusionados se borrarán.`,
      )
    ) {
      return;
    }

    setBusy("apply");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/bancos/rebalance/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSize,
          materiaId: materiaId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al aplicar");
      setMsg(data.message || "Listo");
      setPreview(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card admin-rebalance">
      <h2 className="admin-section-title" style={{ marginTop: 0 }}>
        Reequilibrar bancos (~{targetSize} preguntas)
      </h2>
      <p className="muted small">
        Parte bancos muy grandes y fusiona los muy pequeños dentro de cada materia. Los de
        tamaño medio se dejan igual. <strong>Haz copia de seguridad antes.</strong>
      </p>

      <div className="admin-rebalance-fields">
        <label>
          Objetivo (preguntas por banco)
          <input
            type="number"
            min={20}
            max={120}
            value={targetSize}
            onChange={(e) => setTargetSize(Number(e.target.value) || 50)}
          />
        </label>
        <label>
          Materia
          <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            <option value="">Todas las materias</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={!!busy}
          onClick={() => void cargarPreview()}
        >
          {busy === "preview" ? "Calculando…" : "Previsualizar"}
        </button>
        {preview && (preview.partir > 0 || preview.fusionar > 0) && (
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!!busy}
            onClick={() => void aplicar()}
          >
            {busy === "apply" ? "Aplicando…" : "Aplicar cambios"}
          </button>
        )}
      </div>

      {preview && (
        <div className="admin-rebalance-preview muted small">
          <p>
            <strong>{preview.bancosAntes}</strong> bancos → <strong>{preview.bancosDespues}</strong>{" "}
            · Partir: {preview.partir} · Fusionar: {preview.fusionar} · Sin cambios:{" "}
            {preview.sinCambios}
          </p>
          <p>
            Rango sin tocar: {preview.minSize}–{preview.maxSize} preguntas
          </p>
          {preview.materias.map((m) => (
            <details key={m.materiaId} className="admin-rebalance-materia">
              <summary>
                {m.materiaNombre}: {m.bancosAntes} → {m.bancosDespues} bancos
              </summary>
              <ul>
                {m.cambios.map((c, i) => (
                  <li key={i}>
                    {c.accion === "partir" ? "Partir" : "Fusionar"}: {c.origen.join(" + ")} →{" "}
                    {c.destino.join(", ")} ({c.preguntas} preg.)
                  </li>
                ))}
              </ul>
            </details>
          ))}
          {!preview.partir && !preview.fusionar && (
            <p className="ok">No hace falta cambiar nada con este objetivo.</p>
          )}
        </div>
      )}

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
