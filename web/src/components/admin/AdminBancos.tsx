"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MateriaFilter } from "@/components/MateriaFilter";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { BancoRow, MaterialStats } from "@/lib/queries/bancos";
import { materiaNombre, sortBancosByNombre } from "@/lib/queries/bancos";
import { isEncadenadoBankName } from "@/lib/encadenado-utils";

type Props = { bancos: BancoRow[]; stats: MaterialStats };

export function AdminBancos({ bancos: initial }: Props) {
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

  const filteredEncadenados = useMemo(() => {
    const encBancos = filtered.filter((b) => isEncadenadoBankName(b.nombre));
    return encBancos.reduce((n, b) => n + (b.numPreguntas ?? 0), 0);
  }, [filtered]);

  const encadenadoBancosSinSupuesto = useMemo(
    () => bancos.filter((b) => isEncadenadoBankName(b.nombre)),
    [bancos],
  );
  const [repairing, setRepairing] = useState(false);

  const emptyBancos = useMemo(
    () => bancos.filter((b) => (b.numPreguntas ?? 0) === 0),
    [bancos],
  );
  const stubBancos = useMemo(
    () => bancos.filter((b) => {
      const n = b.numPreguntas ?? 0;
      return n > 0 && n <= 1;
    }),
    [bancos],
  );
  const [cleaning, setCleaning] = useState(false);
  const [cleaningJunk, setCleaningJunk] = useState(false);

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

  async function limpiarPruebaYDuplicados() {
    setCleaningJunk(true);
    try {
      const previewRes = await fetch("/api/admin/bancos/cleanup-junk");
      const preview = await previewRes.json();
      if (!previewRes.ok) throw new Error(preview.error || "No se pudo analizar");

      if (!preview.count) {
        alert("No hay bancos de prueba ni duplicados que limpiar.");
        return;
      }

      const lines = (preview.items as { nombre: string; numPreguntas: number; reason: string }[])
        .slice(0, 40)
        .map(
          (j) =>
            `· ${j.nombre} (${j.numPreguntas} preg.) — ${j.reason === "stub" ? "prueba" : "duplicado"}`,
        );
      const more =
        preview.count > 40 ? `\n… y ${preview.count - 40} más` : "";
      const ok = confirm(
        `¿Eliminar ${preview.count} banco(s)?\n` +
          `${preview.stubs} de prueba (≤1 preg.) · ${preview.duplicates} duplicados\n\n` +
          `${lines.join("\n")}${more}\n\n` +
          `En duplicados se conserva el banco con más preguntas.`,
      );
      if (!ok) return;

      const res = await fetch("/api/admin/bancos/cleanup-junk", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo limpiar");

      const removed = new Set(
        (data.items as { id: string }[] | undefined)?.map((j) => j.id) ?? [],
      );
      setBancos((list) => list.filter((b) => !removed.has(b.id)));
      router.refresh();
      alert(`Eliminados ${data.deleted} banco(s) de prueba o duplicados.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al limpiar");
    } finally {
      setCleaningJunk(false);
    }
  }

  async function repararEncadenados() {
    const nombres = encadenadoBancosSinSupuesto.map((b) => b.nombre);
    const ok = confirm(
      `¿Vincular preguntas a supuesto en ${nombres.length} banco(s) encadenado?\n\n${nombres.join("\n")}\n\nDespués edita el texto del caso en cada banco.`,
    );
    if (!ok) return;

    setRepairing(true);
    try {
      const res = await fetch("/api/admin/bancos/repair-encadenados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: ["EBEP ENCADENADO", "EBEP ENCADENADO 1"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo reparar");
      router.refresh();
      alert(data.message || "Bancos reparados");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al reparar");
    } finally {
      setRepairing(false);
    }
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

  const showingAll = filtered.length === bancos.length && !search.trim() && !materiaId;

  return (
    <div className="card card-elevated">
      <h2 className="admin-section-title">Tests por banco</h2>
      <p className="muted small">Edita, prueba o elimina cada bloque de preguntas.</p>

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

      {(stubBancos.length > 0 || bancos.length > 1) && (
        <div className="info-box sim-info" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>Limpieza de temario:</strong> elimina bancos de prueba con ≤1 pregunta y
            duplicados por nombre (se conserva el que tiene más preguntas).
            {stubBancos.length > 0 && (
              <>
                {" "}
                Ahora hay <strong>{stubBancos.length}</strong> banco(s) con solo 1 pregunta.
              </>
            )}
          </p>
          <button
            type="button"
            className="btn-danger btn-sm"
            style={{ marginTop: "0.65rem" }}
            disabled={cleaningJunk}
            onClick={() => void limpiarPruebaYDuplicados()}
          >
            {cleaningJunk ? "Analizando…" : "Limpiar prueba y duplicados"}
          </button>
        </div>
      )}

      {encadenadoBancosSinSupuesto.length > 0 && (
        <div className="info-box sim-info" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>{encadenadoBancosSinSupuesto.length} banco(s) encadenado</strong> detectado(s)
            por nombre. Si al imprimir no sale el enunciado del caso, vincula las preguntas al
            supuesto y luego edita el texto en cada banco.
          </p>
          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ marginTop: "0.65rem" }}
            disabled={repairing}
            onClick={() => void repararEncadenados()}
          >
            {repairing ? "Reparando…" : "Reparar EBEP ENCADENADO y EBEP ENCADENADO 1"}
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

      {!showingAll && (
        <p className="muted small admin-bancos-totals">
          Mostrando: <strong>{filteredTotals.preguntas}</strong> preguntas en{" "}
          <strong>{filteredTotals.bancos}</strong> bancos · teórico{" "}
          <strong>{filteredTotals.teorico}</strong> · práctico{" "}
          <strong>{filteredTotals.practico}</strong>
          {filteredEncadenados > 0 && (
            <>
              {" "}
              · encadenados <strong>{filteredEncadenados}</strong>
            </>
          )}
        </p>
      )}
    </div>
  );
}
