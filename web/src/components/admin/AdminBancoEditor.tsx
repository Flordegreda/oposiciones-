"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BancoRow, PreguntaRow } from "@/lib/queries/bancos";
import { isEncadenadoBankName } from "@/lib/encadenado-utils";
import {
  answerDistribution,
  formatAnswerDistribution,
  isAnswerDistributionSkewed,
} from "@/lib/exam-utils";
import { TestPrintButton } from "@/components/TestPrintButton";

type Materia = { id: string; nombre: string };

type Props = {
  banco: BancoRow;
  preguntas: PreguntaRow[];
  materias: Materia[];
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function previewText(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function questionSnapshot(p: PreguntaRow): string {
  return JSON.stringify({
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    explicacion: p.explicacion ?? "",
  });
}

type AutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function AdminBancoEditor({ banco, preguntas: initial, materias }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(banco.nombre);
  const [tipo, setTipo] = useState(banco.tipo);
  const [materiaId, setMateriaId] = useState(banco.materia_id);
  const [preguntas, setPreguntas] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [supuestoTitulo, setSupuestoTitulo] = useState(
    () => preguntas.find((p) => p.supuesto_titulo)?.supuesto_titulo ?? banco.nombre,
  );
  const [supuestoTexto, setSupuestoTexto] = useState(
    () => preguntas.find((p) => p.supuesto_texto)?.supuesto_texto ?? "",
  );
  const [supuestoBusy, setSupuestoBusy] = useState(false);
  const [shuffleBusy, setShuffleBusy] = useState(false);
  const savedRef = useRef<Map<string, string>>(new Map());
  const tieneSupuesto = preguntas.some((p) => p.supuesto_id || p.supuesto_texto);

  const answerStats = useMemo(() => {
    const counts = answerDistribution(preguntas);
    const total = preguntas.length;
    return {
      counts,
      total,
      label: formatAnswerDistribution(counts, total),
      skewed: isAnswerDistributionSkewed(counts, total),
    };
  }, [preguntas]);

  async function barajarOpcionesBanco() {
    if (
      !confirm(
        "¿Barajar las opciones de TODAS las preguntas?\n\nSe reordenan A/B/C/D al azar y se actualiza la respuesta correcta. Útil si casi siempre cae en la misma letra.",
      )
    ) {
      return;
    }
    setShuffleBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/bancos/${banco.id}/shuffle-options`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al barajar");
      setMsg(`Opciones barajadas en ${data.updated ?? preguntas.length} preguntas`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al barajar");
    } finally {
      setShuffleBusy(false);
    }
  }
  const muestraSupuesto =
    banco.tipo === "practico" ||
    isEncadenadoBankName(banco.nombre) ||
    tieneSupuesto;

  useEffect(() => {
    const map = new Map<string, string>();
    for (const p of initial) map.set(p.id, questionSnapshot(p));
    savedRef.current = map;
    setSupuestoTitulo(initial.find((p) => p.supuesto_titulo)?.supuesto_titulo ?? banco.nombre);
    setSupuestoTexto(initial.find((p) => p.supuesto_texto)?.supuesto_texto ?? "");
  }, [initial, banco.nombre]);

  const persistPregunta = useCallback(async (p: PreguntaRow, silent = false) => {
    if (!silent) setErr(null);
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
      if (!silent) setErr(data.error || "Error al guardar pregunta");
      return false;
    }
    savedRef.current.set(p.id, questionSnapshot(p));
    return true;
  }, []);

  const dirtyIds = useCallback(
    () => preguntas.filter((p) => savedRef.current.get(p.id) !== questionSnapshot(p)).map((p) => p.id),
    [preguntas],
  );

  useEffect(() => {
    const ids = dirtyIds();
    if (!ids.length) {
      setAutosave((s) => (s === "saved" ? s : "idle"));
      return;
    }

    setAutosave("pending");
    const timer = window.setTimeout(() => {
      void (async () => {
        setAutosave("saving");
        let failed = false;
        for (const id of ids) {
          const p = preguntas.find((x) => x.id === id);
          if (!p) continue;
          const ok = await persistPregunta(p, true);
          if (!ok) failed = true;
        }
        setAutosave(failed ? "error" : "saved");
        if (!failed) {
          window.setTimeout(() => {
            setAutosave(dirtyIds().length ? "pending" : "idle");
          }, 2000);
        }
      })();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [preguntas, dirtyIds, persistPregunta]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyIds().length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [preguntas, dirtyIds]);

  async function guardarSupuesto() {
    if (!supuestoTexto.trim()) {
      setErr("Escribe el enunciado del supuesto (texto del caso compartido).");
      return;
    }
    setSupuestoBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/admin/bancos/${banco.id}/supuesto`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: supuestoTitulo, texto: supuestoTexto }),
    });
    const data = await res.json();
    setSupuestoBusy(false);
    if (!res.ok) return setErr(data.error || "Error al guardar supuesto");
    setMsg("Supuesto guardado — ya aparecerá al practicar e imprimir");
    router.refresh();
  }

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
    const ok = await persistPregunta(p);
    if (ok) setMsg("Pregunta guardada");
  }

  async function eliminarPregunta(id: string) {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    const res = await fetch(`/api/admin/preguntas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json()).error || "No se pudo eliminar");
      return;
    }
    setPreguntas((list) => list.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
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

  function toggleQuestion(id: string) {
    if (allExpanded) {
      setAllExpanded(false);
      setExpandedId(expandedId === id ? null : id);
      return;
    }
    setExpandedId(expandedId === id ? null : id);
  }

  function expandAll() {
    setAllExpanded(true);
    setExpandedId(null);
  }

  function collapseAll() {
    setAllExpanded(false);
    setExpandedId(null);
  }

  function isExpanded(id: string): boolean {
    return allExpanded || expandedId === id;
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

        <div className="form">
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
          <TestPrintButton
            title={nombre || banco.nombre}
            subtitle={`${preguntas.length} preguntas`}
            preguntas={preguntas.map((p) => ({
              enunciado: p.enunciado,
              opciones: p.opciones,
              respuesta: p.respuesta,
              explicacion: p.explicacion,
              supuestoId: p.supuesto_id,
              supuestoTitulo: p.supuesto_titulo ?? supuestoTitulo,
              supuestoTexto: p.supuesto_texto ?? supuestoTexto,
            }))}
          />
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

      {muestraSupuesto && (
        <div className="card admin-supuesto-card">
          <h3 className="admin-preguntas-title">Enunciado del supuesto (caso compartido)</h3>
          <p className="muted small">
            {tieneSupuesto
              ? "Este texto se muestra encima de las preguntas del supuesto y al imprimir el test."
              : "Este banco práctico no tiene enunciado guardado: no saldrá en el test ni al imprimir. Pégalo aquí y guarda — las preguntas se enlazarán automáticamente."}
          </p>
          <div className="form">
            <label>
              Título (opcional)
              <input
                value={supuestoTitulo}
                onChange={(e) => setSupuestoTitulo(e.target.value)}
              />
            </label>
            <label>
              Texto del caso
              <textarea
                rows={8}
                value={supuestoTexto}
                onChange={(e) => setSupuestoTexto(e.target.value)}
                placeholder="Pega aquí el enunciado del supuesto práctico…"
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={supuestoBusy || !supuestoTexto.trim()}
              onClick={() => void guardarSupuesto()}
            >
              {supuestoBusy ? "Guardando…" : "Guardar supuesto"}
            </button>
          </div>
        </div>
      )}

      <div className="card admin-preguntas-card">
        <div className="admin-preguntas-sticky">
          <div className="admin-preguntas-header">
            <h3 className="admin-preguntas-title">
              Preguntas
              <span className="admin-preguntas-count">{preguntas.length}</span>
            </h3>
            {preguntas.length > 0 && (
              <div className="admin-preguntas-toolbar">
                {answerStats.skewed && (
                  <span className="admin-answer-bias-warn" title={answerStats.label}>
                    Respuestas sesgadas
                  </span>
                )}
                <button
                  type="button"
                  className="btn-link btn-sm"
                  disabled={shuffleBusy || busy}
                  onClick={() => void barajarOpcionesBanco()}
                >
                  {shuffleBusy ? "Barajando…" : "Barajar opciones"}
                </button>
                <span className="admin-toolbar-sep" aria-hidden>
                  ·
                </span>
                {autosave !== "idle" && (
                  <span className={`autosave-badge autosave-${autosave}`} aria-live="polite">
                    {autosave === "pending" && "Cambios sin guardar…"}
                    {autosave === "saving" && "Guardando…"}
                    {autosave === "saved" && "Guardado"}
                    {autosave === "error" && "Error al guardar"}
                  </span>
                )}
                <button type="button" className="btn-link btn-sm" onClick={expandAll}>
                  Expandir todas
                </button>
                <span className="admin-toolbar-sep" aria-hidden>
                  ·
                </span>
                <button type="button" className="btn-link btn-sm" onClick={collapseAll}>
                  Colapsar todas
                </button>
              </div>
            )}
          </div>
        </div>

        {preguntas.length > 0 && (
          <p className="muted small admin-answer-stats">
            Distribución de respuestas correctas: {answerStats.label}. Al practicar, las
            opciones se barajan en cada intento; usa <strong>Barajar opciones</strong> para
            corregir el banco guardado (PDF e impresión).
          </p>
        )}

        {preguntas.length === 0 ? (
          <p className="muted">Este banco no tiene preguntas.</p>
        ) : (
          <ul className="admin-pregunta-list">
            {preguntas.map((p, i) => {
              const expanded = isExpanded(p.id);
              const correctLetter = LETTERS[p.respuesta] ?? "?";

              return (
                <li
                  key={p.id}
                  className={`admin-pregunta-item ${expanded ? "admin-pregunta-expanded" : "admin-pregunta-collapsed"}`}
                >
                  <button
                    type="button"
                    className="admin-pregunta-toggle"
                    onClick={() => toggleQuestion(p.id)}
                    aria-expanded={expanded}
                  >
                    <span className="admin-pregunta-num">{i + 1}</span>
                    <span className="admin-pregunta-preview">
                      {previewText(p.enunciado) || (
                        <em className="muted">Sin enunciado</em>
                      )}
                    </span>
                    {!expanded && (
                      <span className="admin-pregunta-badge" title="Respuesta correcta">
                        {correctLetter}
                      </span>
                    )}
                    <span className="admin-pregunta-chevron" aria-hidden>
                      {expanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="admin-pregunta-edit form">
                      <label className="admin-field-enunciado">
                        Enunciado
                        <textarea
                          className="textarea-taller admin-enunciado"
                          rows={5}
                          value={p.enunciado}
                          onChange={(e) =>
                            updatePregunta(p.id, { enunciado: e.target.value })
                          }
                        />
                      </label>

                      <fieldset className="admin-opciones-fieldset">
                        <legend>Opciones</legend>
                        <div className="admin-pregunta-opciones-grid">
                          {p.opciones.map((opt, oi) => (
                            <label key={oi} className="admin-opcion-label">
                              <span className="option-letter">{LETTERS[oi]}</span>
                              <input
                                value={opt}
                                onChange={(e) => updateOpcion(p.id, oi, e.target.value)}
                                placeholder={`Opción ${LETTERS[oi]}`}
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className="admin-respuesta-field">
                        <span className="admin-respuesta-label">Respuesta correcta</span>
                        <div className="admin-respuesta-picker" role="radiogroup">
                          {p.opciones.map((_, oi) => (
                            <button
                              key={oi}
                              type="button"
                              role="radio"
                              aria-checked={p.respuesta === oi}
                              className={`admin-respuesta-btn ${p.respuesta === oi ? "selected" : ""}`}
                              onClick={() => updatePregunta(p.id, { respuesta: oi })}
                            >
                              {LETTERS[oi]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {p.explicacion !== undefined && (
                        <label>
                          Explicación
                          <textarea
                            rows={2}
                            value={p.explicacion ?? ""}
                            onChange={(e) =>
                              updatePregunta(p.id, { explicacion: e.target.value })
                            }
                          />
                        </label>
                      )}

                      <div className="form-actions admin-pregunta-actions">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
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
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
