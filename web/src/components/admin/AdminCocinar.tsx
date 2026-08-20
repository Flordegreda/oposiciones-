"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  countParsedQuestions,
  getImportDiagnostics,
  parseImportForContext,
} from "@/lib/parse-import-text";
import { PROMPT_SUPUESTO_ENCADENADO_JEX, PROMPT_TEST_TEORICO_JEX } from "@/lib/import-prompts";

type Materia = { id: string; nombre: string; bancos?: number };
type Ctx = {
  tipo: "teorico" | "practico";
  materiaId: string;
};

type Props = {
  materias: Materia[];
  schemaOk?: boolean;
  supuestosOk?: boolean;
  targetBanco?: {
    id: string;
    nombre: string;
    materiaId: string;
    tipo: "teorico" | "practico";
  };
};

function previewSnippet(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).trim()}…`;
}

export function AdminCocinar({
  materias: initial,
  schemaOk = true,
  supuestosOk = true,
  targetBanco,
}: Props) {
  const router = useRouter();
  const [materias, setMaterias] = useState(initial);
  const [ctx, setCtx] = useState<Ctx>({
    tipo: targetBanco?.tipo ?? "teorico",
    materiaId: targetBanco?.materiaId ?? initial[0]?.id ?? "",
  });
  const [nombre, setNombre] = useState(targetBanco?.nombre ?? "");
  const [esperadas, setEsperadas] = useState("");
  const [importMode, setImportMode] = useState<"append" | "overwrite" | "create">(
    targetBanco ? "append" : "create",
  );
  const [supuestoPractico, setSupuestoPractico] = useState(false);
  const [textoCaso, setTextoCaso] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptCopiado, setPromptCopiado] = useState(false);
  const [promptSupuestoCopiado, setPromptSupuestoCopiado] = useState(false);

  useEffect(() => {
    setMaterias(initial);
    if (initial.length && !initial.some((m) => m.id === ctx.materiaId)) {
      setCtx((c) => ({ ...c, materiaId: initial[0]?.id ?? "" }));
    }
  }, [initial, ctx.materiaId]);

  useEffect(() => {
    if (!targetBanco) return;
    setNombre(targetBanco.nombre);
    setCtx({
      tipo: targetBanco.tipo,
      materiaId: targetBanco.materiaId,
    });
    setImportMode("append");
  }, [targetBanco]);

  const importCtx = useMemo(
    () => ({
      encadenado: supuestoPractico,
      nombre: nombre.trim() || undefined,
      supuestoTexto: supuestoPractico ? textoCaso : undefined,
    }),
    [supuestoPractico, nombre, textoCaso],
  );

  const preview = useMemo(
    () =>
      texto.trim()
        ? parseImportForContext(texto, importCtx)
        : { sueltas: [], supuestos: [] },
    [texto, importCtx],
  );
  const previewCount = useMemo(() => countParsedQuestions(preview), [preview]);
  const diagnostics = useMemo(
    () => (texto.trim() ? getImportDiagnostics(texto, importCtx) : null),
    [texto, importCtx],
  );
  const rechazadas = diagnostics?.rechazadas ?? [];
  const numeradas = diagnostics?.numeradas ?? 0;
  const esperadasNum = esperadas.trim() ? parseInt(esperadas, 10) : null;
  const cuentaEsperadasMal =
    esperadasNum !== null && !Number.isNaN(esperadasNum) && previewCount !== esperadasNum;
  const supuesto = preview.supuestos[0];
  const faltaTextoCaso =
    supuestoPractico && texto.trim() && previewCount > 0 && !textoCaso.trim();
  const puedeGuardar =
    !busy &&
    schemaOk &&
    supuestosOk &&
    materias.length > 0 &&
    texto.trim() &&
    previewCount > 0 &&
    !cuentaEsperadasMal &&
    !faltaTextoCaso &&
    (!supuestoPractico || !!textoCaso.trim());

  async function guardarBanco() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/import-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ctx,
        nombre: nombre.trim() || undefined,
        bancoId: targetBanco?.id,
        texto,
        textoCaso: supuestoPractico ? textoCaso : undefined,
        encadenado: supuestoPractico,
        mode: importMode,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error");
    setTexto("");
    setTextoCaso("");
    setSupuestoPractico(false);
    const actionLabel =
      data.action === "appended"
        ? "actualizado"
        : data.action === "overwritten"
          ? "reemplazado"
          : "creado";
    setMsg(
      (data.note ? `${data.note} ` : "") +
        `Banco ${actionLabel}: ${data.banco.nombre} (${data.num} preguntas` +
        (data.supuestos ? `, ${data.supuestos} supuesto${data.supuestos !== 1 ? "s" : ""}` : "") +
        "). Ya visible en Practicar.",
    );
    router.refresh();
  }

  async function copiarPromptSupuesto() {
    try {
      await navigator.clipboard.writeText(PROMPT_SUPUESTO_ENCADENADO_JEX);
      setPromptSupuestoCopiado(true);
      setTimeout(() => setPromptSupuestoCopiado(false), 2500);
    } catch {
      setErr("No se pudo copiar el prompt al portapapeles");
    }
  }

  async function copiarPromptTeorico() {
    try {
      await navigator.clipboard.writeText(PROMPT_TEST_TEORICO_JEX);
      setPromptCopiado(true);
      setTimeout(() => setPromptCopiado(false), 2500);
    } catch {
      setErr("No se pudo copiar el prompt al portapapeles");
    }
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

      {targetBanco && (
        <div className="info-box sim-info">
          <p style={{ margin: 0 }}>
            Añadiendo preguntas al banco <strong>{targetBanco.nombre}</strong>. Las nuevas
            preguntas se guardarán en ese banco (modo añadir).
          </p>
        </div>
      )}

      <div className="card card-elevated">
        <h2 className="admin-section-title">Pegar test en texto plano</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Pega el bloque generado por tu IA. En supuestos prácticos usa{" "}
          <strong>dos cajas</strong>: caso y preguntas por separado.
        </p>

        {ctx.tipo === "teorico" && !supuestoPractico && (
          <div className="info-box sim-info" style={{ marginTop: "0.75rem" }}>
            <p style={{ margin: 0 }}>
              <strong>Prompt para IA (teórico):</strong> copia el prompt compatible con este
              importador, pégalo en ChatGPT/Claude y añade tu temario al final.
            </p>
            <button
              type="button"
              className="btn-secondary btn-sm"
              style={{ marginTop: "0.65rem" }}
              onClick={() => void copiarPromptTeorico()}
            >
              {promptCopiado ? "Copiado" : "Copiar prompt teórico JEX"}
            </button>
          </div>
        )}

        {supuestoPractico && (
          <div className="info-box sim-info" style={{ marginTop: "0.75rem" }}>
            <p style={{ margin: 0 }}>
              <strong>Prompt supuesto encadenado:</strong> cópialo, pégalo en ChatGPT/Claude
              y añade el artículo o norma al final. Luego reparte la salida en las dos cajas.
            </p>
            <button
              type="button"
              className="btn-secondary btn-sm"
              style={{ marginTop: "0.65rem" }}
              onClick={() => void copiarPromptSupuesto()}
            >
              {promptSupuestoCopiado ? "Copiado" : "Copiar prompt supuesto encadenado"}
            </button>
          </div>
        )}

        {supuestoPractico && (
          <div className="cafe-highlight" style={{ marginTop: "0.75rem" }}>
            <strong>Supuesto práctico — dos cajas:</strong>
            <pre className="format-ejemplo">{`CAJA 1 — Texto del caso:
El 30 de abril de 2026 expira el mandato…

CAJA 2 — Preguntas (desde 1.):
1. ¿Qué procede respecto de…?
A) …
B) …
C) …
D) …
Respuesta: B
E: Art. 17.1 LOTC: …`}</pre>
            <p className="muted small" style={{ marginTop: "0.5rem" }}>
              El título del caso va en <strong>Nombre del banco</strong>. Requiere «Activar
              supuestos» (tarjeta amarilla) la primera vez.
            </p>
          </div>
        )}

        {!supuestosOk && supuestoPractico && (
          <div className="card card-warning" style={{ marginTop: "0.75rem" }}>
            <p className="muted small" style={{ margin: 0 }}>
              Para supuestos prácticos, pulsa <strong>Activar supuestos</strong> en la tarjeta
              amarilla arriba.
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
                if (tipo !== "practico") setSupuestoPractico(false);
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
              checked={supuestoPractico}
              onChange={(e) => setSupuestoPractico(e.target.checked)}
              style={{ marginTop: "0.2rem" }}
            />
            <span>
              <strong>Supuesto práctico</strong>
              <span className="muted small" style={{ display: "block", marginTop: "0.25rem" }}>
                Caso compartido + preguntas en dos cajas. Sin marcadores ===.
              </span>
            </span>
          </label>
        )}

        <label>
          Nombre del banco {supuestoPractico && "(título del caso)"}
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={supuestoPractico ? "Renovación del TC" : "EBEP bloque 1"}
          />
        </label>

        <label>
          Si el banco ya existe (mismo nombre y materia)
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as "append" | "overwrite" | "create")}
          >
            <option value="create">Crear un banco nuevo</option>
            <option value="append">Añadir preguntas al banco existente (mismo nombre)</option>
            <option value="overwrite">Reemplazar todas las preguntas del banco</option>
          </select>
          <span className="muted small" style={{ display: "block", marginTop: "0.35rem" }}>
            Si es material nuevo, deja en <strong>Crear un banco nuevo</strong>. «Añadir» solo
            funciona si ya existe un banco con el mismo nombre en la materia.
          </span>
        </label>

        <label>
          Preguntas esperadas (opcional)
          <input
            type="number"
            min={1}
            value={esperadas}
            onChange={(e) => setEsperadas(e.target.value)}
            placeholder="17"
          />
        </label>

        {supuestoPractico && (
          <label>
            Texto del caso
            <textarea
              className="textarea-taller"
              value={textoCaso}
              onChange={(e) => setTextoCaso(e.target.value)}
              rows={6}
              placeholder="Pega aquí el supuesto de hecho en prosa (fechas, sujetos, plazos)…"
            />
          </label>
        )}

        <label>
          {supuestoPractico ? "Preguntas del supuesto" : "Texto del test"}
          <textarea
            className="textarea-taller"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={supuestoPractico ? 12 : 14}
            placeholder={
              supuestoPractico
                ? "Pega aquí solo las preguntas numeradas (1. 2. 3.…) con A) B) C) D) y Respuesta:"
                : "Pega aquí el bloque del test…"
            }
          />
        </label>

        {texto.trim() && (
          <>
            <p
              className={previewCount > 0 && !faltaTextoCaso ? "ok" : "error"}
              style={{ marginTop: "0.5rem" }}
            >
              {previewCount > 0
                ? `${previewCount} pregunta${previewCount !== 1 ? "s" : ""} válida${previewCount !== 1 ? "s" : ""}` +
                  (numeradas > previewCount ? ` · ${numeradas} numeradas en el texto` : "") +
                  (rechazadas.length
                    ? ` · ${rechazadas.length} rechazada${rechazadas.length !== 1 ? "s" : ""}`
                    : "") +
                  (supuesto
                    ? ` · supuesto vinculado${supuesto.titulo ? `: «${supuesto.titulo}»` : ""}`
                    : supuestoPractico && textoCaso.trim()
                      ? " · supuesto vinculado"
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
            {rechazadas.length > 0 && (
              <div className="card card-warning" style={{ marginTop: "0.75rem", padding: "0.75rem 1rem" }}>
                <p className="small" style={{ margin: 0 }}>
                  <strong>
                    {rechazadas.length} pregunta{rechazadas.length !== 1 ? "s" : ""} con formato
                    incompleto
                  </strong>
                  {previewCount > 0 && " — puedes guardar las válidas."}
                </p>
                <ul className="muted small" style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
                  {rechazadas.map((r, idx) => (
                    <li key={`${r.numero ?? idx}-${r.enunciado.slice(0, 20)}`}>
                      {r.numero !== undefined ? (
                        <strong>Pregunta {r.numero}:</strong>
                      ) : (
                        <strong>Sin número:</strong>
                      )}{" "}
                      {r.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cuentaEsperadasMal && (
              <p className="error small" style={{ marginTop: "0.5rem" }}>
                Esperabas {esperadasNum} preguntas pero hay {previewCount} válidas.
              </p>
            )}
            {faltaTextoCaso && (
              <p className="error small" style={{ marginTop: "0.5rem" }}>
                Faltan las preguntas o el texto del caso en su caja correspondiente.
              </p>
            )}
            {supuestoPractico && !textoCaso.trim() && previewCount === 0 && (
              <p className="error small" style={{ marginTop: "0.5rem" }}>
                Pega el texto del caso en la primera caja y las preguntas en la segunda.
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
        ¿Nueva materia? Vuelve a Material y créala en la sección Materias.
      </p>
    </>
  );
}
