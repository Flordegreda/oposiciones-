"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MateriaFilter } from "@/components/MateriaFilter";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { BancoRow, MaterialStats } from "@/lib/queries/bancos";
import { materiaNombre, sortBancosByNombre } from "@/lib/queries/bancos";

type Props = { bancos: BancoRow[]; stats: MaterialStats };

export function AdminBancos({ bancos: initial, stats }: Props) {
  const router = useRouter();
  const [bancos, setBancos] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [materiaId, setMateriaId] = useState<string | null>(null);

  useEffect(() => {
    setBancos(initial);
  }, [initial]);

  const materias = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bancos) {
      map.set(b.materia_id, materiaNombre(b.materias));
    }
    return [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  }, [bancos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = bancos;
    if (materiaId) list = list.filter((b) => b.materia_id === materiaId);
    if (q) {
      list = list.filter(
        (b) =>
          b.nombre.toLowerCase().includes(q) ||
          materiaNombre(b.materias).toLowerCase().includes(q),
      );
    }
    return sortBancosByNombre(list);
  }, [bancos, search, materiaId]);

  const filteredTotals = useMemo(() => {
    let preguntas = 0;
    let teorico = 0;
    let practico = 0;
    for (const b of filtered) {
      const n = b.numPreguntas ?? 0;
      preguntas += n;
      if (b.tipo === "practico") practico += n;
      else teorico += n;
    }
    return { bancos: filtered.length, preguntas, teorico, practico };
  }, [filtered]);

  const emptyBancos = useMemo(
    () => bancos.filter((b) => (b.numPreguntas ?? 0) === 0),
    [bancos],
  );
  const [cleaning, setCleaning] = useState(false);

  async function limpiarVacios() {
    if (
      !confirm(
        `¿Eliminar ${emptyBancos.length} banco(s) vacío(s)?\n\n${emptyBancos.map((b) => b.nombre).join("\n")}`,
      )
    ) {
      return;
    }
    setCleaning(true);
    const res = await fetch("/api/admin/bancos/cleanup-empty", { method: "POST" });
    const data = await res.json();
    setCleaning(false);
    if (!res.ok) {
      alert(data.error || "No se pudo limpiar");
      return;
    }
    setBancos((list) => list.filter((b) => (b.numPreguntas ?? 0) > 0));
    router.refresh();
    alert(`Eliminados ${data.deleted} banco(s) vacío(s).`);
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el banco «${nombre}» y todas sus preguntas?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/bancos/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      alert((await res.json()).error || "No se pudo eliminar");
      return;
    }
    setBancos((list) => list.filter((b) => b.id !== id));
    router.refresh();
  }

  return (
    <div className="card">
      <h2>Bancos</h2>
      <p className="muted small">Temario jurídicas JEX — Junta de Extremadura.</p>

      <label className="admin-filter">
        Buscar banco
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre, materia…"
        />
      </label>

      <MateriaFilter materias={materias} value={materiaId} onChange={setMateriaId} />

      {materiaId && filteredTotals.preguntas > 0 && (
        <div className="form-actions" style={{ marginBottom: "1rem" }}>
          <TestPrintButton
            materiaId={materiaId}
            title={materias.find((m) => m.id === materiaId)?.nombre ?? "Materia"}
            label={`Imprimir materia (${filteredTotals.preguntas} preg.)`}
          />
        </div>
      )}

      {emptyBancos.length > 0 && (
        <div className="info-box sim-info" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>{emptyBancos.length} banco(s) sin preguntas</strong> (0 en la base de
            datos). Solo se eliminan bancos realmente vacíos.
          </p>
          <button
            type="button"
            className="btn-danger btn-sm"
            style={{ marginTop: "0.65rem" }}
            disabled={cleaning}
            onClick={() => void limpiarVacios()}
          >
            {cleaning ? "Eliminando…" : "Eliminar solo bancos vacíos"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="muted">
          {bancos.length === 0 ? "Sin bancos todavía." : "Ningún banco coincide."}
        </p>
      ) : (
        <ul className="admin-banco-list">
          {filtered.map((b) => (
            <li key={b.id}>
              <div className="admin-banco-info">
                <span className="materia-tag">{materiaNombre(b.materias)}</span>
                <Link href={`/admin/bancos/${b.id}`}>
                  <strong>{b.nombre}</strong>
                </Link>
                <span className={`tipo-pill ${b.tipo}`}>{b.tipo}</span>
                {b.numPreguntas !== undefined && (
                  <span className="muted small">{b.numPreguntas} preg.</span>
                )}
              </div>
              <div className="admin-banco-actions">
                <Link href={`/admin/bancos/${b.id}`} className="btn-primary btn-sm">
                  Editar
                </Link>
                <Link href={`/test/${b.id}`} className="btn-secondary btn-sm">
                  Probar
                </Link>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  disabled={deleting === b.id}
                  onClick={() => void eliminar(b.id, b.nombre)}
                >
                  {deleting === b.id ? "…" : "Eliminar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="muted small admin-bancos-totals">
        {filtered.length === bancos.length && !search.trim() && !materiaId ? (
          <>
            Total: <strong>{stats.preguntas}</strong> preguntas en{" "}
            <strong>{stats.bancos}</strong> bancos · teórico{" "}
            <strong>{stats.teorico.preguntas}</strong> · práctico{" "}
            <strong>{stats.practico.preguntas}</strong>
          </>
        ) : (
          <>
            Mostrando: <strong>{filteredTotals.preguntas}</strong> preguntas en{" "}
            <strong>{filteredTotals.bancos}</strong> bancos · teórico{" "}
            <strong>{filteredTotals.teorico}</strong> · práctico{" "}
            <strong>{filteredTotals.practico}</strong>
          </>
        )}
      </p>
    </div>
  );
}
