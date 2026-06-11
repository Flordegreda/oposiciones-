"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BancoRow, PreguntaRow } from "@/lib/queries/bancos";

type Materia = { id: string; nombre: string };

type Props = {
  banco: BancoRow;
  preguntas: PreguntaRow[];
  materias: Materia[];
};

export function AdminBancoEditor({ banco, preguntas: initial, materias }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(banco.nombre);
  const [tipo, setTipo] = useState(banco.tipo);
  const [materiaId, setMateriaId] = useState(banco.materia_id);
  const [preguntas, setPreguntas] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function guardarBanco() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/bancos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: banco.id, nombre, tipo, materia_id: materiaId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al guardar banco");
    setMsg("Banco guardado");
    router.refresh();
  }

  async function guardarPregunta(p: PreguntaRow) {
    setErr(null);
    const res = await fetch(`/api/admin/preguntas/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enunciado: p.enunciado,
        opciones: p.opciones,
        respuesta: p.respuesta,
        explicacion: p.explicacion,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error al guardar pregunta");
      return false;
    }
    return true;
  }

  async function eliminarPregunta(id: string) {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    const res = await fetch(`/api/admin/preguntas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json()).error || "No se pudo eliminar");
      return;
    }
    setPreguntas((list) => list.filter((p) => p.id !== id));
  }

  async function eliminarBanco() {
    if (!confirm(`¿Eliminar «${nombre}» y todas sus preguntas?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/bancos/${banco.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert((await res.json()).error || "No se pudo eliminar");
      return;
    }
    router.push("/admin?tab=bancos");
    router.refresh();
  }

  function updatePregunta(id: string, patch: Partial<PreguntaRow>) {
    setPreguntas((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  function updateOpcion(preguntaId: string, index: number, value: string) {
    setPreguntas((list) =>
      list.map((p) => {
        if (p.id !== preguntaId) return p;
        const opciones = [...p.opciones];
        opciones[index] = value;
        return { ...p, opciones };
      }),
    );
  }

  return (
    <>
      <div className="card">
        <div className="test-toolbar">
          <h2 style={{ margin: 0 }}>Editar banco</h2>
          <Link href="/admin?tab=bancos" className="btn-link">
            Volver a bancos
          </Link>
        </div>

        {msg && <p className="ok">{msg}</p>}
        {err && <p className="error">{err}</p>}

        <div className="form-grid-fields carga-campos">
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="teorico">Teórico</option>
              <option value="practico">Práctico</option>
            </select>
          </label>
          <label>
            Materia
            <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
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
            className="btn-primary"
            disabled={busy || !nombre.trim()}
            onClick={() => void guardarBanco()}
          >
            {busy ? "Guardando…" : "Guardar banco"}
          </button>
          <Link href={`/test/${banco.id}`} className="btn-secondary btn-sm">
            Probar test
          </Link>
          <button
            type="button"
            className="btn-danger btn-sm"
            disabled={busy}
            onClick={() => void eliminarBanco()}
          >
            Eliminar banco
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Preguntas ({preguntas.length})</h3>
        {preguntas.length === 0 ? (
          <p className="muted">Este banco no tiene preguntas.</p>
        ) : (
          <ul className="admin-pregunta-list">
            {preguntas.map((p, i) => (
              <li key={p.id} className="admin-pregunta-item">
                <p className="test-meta">Pregunta {i + 1}</p>
                <label>
                  Enunciado
                  <textarea
                    rows={3}
                    value={p.enunciado}
                    onChange={(e) =>
                      updatePregunta(p.id, { enunciado: e.target.value })
                    }
                  />
                </label>
                {p.opciones.map((opt, oi) => (
                  <label key={oi}>
                    Opción {String.fromCharCode(65 + oi)}
                    <input
                      value={opt}
                      onChange={(e) => updateOpcion(p.id, oi, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Respuesta correcta (0=A, 1=B…)
                  <input
                    type="number"
                    min={0}
                    max={Math.max(0, p.opciones.length - 1)}
                    value={p.respuesta}
                    onChange={(e) =>
                      updatePregunta(p.id, {
                        respuesta: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => void guardarPregunta(p)}
                  >
                    Guardar pregunta
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => void eliminarPregunta(p.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
