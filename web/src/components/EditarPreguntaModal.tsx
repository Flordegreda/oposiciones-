"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { errorMessage } from "@/lib/error-message";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type PreguntaEditada = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion: string | null;
};

type Props = {
  preguntaId: string;
  /** Aviso cuando abrir el editor desvela la respuesta (modo examen). */
  avisoRespuesta?: boolean;
  onClose: () => void;
  onSaved: (p: PreguntaEditada) => void;
};

export function EditarPreguntaModal({ preguntaId, avisoRespuesta, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PreguntaEditada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/preguntas/${encodeURIComponent(preguntaId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se ha podido cargar la pregunta");
        if (cancelled) return;
        setForm({
          enunciado: String(data.enunciado ?? ""),
          opciones: Array.isArray(data.opciones) ? data.opciones.map(String) : [],
          respuesta: typeof data.respuesta === "number" ? data.respuesta : 0,
          explicacion: data.explicacion ?? null,
        });
      } catch (e) {
        if (!cancelled) setError(errorMessage(e, "No se ha podido cargar la pregunta"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preguntaId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function guardar() {
    if (!form) return;
    const enunciado = form.enunciado.trim();
    const opciones = form.opciones.map((o) => o.trim());
    if (!enunciado) return setError("El enunciado no puede quedar vacío.");
    if (opciones.some((o) => !o)) return setError("Ninguna opción puede quedar vacía.");

    setSaving(true);
    setError(null);
    try {
      const explicacion = form.explicacion?.trim() || null;
      const res = await fetch(`/api/admin/preguntas/${encodeURIComponent(preguntaId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enunciado, opciones, respuesta: form.respuesta, explicacion }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No se ha podido guardar");
      onSaved({ enunciado, opciones, respuesta: form.respuesta, explicacion });
    } catch (e) {
      setError(errorMessage(e, "No se ha podido guardar"));
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Editar pregunta"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Editar pregunta</h2>
        <p className="mb-4 text-sm text-slate-500">
          Los cambios se guardan en el banco y valen para todos los tests.
          {avisoRespuesta && " Aquí verás cuál es la respuesta correcta."}
        </p>

        {!form && !error && <p className="text-sm text-slate-500">Cargando pregunta…</p>}

        {form && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Enunciado</span>
              <textarea
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                rows={3}
                value={form.enunciado}
                onChange={(e) => setForm({ ...form, enunciado: e.target.value })}
              />
            </label>

            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">
                Opciones · marca la correcta
              </legend>
              <div className="space-y-2">
                {form.opciones.map((opt, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <label className="mt-2 flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600">
                      <input
                        type="radio"
                        name="respuesta-correcta"
                        checked={form.respuesta === i}
                        onChange={() => setForm({ ...form, respuesta: i })}
                      />
                      {LETTERS[i]}
                    </label>
                    <textarea
                      className={`w-full rounded-xl border p-2 text-sm focus:outline-none ${
                        form.respuesta === i
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-300 focus:border-[var(--primary)]"
                      }`}
                      rows={2}
                      value={opt}
                      onChange={(e) => {
                        const opciones = [...form.opciones];
                        opciones[i] = e.target.value;
                        setForm({ ...form, opciones });
                      }}
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Explicación (opcional)
              </span>
              <textarea
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                rows={3}
                value={form.explicacion ?? ""}
                onChange={(e) => setForm({ ...form, explicacion: e.target.value })}
              />
            </label>
          </div>
        )}

        {error && <p className="error mt-3">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary btn-sm" disabled={saving} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!form || saving}
            onClick={() => void guardar()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
