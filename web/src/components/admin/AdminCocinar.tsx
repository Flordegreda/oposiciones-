"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Materia = { id: string; nombre: string; bancos?: number };
type Ctx = {
  tipo: "teorico" | "practico";
  materiaId: string;
};

type Props = {
  materias: Materia[];
  schemaOk?: boolean;
};

export function AdminCocinar({ materias: initial, schemaOk = true }: Props) {
  const router = useRouter();
  const [materias, setMaterias] = useState(initial);
  const [ctx, setCtx] = useState<Ctx>({
    tipo: "teorico",
    materiaId: initial[0]?.id ?? "",
  });
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [nuevaMateria, setNuevaMateria] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardarBanco() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/import-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ctx, nombre, texto }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error");
    setTexto("");
    setMsg(`Banco creado: ${data.banco.nombre} (${data.num} preguntas)`);
    router.refresh();
  }

  async function addMateria(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaMateria }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error);
    setMaterias((m) =>
      [...m, { ...data, bancos: 0 }].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    setCtx((c) => ({ ...c, materiaId: data.id }));
    setNuevaMateria("");
    setMsg("Materia creada");
  }

  return (
    <>
      <div className="card cafe-card">
        <h2>Cargar material</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Copia el test desde un PDF y pégalo en texto plano. Tú pegas, la web guarda el banco.
        </p>
      </div>

      {!schemaOk && (
        <div className="card card-warning">
          <p className="muted small">
            Primero configura la base de datos (tarjeta amarilla arriba) antes de guardar
            bancos.
          </p>
        </div>
      )}

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <div className="card card-elevated">
        <h2>Pegar test (PDF → texto)</h2>
        <div className="cafe-highlight" style={{ marginTop: "0.75rem" }}>
          <strong>Formato:</strong>
          <pre className="format-ejemplo">{`1. ¿Enunciado?
A) …
B) …
C) …
D) …
Respuesta: B`}</pre>
        </div>

        <div className="form-grid-fields carga-campos">
          <label>
            Tipo
            <select
              value={ctx.tipo}
              onChange={(e) =>
                setCtx((c) => ({ ...c, tipo: e.target.value as Ctx["tipo"] }))
              }
            >
              <option value="teorico">Teórico</option>
              <option value="practico">Práctico</option>
            </select>
          </label>
          <label>
            Materia
            <select
              value={ctx.materiaId}
              onChange={(e) => setCtx((c) => ({ ...c, materiaId: e.target.value }))}
            >
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Nombre del banco (opcional)
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="EBEP bloque 1"
          />
        </label>
        <label>
          Texto del test
          <textarea
            className="textarea-taller"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={14}
            placeholder="Pega aquí el bloque copiado del PDF…"
          />
        </label>
        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !schemaOk || !materias.length || !texto.trim()}
            onClick={() => void guardarBanco()}
          >
            {busy ? "Guardando…" : "Guardar banco"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Materias</h2>
        <form className="form" onSubmit={addMateria}>
          <label>
            Nueva materia
            <input
              value={nuevaMateria}
              onChange={(e) => setNuevaMateria(e.target.value)}
              placeholder="EBEP"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary btn-sm" disabled={busy}>
              Añadir materia
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
