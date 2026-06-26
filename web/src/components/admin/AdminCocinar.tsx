"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseImportText } from "@/lib/parse-import-text";

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

  useEffect(() => {
    setMaterias(initial);
    if (initial.length && !initial.some((m) => m.id === ctx.materiaId)) {
      setCtx((c) => ({ ...c, materiaId: initial[0]?.id ?? "" }));
    }
  }, [initial, ctx.materiaId]);
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewCount = useMemo(
    () => (texto.trim() ? parseImportText(texto).length : 0),
    [texto],
  );

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

  return (
    <>
      <div className="card cafe-card">
        <h2>Cargar material</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Pega el test en texto plano. Tú pegas, la web guarda el banco.
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
        <h2>Pegar test (texto plano)</h2>
        <div className="cafe-highlight" style={{ marginTop: "0.75rem" }}>
          <strong>Formatos aceptados:</strong>
          <pre className="format-ejemplo">{`1. ¿Enunciado?
A) …
B) …
C) …
D) …
Respuesta: B

— o —

P: ¿Enunciado?
A) …
B) …
R: B`}</pre>
          <p className="muted small" style={{ marginTop: "0.5rem" }}>
            Cada pregunta debe empezar con <code>1.</code>, <code>2.</code> o{" "}
            <code>P:</code> en una línea nueva. Si pegas desde otro formato, revisa que
            los números no se hayan pegado en la misma línea.
          </p>
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
                  {m.bancos !== undefined ? ` (${m.bancos} bancos)` : ""}
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
            placeholder="Pega aquí el bloque del test…"
          />
        </label>
        {texto.trim() && (
          <p className={previewCount > 0 ? "ok" : "error"} style={{ marginTop: "0.5rem" }}>
            {previewCount > 0
              ? `${previewCount} pregunta${previewCount !== 1 ? "s" : ""} detectada${previewCount !== 1 ? "s" : ""} en el texto`
              : "No se detectan preguntas válidas — revisa el formato (Respuesta: B o R: B)"}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={
              busy || !schemaOk || !materias.length || !texto.trim() || previewCount === 0
            }
            onClick={() => void guardarBanco()}
          >
            {busy ? "Guardando…" : `Guardar banco (${previewCount || 0})`}
          </button>
        </div>
      </div>

      <div className="card">
        <p className="muted small" style={{ margin: 0 }}>
          ¿Nueva materia? Ve a la pestaña <strong>Materias</strong> para crear, renombrar o ver
          totales por categoría.
        </p>
      </div>
    </>
  );
}
