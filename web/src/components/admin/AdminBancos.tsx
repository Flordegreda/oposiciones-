"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MateriaFilter } from "@/components/MateriaFilter";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { BancoRow } from "@/lib/queries/bancos";
import { materiaNombre, sortBancosByNombre } from "@/lib/banco-display";

type Props = { bancos: BancoRow[] };

export function AdminBancos({ bancos: initial }: Props) {
  const router = useRouter();
  const [bancos, setBancos] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set());
  const [borrandoVarios, setBorrandoVarios] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [materiaId, setMateriaId] = useState<string | null>(null);

  useEffect(() => {
    setBancos(initial);
  }, [initial]);

  useEffect(() => {
    const vigentes = new Set(bancos.map((b) => b.id));
    setSeleccion((prev) => {
      const next = new Set([...prev].filter((id) => vigentes.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [bancos]);

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

  const brokenBancos = useMemo(
    () =>
      bancos.filter((b) => {
        const n = b.numPreguntas ?? 0;
        const sinMateria = materiaNombre(b.materias) === "Sin materia";
        return n === 0 || sinMateria;
      }),
    [bancos],
  );
  const [cleaning, setCleaning] = useState(false);
  const [cleaningJunk, setCleaningJunk] = useState(false);

  async function limpiarRotos() {
    setCleaning(true);
    try {
      const previewRes = await fetch("/api/admin/bancos/cleanup-broken");
      const preview = await previewRes.json();
      if (!previewRes.ok) throw new Error(preview.error || "No se pudo analizar");

      if (!preview.count) {
        alert("No hay bancos con enlace roto.");
        return;
      }

      const lines = (preview.items as { nombre: string; reason: string }[])
        .slice(0, 40)
        .map(
          (b) =>
            `· ${b.nombre} — ${b.reason === "empty" ? "sin preguntas" : "materia perdida"}`,
        );
      const more = preview.count > 40 ? `\n… y ${preview.count - 40} más` : "";
      const ok = confirm(
        `¿Eliminar ${preview.count} banco(s) con enlace roto?\n` +
          `${preview.empty} vacíos · ${preview.orphan} sin materia\n\n` +
          `${lines.join("\n")}${more}`,
      );
      if (!ok) return;

      const res = await fetch("/api/admin/bancos/cleanup-broken", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo limpiar");

      const removed = new Set(
        (data.items as { id: string }[] | undefined)?.map((b) => b.id) ?? [],
      );
      setBancos((list) => list.filter((b) => !removed.has(b.id)));
      router.refresh();
      alert(`Eliminados ${data.deleted} banco(s) con enlace roto.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al limpiar");
    } finally {
      setCleaning(false);
    }
  }

  const stubBancos = useMemo(
    () =>
      bancos.filter((b) => {
        const n = b.numPreguntas ?? 0;
        return n > 0 && n <= 1;
      }),
    [bancos],
  );

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

  function toggleSeleccion(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visiblesSeleccionados = filtered.filter((b) => seleccion.has(b.id)).length;
  const todosVisiblesMarcados =
    filtered.length > 0 && visiblesSeleccionados === filtered.length;

  function toggleVisibles() {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (todosVisiblesMarcados) filtered.forEach((b) => next.delete(b.id));
      else filtered.forEach((b) => next.add(b.id));
      return next;
    });
  }

  async function eliminarSeleccionados() {
    const elegidos = bancos.filter((b) => seleccion.has(b.id));
    if (!elegidos.length) return;
    const preguntas = elegidos.reduce((n, b) => n + (b.numPreguntas ?? 0), 0);
    const lista = elegidos
      .slice(0, 30)
      .map((b) => `· ${b.nombre} (${b.numPreguntas ?? 0} preg.)`)
      .join("\n");
    const mas = elegidos.length > 30 ? `\n… y ${elegidos.length - 30} más` : "";
    if (
      !confirm(
        `¿Eliminar ${elegidos.length} banco(s) y sus ${preguntas} preguntas?\n\n` +
          `${lista}${mas}\n\nNo se puede deshacer.`,
      )
    ) {
      return;
    }

    const borrados = new Set<string>();
    const fallos: string[] = [];
    for (let i = 0; i < elegidos.length; i++) {
      const b = elegidos[i]!;
      setBorrandoVarios(`${i + 1}/${elegidos.length}`);
      try {
        const res = await fetch(`/api/admin/bancos/${b.id}`, { method: "DELETE" });
        if (res.ok) borrados.add(b.id);
        else fallos.push(`${b.nombre}: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
      } catch (e) {
        fallos.push(`${b.nombre}: ${e instanceof Error ? e.message : "error de red"}`);
      }
    }
    setBorrandoVarios(null);
    setBancos((list) => list.filter((b) => !borrados.has(b.id)));
    router.refresh();
    if (fallos.length) {
      alert(
        `Eliminados ${borrados.size} de ${elegidos.length}. No se pudieron eliminar:\n\n` +
          fallos.slice(0, 15).join("\n"),
      );
    }
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
            label={`PDF materia (${filteredTotals.preguntas} preg.)`}
          />
        </div>
      )}

      {(brokenBancos.length > 0 || bancos.length > 0) && (
        <div className="info-box sim-info" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>Letras A/B/C/D sesgadas:</strong> si un banco tiene casi siempre la misma
            respuesta correcta (p. ej. B), ábrelo con <strong>Editar</strong> y usa{" "}
            <strong>Reequilibrar letras A–D</strong>. No cambia los textos, solo reparte la letra
            correcta.
          </p>
        </div>
      )}

      {(brokenBancos.length > 0 || bancos.length > 0) && (
        <div className="info-box sim-info" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>Enlaces rotos:</strong> bancos sin preguntas o sin materia válida (quedan
            tras partir/fusionar). No aparecen en Tests pero ensucian Material.
            {brokenBancos.length > 0 && (
              <>
                {" "}
                Ahora hay <strong>{brokenBancos.length}</strong>.
              </>
            )}
          </p>
          <button
            type="button"
            className="btn-danger btn-sm"
            style={{ marginTop: "0.65rem" }}
            disabled={cleaning}
            onClick={() => void limpiarRotos()}
          >
            {cleaning ? "Eliminando…" : "Eliminar bancos con enlace roto"}
          </button>
        </div>
      )}

      {(stubBancos.length > 0 || bancos.length > 1) && (
        <div className="info-box sim-info" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>Limpieza de bancos:</strong> elimina bancos de prueba con ≤1 pregunta y
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

      {filtered.length === 0 ? (
        <p className="muted">
          {bancos.length === 0 ? "Sin bancos todavía." : "Ningún banco coincide."}
        </p>
      ) : (
        <>
        <div
          className="form-actions"
          style={{
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.65rem",
            margin: "0 0 0.5rem",
            padding: "0.6rem 0.75rem",
            borderRadius: "0.75rem",
            background: seleccion.size ? "rgba(220, 38, 38, 0.06)" : "rgba(0, 0, 0, 0.03)",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={todosVisiblesMarcados}
              ref={(el) => {
                if (el) el.indeterminate = visiblesSeleccionados > 0 && !todosVisiblesMarcados;
              }}
              onChange={toggleVisibles}
            />
            <span className="small">
              {todosVisiblesMarcados ? "Desmarcar" : "Seleccionar"} los {filtered.length} visibles
            </span>
          </label>
          {seleccion.size > 0 && (
            <>
              <span className="muted small">
                {seleccion.size} seleccionado{seleccion.size !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                className="btn-link btn-sm"
                disabled={borrandoVarios !== null}
                onClick={() => setSeleccion(new Set())}
              >
                Quitar selección
              </button>
              <button
                type="button"
                className="btn-danger btn-sm"
                disabled={borrandoVarios !== null}
                onClick={() => void eliminarSeleccionados()}
              >
                {borrandoVarios
                  ? `Eliminando ${borrandoVarios}…`
                  : `Eliminar seleccionados (${seleccion.size})`}
              </button>
            </>
          )}
        </div>
        <ul className="admin-banco-list">
          {filtered.map((b) => (
            <li
              key={b.id}
              style={seleccion.has(b.id) ? { background: "rgba(220, 38, 38, 0.05)" } : undefined}
            >
              <input
                type="checkbox"
                aria-label={`Seleccionar ${b.nombre}`}
                checked={seleccion.has(b.id)}
                disabled={borrandoVarios !== null}
                onChange={() => toggleSeleccion(b.id)}
                style={{ width: "1.1rem", height: "1.1rem", flexShrink: 0, cursor: "pointer" }}
              />
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
        </>
      )}

      {!showingAll && (
        <p className="muted small admin-bancos-totals">
          Mostrando: <strong>{filteredTotals.preguntas}</strong> preguntas en{" "}
          <strong>{filteredTotals.bancos}</strong> bancos · teórico{" "}
          <strong>{filteredTotals.teorico}</strong> · práctico{" "}
          <strong>{filteredTotals.practico}</strong>
        </p>
      )}
    </div>
  );
}
