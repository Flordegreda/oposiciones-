"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { countParsedQuestions, parseImportForContext } from "@/lib/parse-import-text";

type Materia = { id: string; nombre: string; bancos?: number };
type Ctx = {
  tipo: "teorico" | "practico";
  materiaId: string;
};

type Props = {
  materias: Materia[];
  schemaOk?: boolean;
  supuestosOk?: boolean;
};

const SUPUESTO_MARKER_RE = /^={3}\s*SUPUESTO/im;

function previewSnippet(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).trim()}…`;
}

export function AdminCocinar({ materias: initial, schemaOk = true, supuestosOk = true }: Props) {
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
  const [supuestoEncadenado, setSupuestoEncadenado] = useState(false);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (SUPUESTO_MARKER_RE.test(texto)) {
      setSupuestoEncadenado(true);
      setCtx((c) => (c.tipo === "practico" ? c : { ...c, tipo: "practico" }));
    }
  }, [texto]);

  const preview = useMemo(
    () =>
      texto.trim()
        ? parseImportForContext(texto, { encadenado: supuestoEncadenado })
        : { sueltas: [], supuestos: [] },
    [texto, supuestoEncadenado],
  );
  const previewCount = useMemo(() => countParsedQuestions(preview), [preview]);
  const supuesto = preview.supuestos[0];
  const encadenadoSinSupuesto =
    supuestoEncadenado && texto.trim() && previewCount > 0 && preview.supuestos.length === 0;
  const puedeGuardar =
    !busy &&
    schemaOk &&
    supuestosOk &&
    materias.length > 0 &&
    texto.trim() &&
    previewCount > 0 &&
    !encadenadoSinSupuesto;

  async function guardarBanco() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/import-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ctx,
        nombre: nombre.trim() || supuesto?.titulo,
        texto,
        encadenado: supuestoEncadenado,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error");
    setTexto("");
    setSupuestoEncadenado(false);
    setMsg(
      `Banco creado: ${data.banco.nombre} (${data.num} preguntas` +
        (data.supuestos ? `, ${data.supuestos} supuesto${data.supuestos !== 1 ? "s" : ""}` : "") +
        ")",
    );
    router.refresh();
  }

  return (
    <>
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
        <h2 className="admin-section-title">Pegar test en texto plano</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Pega el bloque generado por tu IA y la web lo guarda como banco. En supuestos
          encadenados pega el bloque completo tal cual (desde{" "}
          <code>=== SUPUESTO:</code> hasta la última pregunta).
        </p>
        <div className="cafe-highlight" style={{ marginTop: "0.75rem" }}>
          <strong>Supuesto encadenado (formato de tu prompt):</strong>
          <pre className="format-ejemplo">{`=== SUPUESTO: Título breve del caso
Texto del supuesto de hecho en prosa,
con fechas, sujetos y plazos entrelazados.
===

1. ¿Qué procede respecto de…?
A) …
B) …
C) …
D) …
Respuesta: B
E: Art. 52 LEF: …

2. Respecto del plazo indicado…
A) …
B) …
C) …
D) …
Respuesta: D
E: Art. 29 LEF: …`}</pre>
          <p className="muted small" style={{ marginTop: "0.5rem" }}>
            La primera línea debe ser <code>=== SUPUESTO: título</code>, el cierre{" "}
            <code>===</code> en línea sola, y luego las preguntas <code>1.</code>{" "}
            <code>2.</code>… con <code>Respuesta:</code> y <code>E:</code> opcional.
            Requiere la tarjeta amarilla «Activar supuestos» arriba en esta página de
            administración (solo la primera vez).
          </p>
        </div>

        {!supuestosOk && (
          <div className="card card-warning" style={{ marginTop: "0.75rem" }}>
            <p className="muted small" style={{ margin: 0 }}>
              Para importar supuestos encadenados, sube arriba en esta página y pulsa{" "}
              <strong>Activar supuestos</strong> en la tarjeta amarilla.
            </p>
          </div>
        )}

        <div className="form-grid-fields carga-campos">
          <label>
            Tipo
            <select
              value={ctx.tipo}
              onChange={(e) => {
                const tipo = e.target.value as Ctx["tipo"];
                setCtx((c) => ({ ...c, tipo }));
                if (tipo !== "practico") setSupuestoEncadenado(false);
              }}
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

        {ctx.tipo === "practico" && (
          <label className="checkbox-row" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={supuestoEncadenado}
              onChange={(e) => setSupuestoEncadenado(e.target.checked)}
              style={{ marginTop: "0.2rem" }}
            />
            <span>
              <strong>Supuesto encadenado</strong>
              <span className="muted small" style={{ display: "block", marginTop: "0.25rem" }}>
                Un caso compartido (<code>=== SUPUESTO ===</code>) con varias preguntas
                prácticas vinculadas. Marca esto antes de pegar el bloque de tu prompt JEX.
              </span>
            </span>
          </label>
        )}

        <label>
          Nombre del banco (opcional)
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={supuesto?.titulo ?? "EBEP bloque 1"}
          />
        </label>

        <label>
          {supuestoEncadenado ? "Texto del supuesto encadenado" : "Texto del test"}
          <textarea
            className="textarea-taller"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={14}
            placeholder={
              supuestoEncadenado
                ? "Pega aquí el bloque completo desde === SUPUESTO: … hasta la última pregunta…"
                : "Pega aquí el bloque del test…"
            }
          />
        </label>

        {texto.trim() && (
          <>
            <p
              className={
                previewCount > 0 && !encadenadoSinSupuesto ? "ok" : "error"
              }
              style={{ marginTop: "0.5rem" }}
            >
              {previewCount > 0
                ? `${previewCount} pregunta${previewCount !== 1 ? "s" : ""} detectada${previewCount !== 1 ? "s" : ""}` +
                  (supuesto
                    ? ` · supuesto vinculado${supuesto.titulo ? `: «${supuesto.titulo}»` : ""}`
                    : supuestoEncadenado
                      ? " · falta el bloque === SUPUESTO ==="
                      : "")
                : "No se detectan preguntas válidas — revisa el formato (Respuesta: B)"}
            </p>
            {supuesto && (
              <div className="card" style={{ marginTop: "0.75rem", padding: "0.75rem 1rem" }}>
                <p className="small" style={{ margin: 0 }}>
                  <strong>Enunciado detectado</strong>
                  {supuesto.titulo ? ` — ${supuesto.titulo}` : ""}
                </p>
                <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
                  {previewSnippet(supuesto.texto)}
                </p>
              </div>
            )}
            {encadenadoSinSupuesto && (
              <p className="error small" style={{ marginTop: "0.5rem" }}>
                Has marcado supuesto encadenado pero no se detecta{" "}
                <code>=== SUPUESTO: título</code> … <code>===</code>. Revisa que la
                primera línea sea exactamente ese formato y que el cierre{" "}
                <code>===</code> esté solo en su línea, antes de la pregunta 1.
              </p>
            )}
          </>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!puedeGuardar}
            onClick={() => void guardarBanco()}
          >
            {busy ? "Guardando…" : `Guardar banco (${previewCount || 0})`}
          </button>
        </div>
      </div>

      <p className="muted small">
        ¿Nueva materia? Ve a la pestaña <strong>Contenido</strong> para crearla.
      </p>
    </>
  );
}
