"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  analyzeImportText,
  cleanPdfImportText,
  type ParsedQuestion,
  parseImportText,
} from "@/lib/parse-import-text";

type Materia = { id: string; nombre: string; bancos?: number };
type Ctx = {
  tipo: "teorico" | "practico";
  materiaId: string;
};

type Props = {
  materias: Materia[];
  schemaOk?: boolean;
};

const EXTRACT_PROMPT_TEMPLATE = `Convierte estas preguntas de test al formato EXACTO que indico abajo. Devuelve SOLO el texto del banco, sin introducción, sin comentarios, sin markdown, sin títulos.

REGLAS OBLIGATORIAS:
- Extrae TODAS las preguntas del archivo, sin omitir ninguna.
- Cada pregunta empieza con número y punto en línea propia: 1. 2. 3. etc.
- El enunciado va en la MISMA línea que el número.
- Las 4 opciones van cada una en su línea con formato exacto: A) texto, B) texto, C) texto, D) texto.
- La respuesta correcta va en línea aparte: Respuesta: B
- Si hay explicación, después: E: texto
- Deja UNA línea en blanco entre pregunta y pregunta.
- NO escribas frases tipo: "Aquí tienes...", "formato solicitado...", etc.
- NO uses viñetas, asteriscos, negritas ni formatos distintos.
- NO mezcles varias preguntas en un solo bloque.

Control final antes de responder:
- Numeración correlativa sin saltos.
- Todas las preguntas con A) B) C) D) y Respuesta: X.
- Si una pregunta está incompleta, marcar: E: INCOMPLETA EN ORIGINAL.`;

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
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [batchSize, setBatchSize] = useState(100);
  const previewCount = useMemo(
    () => (texto.trim() ? parseImportText(texto).length : 0),
    [texto],
  );
  const parsedQuestions = useMemo(() => parseImportText(texto), [texto]);
  const analysis = useMemo(() => analyzeImportText(texto), [texto]);

  function limpiarTextoPdf() {
    if (!texto.trim()) return;
    setTexto(cleanPdfImportText(texto));
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(EXTRACT_PROMPT_TEMPLATE);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      setErr("No se pudo copiar el prompt automáticamente.");
    }
  }

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

  async function guardarEnLotes() {
    if (parsedQuestions.length === 0) return;
    const size = Math.max(1, batchSize);
    const chunks: ParsedQuestion[][] = [];

    for (let i = 0; i < parsedQuestions.length; i += size) {
      chunks.push(parsedQuestions.slice(i, i + size));
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    let created = 0;
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkName = (nombre?.trim() || "Banco").trim();
        const suffix = ` · Parte ${i + 1}/${chunks.length}`;

        const res = await fetch("/api/admin/import-parsed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...ctx,
            nombre: `${chunkName}${suffix}`,
            preguntas: chunk,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error en importación por lotes");
        created++;
      }

      setTexto("");
      setMsg(
        `Importación por lotes completada: ${created} bancos creados (${parsedQuestions.length} preguntas).`,
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error en importación por lotes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card cafe-card">
        <h2>Cargar material</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Copia el test desde un PDF y pégalo en texto plano. Tú pegas, la web guarda el banco.
        </p>
      </div>

      <div className="card">
        <h2>Extracción guiada desde PDF</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Usa este prompt en tu extractor IA para convertir lotes de PDF al formato que
          entiende el importador, luego pega aquí el resultado y guarda en uno o varios bancos.
        </p>
        <div className="form-actions" style={{ marginTop: "0.35rem" }}>
          <button type="button" className="btn-secondary" onClick={copiarPrompt}>
            {copiedPrompt ? "Prompt copiado" : "Copiar prompt estricto"}
          </button>
        </div>
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
            <code>P:</code> en una línea nueva. Si pegas desde PDF, revisa que
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
            placeholder="Pega aquí el bloque copiado del PDF…"
          />
        </label>
        <div className="form-actions" style={{ marginTop: "0.4rem" }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={!texto.trim()}
            onClick={limpiarTextoPdf}
          >
            Limpiar formato PDF automáticamente
          </button>
        </div>
        {texto.trim() && (
          <>
            <p className={previewCount > 0 ? "ok" : "error"} style={{ marginTop: "0.5rem" }}>
              {previewCount > 0
                ? `${previewCount} pregunta${previewCount !== 1 ? "s" : ""} detectada${previewCount !== 1 ? "s" : ""} en el texto`
                : "No se detectan preguntas válidas — revisa el formato (Respuesta: B o R: B)"}
            </p>
            <p className="muted small" style={{ marginTop: "0.35rem" }}>
              Bloques detectados: {analysis.estimatedBlocks} · Sin respuesta: {analysis.blocksWithoutAnswer} · Sin opciones: {analysis.blocksWithoutOptions}
            </p>
            {analysis.warnings.length > 0 && (
              <div className="card card-warning" style={{ marginTop: "0.6rem" }}>
                <p className="muted small" style={{ marginTop: 0, marginBottom: "0.45rem" }}>
                  Revisa estos posibles problemas antes de guardar:
                </p>
                {analysis.warnings.map((w) => (
                  <p key={w} className="error small" style={{ margin: "0.2rem 0" }}>
                    {w}
                  </p>
                ))}
              </div>
            )}
          </>
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

        {previewCount > 0 && (
          <div className="form-grid-fields carga-campos" style={{ marginTop: "0.7rem" }}>
            <label>
              Tamaño por banco (lotes)
              <input
                type="number"
                min={10}
                max={500}
                step={10}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value) || 100)}
              />
            </label>
            <label>
              Bancos estimados
              <input
                value={String(Math.ceil(previewCount / Math.max(1, batchSize)))}
                readOnly
              />
            </label>
            <div className="form-actions" style={{ marginTop: "1.6rem" }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || previewCount === 0 || !schemaOk || !materias.length}
                onClick={() => void guardarEnLotes()}
              >
                {busy
                  ? "Guardando lotes…"
                  : `Guardar en lotes (${Math.ceil(previewCount / Math.max(1, batchSize))} bancos)`}
              </button>
            </div>
          </div>
        )}
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
