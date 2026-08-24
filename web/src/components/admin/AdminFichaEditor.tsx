"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FichaCard, MazoFichas } from "@/lib/queries/fichas";

type Materia = { id: string; nombre: string };

type Props = {
  mazo: MazoFichas;
  fichas: FichaCard[];
  materias: Materia[];
};

function previewText(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function fichaSnapshot(f: FichaCard): string {
  return JSON.stringify({ frente: f.frente, dorso: f.dorso });
}

type AutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function AdminFichaEditor({ mazo, fichas: initial, materias }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(mazo.nombre);
  const [materiaId, setMateriaId] = useState(mazo.materiaId);
  const [active, setActive] = useState(mazo.active);
  const [fichas, setFichas] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const savedRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const map = new Map<string, string>();
    for (const f of initial) map.set(f.id, fichaSnapshot(f));
    savedRef.current = map;
    setFichas(initial);
    setNombre(mazo.nombre);
    setMateriaId(mazo.materiaId);
    setActive(mazo.active);
  }, [initial, mazo]);

  const persistFicha = useCallback(async (f: FichaCard, silent = false) => {
    if (!silent) setErr(null);
    const res = await fetch(`/api/admin/ficha/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frente: f.frente, dorso: f.dorso }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (!silent) setErr(data.error || "Error al guardar ficha");
      return false;
    }
    savedRef.current.set(f.id, fichaSnapshot(f));
    return true;
  }, []);

  const dirtyIds = useMemo(
    () =>
      fichas
        .filter((f) => savedRef.current.get(f.id) !== fichaSnapshot(f))
        .map((f) => f.id),
    [fichas],
  );

  useEffect(() => {
    if (!dirtyIds.length) {
      setAutosave((s) => (s === "saved" ? s : "idle"));
      return;
    }
    setAutosave("pending");
    const timer = window.setTimeout(() => {
      void (async () => {
        setAutosave("saving");
        let ok = true;
        for (const id of dirtyIds) {
          const f = fichas.find((x) => x.id === id);
          if (!f) continue;
          const saved = await persistFicha(f, true);
          if (!saved) ok = false;
        }
        setAutosave(ok ? "saved" : "error");
        if (ok) router.refresh();
      })();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [fichas, dirtyIds, persistFicha, router]);

  function updateFicha(id: string, patch: Partial<Pick<FichaCard, "frente" | "dorso">>) {
    setFichas((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function isExpanded(id: string) {
    return allExpanded || expandedId === id;
  }

  function toggleFicha(id: string) {
    if (allExpanded) {
      setAllExpanded(false);
      setExpandedId(expandedId === id ? null : id);
      return;
    }
    setExpandedId(expandedId === id ? null : id);
  }

  async function guardarMazo() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/admin/fichas/${mazo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, materiaId, active }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al guardar mazo");
    setMsg("Mazo actualizado");
    router.refresh();
  }

  async function eliminarFicha(id: string) {
    const f = fichas.find((x) => x.id === id);
    if (!f) return;
    if (!confirm(`¿Eliminar esta ficha?\n\n${previewText(f.frente, 120)}`)) return;

    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/ficha/${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Error al eliminar");
    setFichas((list) => list.filter((x) => x.id !== id));
    savedRef.current.delete(id);
    setMsg("Ficha eliminada");
    router.refresh();
  }

  async function eliminarMazo() {
    if (
      !confirm(
        `¿Eliminar el mazo «${mazo.nombre}» y sus ${fichas.length} fichas?\n\nNo se puede deshacer.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/fichas/${mazo.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      return setErr(data.error || "Error al eliminar mazo");
    }
    router.push("/admin?tab=fichas");
    router.refresh();
  }

  return (
    <>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <div className="card card-elevated">
        <h2 className="admin-section-title">Mazo</h2>
        <div className="form-grid-fields carga-campos">
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={busy} />
          </label>
          <label>
            Materia
            <select
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              disabled={busy}
            >
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="sim-toggle" style={{ alignSelf: "end" }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={busy}
            />
            <span>Visible en Fichas</span>
          </label>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busy}
            onClick={() => void guardarMazo()}
          >
            Guardar mazo
          </button>
          <Link href={`/fichas/${mazo.id}`} className="btn-secondary btn-sm">
            Practicar
          </Link>
          <Link href={`/admin?tab=fichas&mazoId=${mazo.id}`} className="btn-secondary btn-sm">
            Añadir fichas
          </Link>
          <button
            type="button"
            className="btn-danger btn-sm"
            disabled={busy}
            onClick={() => void eliminarMazo()}
          >
            Eliminar mazo
          </button>
        </div>
      </div>

      <div className="card admin-preguntas-card">
        <div className="admin-preguntas-sticky">
          <div className="admin-preguntas-header">
            <h3 className="admin-preguntas-title">
              Fichas
              <span className="admin-preguntas-count">{fichas.length}</span>
            </h3>
            {fichas.length > 0 && (
              <div className="admin-preguntas-toolbar">
                {autosave !== "idle" && (
                  <span className={`autosave-badge autosave-${autosave}`} aria-live="polite">
                    {autosave === "pending" && "Cambios sin guardar…"}
                    {autosave === "saving" && "Guardando…"}
                    {autosave === "saved" && "Guardado"}
                    {autosave === "error" && "Error al guardar"}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setAllExpanded((v) => !v);
                    setExpandedId(null);
                  }}
                >
                  {allExpanded ? "Contraer" : "Expandir todo"}
                </button>
              </div>
            )}
          </div>
        </div>

        {fichas.length === 0 ? (
          <p className="muted">Este mazo no tiene fichas. Importa desde Material → Importar fichas.</p>
        ) : (
          <ul className="admin-pregunta-list">
            {fichas.map((f, i) => {
              const expanded = isExpanded(f.id);
              return (
                <li
                  key={f.id}
                  className={`admin-pregunta-item ${expanded ? "admin-pregunta-expanded" : "admin-pregunta-collapsed"}`}
                >
                  <button
                    type="button"
                    className="admin-pregunta-toggle"
                    onClick={() => toggleFicha(f.id)}
                    aria-expanded={expanded}
                  >
                    <span className="admin-pregunta-num">{i + 1}</span>
                    <span className="admin-pregunta-preview">
                      {previewText(f.frente) || <em className="muted">Sin frente</em>}
                    </span>
                    <span className="admin-pregunta-chevron" aria-hidden>
                      {expanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="admin-pregunta-edit form">
                      <label className="admin-field-enunciado">
                        Frente (pregunta)
                        <textarea
                          className="textarea-taller admin-enunciado"
                          rows={3}
                          value={f.frente}
                          onChange={(e) => updateFicha(f.id, { frente: e.target.value })}
                        />
                      </label>
                      <label className="admin-field-enunciado">
                        Dorso (respuesta)
                        <textarea
                          className="textarea-taller admin-enunciado"
                          rows={4}
                          value={f.dorso}
                          onChange={(e) => updateFicha(f.id, { dorso: e.target.value })}
                        />
                      </label>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          disabled={busy}
                          onClick={() => void eliminarFicha(f.id)}
                        >
                          Eliminar ficha
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
