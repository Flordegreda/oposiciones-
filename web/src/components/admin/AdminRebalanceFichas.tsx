"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchErrorMessage, fetchJsonWithRetry } from "@/lib/fetch-json";
import { FICHAS_MAX_POR_MAZO } from "@/lib/split-fichas-mazo";
import type { RebalanceFichasPreview } from "@/lib/rebalance-fichas";

type Materia = { id: string; nombre: string };

type Props = {
  materias: Materia[];
};

export function AdminRebalanceFichas({ materias }: Props) {
  const router = useRouter();
  const [targetSize, setTargetSize] = useState(FICHAS_MAX_POR_MAZO);
  const [materiaId, setMateriaId] = useState("");
  const [preview, setPreview] = useState<RebalanceFichasPreview | null>(null);
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
      const { res, data, text } = await fetchJsonWithRetry<{ error?: string }>(
        `/api/admin/fichas/rebalance?${qs}`,
      );
      if (!res.ok) {
        throw new Error(fetchErrorMessage(res, data, text, "Error al previsualizar"));
      }
      if (!data) throw new Error("Respuesta vacía del servidor");
      setPreview(data as RebalanceFichasPreview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function aplicar() {
    if (
      !preview ||
      preview.partir === 0 ||
      !confirm(
        `¿Dividir mazos de fichas en tandas de ~${targetSize}?\n\n` +
          `Antes: ${preview.mazosAntes} mazos\n` +
          `Después: ${preview.mazosDespues} mazos\n` +
          `A partir: ${preview.partir}\n\n` +
          `Haz copia de seguridad antes.`,
      )
    ) {
      return;
    }

    setBusy("apply");
    setErr(null);
    setMsg(null);
    try {
      const { res, data, text } = await fetchJsonWithRetry<{
        error?: string;
        message?: string;
      }>("/api/admin/fichas/rebalance/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSize,
          materiaId: materiaId || null,
        }),
      });
      if (!res.ok) {
        throw new Error(fetchErrorMessage(res, data, text, "Error al aplicar"));
      }
      setMsg(data?.message || "Listo");
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
        Reequilibrar mazos (~{targetSize} fichas)
      </h2>
      <p className="muted small">
        Parte mazos grandes en tandas de {targetSize} fichas, igual que los tests. No mezcla
        mazos de temas distintos. <strong>Haz copia de seguridad antes.</strong> Si hay
        muchos, elige <strong>una materia</strong>.
      </p>

      <div className="admin-rebalance-fields">
        <label>
          Objetivo (fichas por mazo)
          <input
            type="number"
            min={20}
            max={120}
            value={targetSize}
            onChange={(e) => setTargetSize(Number(e.target.value) || FICHAS_MAX_POR_MAZO)}
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
        {preview && preview.partir > 0 && (
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
            <strong>{preview.mazosAntes}</strong> mazos → <strong>{preview.mazosDespues}</strong>{" "}
            · Partir: {preview.partir} · Sin cambios: {preview.sinCambios}
          </p>
          {preview.materias.map((m) => (
            <details key={m.materiaId} className="admin-rebalance-materia">
              <summary>
                {m.materiaNombre}: {m.mazosAntes} → {m.mazosDespues} mazos
              </summary>
              <ul>
                {m.cambios.map((c, i) => (
                  <li key={i}>
                    Partir «{c.origen}» → {c.destino.join(", ")} ({c.sizes.join(" + ")} fichas)
                  </li>
                ))}
              </ul>
            </details>
          ))}
          {preview.partir === 0 && (
            <p className="ok">No hay mazos de más de {preview.targetSize} fichas.</p>
          )}
        </div>
      )}

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
