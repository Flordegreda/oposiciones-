"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { MaterialStats, MateriaStatsRow } from "@/lib/queries/bancos";

type Props = {
  stats: MaterialStats;
  schemaOk: boolean;
  hideStats?: boolean;
};

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminMaterialStats({ stats }: { stats: MaterialStats }) {
  return (
    <section className="admin-overview card card-elevated" aria-label="Resumen del temario">
      <div className="admin-overview-main">
        <p className="admin-overview-label">Total de preguntas</p>
        <p className="admin-overview-total">{stats.preguntas.toLocaleString("es-ES")}</p>
        <p className="muted small admin-overview-meta">
          {stats.materias} materias · {stats.bancos} bancos
        </p>
      </div>
      <div className="admin-overview-types">
        <div className="admin-overview-type admin-overview-type--teorico">
          <span className="admin-overview-type-label">Teórico</span>
          <span className="admin-overview-type-value">
            {stats.teorico.preguntas.toLocaleString("es-ES")}
          </span>
          <span className="muted small">{stats.teorico.bancos} bancos</span>
        </div>
        <div className="admin-overview-type admin-overview-type--practico">
          <span className="admin-overview-type-label">Práctico</span>
          <span className="admin-overview-type-value">
            {stats.practico.preguntas.toLocaleString("es-ES")}
          </span>
          <span className="muted small">{stats.practico.bancos} bancos</span>
        </div>
      </div>
    </section>
  );
}

export function AdminMaterias({ stats: initial, schemaOk, hideStats }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<MateriaStatsRow[]>(initial.porMateria);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [nuevaMateria, setNuevaMateria] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(initial.porMateria);
  }, [initial.porMateria]);

  async function addMateria(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaMateria.trim()) return;
    setBusy("add");
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaMateria }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setErr(data.error || "Error al crear");
    setNuevaMateria("");
    setMsg(`Materia «${data.nombre}» creada`);
    router.refresh();
  }

  function startEdit(row: MateriaStatsRow) {
    setEditingId(row.id);
    setEditName(row.nombre);
    setErr(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setBusy(id);
    setErr(null);
    const res = await fetch(`/api/admin/materias?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editName }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setErr(data.error || "Error al guardar");
    setEditingId(null);
    setMsg("Materia actualizada");
    router.refresh();
  }

  async function eliminar(row: MateriaStatsRow) {
    const aviso =
      row.bancos > 0
        ? `¿Eliminar «${row.nombre}»?\n\nSe borrarán ${row.bancos} banco(s) y ${row.preguntas} pregunta(s).`
        : `¿Eliminar la materia «${row.nombre}»?`;
    if (!confirm(aviso)) return;

    setBusy(row.id);
    setErr(null);
    const res = await fetch(`/api/admin/materias?id=${row.id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setErr(data.error || "Error al eliminar");
    setMsg(
      row.bancos > 0
        ? `Materia eliminada (${data.bancosEliminados ?? row.bancos} banco(s))`
        : "Materia eliminada",
    );
    router.refresh();
  }

  async function exportar(row: MateriaStatsRow) {
    setBusy(`export-${row.id}`);
    try {
      const res = await fetch(`/api/admin/materias?id=${row.id}&export=1`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al exportar");
      }
      const backup = await res.json();
      const slug = row.nombre.replace(/[^\w\-]+/g, "-").slice(0, 40);
      downloadJson(backup, `materia-${slug}.json`);
      setMsg(`Copia de «${row.nombre}» descargada`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {!hideStats && <AdminMaterialStats stats={initial} />}

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <div className="card card-elevated">
        <h2>Materias</h2>
        <p className="muted small">
          Edita nombres, revisa totales por tipo y exporta o elimina categorías.
        </p>

        {rows.length === 0 ? (
          <p className="muted">No hay materias. Crea la primera abajo.</p>
        ) : (
          <div className="admin-materias-table-wrap">
            <div className="admin-materias-table" role="table">
              <div className="admin-materias-head" role="row">
                <span role="columnheader">Materia</span>
                <span role="columnheader">Bancos</span>
                <span role="columnheader">Preguntas</span>
                <span role="columnheader">Teórico</span>
                <span role="columnheader">Práctico</span>
                <span role="columnheader">Acciones</span>
              </div>
              {rows.map((row) => {
                const editing = editingId === row.id;
                return (
                  <div key={row.id} className="admin-materias-row" role="row">
                    <span className="admin-materias-nombre" role="cell">
                      {editing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        row.nombre
                      )}
                    </span>
                    <span role="cell">{row.bancos}</span>
                    <span role="cell" className="ok">
                      <strong>{row.preguntas}</strong>
                    </span>
                    <span role="cell" className="muted small">
                      {row.teorico.preguntas}
                      <span className="admin-materias-sub"> ({row.teorico.bancos})</span>
                    </span>
                    <span role="cell" className="muted small">
                      {row.practico.preguntas}
                      <span className="admin-materias-sub"> ({row.practico.bancos})</span>
                    </span>
                    <span className="admin-materias-actions" role="cell">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={busy === row.id || !editName.trim()}
                            onClick={() => void saveEdit(row.id)}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn-link btn-sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-link btn-sm"
                            disabled={busy !== null || row.preguntas === 0}
                            onClick={() => startEdit(row)}
                          >
                            Editar
                          </button>
                          {row.preguntas > 0 && (
                            <TestPrintButton
                              materiaId={row.id}
                              title={row.nombre}
                              label="PDF"
                              disabled={busy !== null}
                            />
                          )}
                          <button
                            type="button"
                            className="btn-link btn-sm"
                            disabled={busy !== null}
                            onClick={() => void exportar(row)}
                          >
                            {busy === `export-${row.id}` ? "…" : "Exportar"}
                          </button>
                          <button
                            type="button"
                            className="btn-danger btn-sm"
                            disabled={busy !== null}
                            onClick={() => void eliminar(row)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="muted small admin-materias-footnote">
              Teórico / Práctico: preguntas (bancos). Eliminar una materia borra todos sus bancos.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Nueva materia</h2>
        <form className="form" onSubmit={addMateria}>
          <label>
            Nombre
            <input
              value={nuevaMateria}
              onChange={(e) => setNuevaMateria(e.target.value)}
              placeholder="EBEP, LRJSP, etc."
              disabled={!schemaOk || busy === "add"}
            />
          </label>
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={!schemaOk || busy === "add" || !nuevaMateria.trim()}
            >
              {busy === "add" ? "Creando…" : "Añadir materia"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
