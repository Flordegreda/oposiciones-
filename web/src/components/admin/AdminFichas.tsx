"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MazoFichas } from "@/lib/queries/fichas";
import { parseFichasText } from "@/lib/parse-fichas-text";

type Materia = { id: string; nombre: string };

type Props = {
  materias: Materia[];
  mazos: MazoFichas[];
  fichasOk: boolean;
  schemaOk: boolean;
};

const EJEMPLO = `P: ¿Qué es el principio de legalidad?
R: Que la Administración solo puede actuar cuando una norma se lo permite.

P: Artículo 103 CE — ¿a quién sirve la Administración?
R: Con objetividad los intereses generales.

frente :: dorso en una línea
pregunta con tab\trespuesta con tab`;

export function AdminFichas({ materias, mazos, fichasOk, schemaOk }: Props) {
  const router = useRouter();
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [mazoId, setMazoId] = useState("");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const previewCount = useMemo(() => parseFichasText(texto).length, [texto]);

  const mazosMateria = useMemo(
    () => mazos.filter((m) => !materiaId || m.materiaId === materiaId),
    [mazos, materiaId],
  );

  async function importar() {
    if (!materiaId) return setErr("Selecciona una materia");
    if (!nombre.trim() && !mazoId) return setErr("Indica el nombre del mazo");

    setBusy("import");
    setErr(null);
    setMsg(null);

    try {
      const selected = mazos.find((m) => m.id === mazoId);
      const res = await fetch("/api/admin/fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          nombre: nombre.trim() || selected?.nombre || "Mazo",
          texto,
          mazoId: mazoId || undefined,
          replace: mazoId ? replace : true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar");

      setMsg(data.message || "Importado");
      setTexto("");
      if (!mazoId) setNombre("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setBusy(null);
    }
  }

  async function eliminar(m: MazoFichas) {
    if (
      !confirm(
        `¿Eliminar el mazo «${m.nombre}» y sus ${m.numFichas} fichas?\n\nNo se puede deshacer.`,
      )
    ) {
      return;
    }

    setBusy(m.id);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/fichas/${m.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      setMsg(`Eliminado: «${m.nombre}»`);
      if (mazoId === m.id) setMazoId("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusy(null);
    }
  }

  if (!fichasOk) {
    return (
      <div className="card card-elevated">
        <h2>Fichas tipo Anki</h2>
        <p className="muted small">
          Activa la función con la tarjeta amarilla <strong>Fichas (Anki)</strong> arriba en
          esta página (solo la primera vez).
        </p>
      </div>
    );
  }

  return (
    <>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <div className="card card-elevated">
        <h2>Importar fichas</h2>
        <p className="muted small">
          Pega texto con <strong>pregunta y respuesta</strong> (no opciones A/B/C/D). Formatos:{" "}
          <code>P:</code>/<code>R:</code>, <code>Q:</code>/<code>A:</code>,{" "}
          <code>Respuesta:</code>, o <code>frente :: dorso</code>. Se verán en{" "}
          <Link href="/fichas">Fichas</Link>.
        </p>

        <div className="form-grid-fields carga-campos" style={{ marginTop: "0.75rem" }}>
          <label>
            Materia
            <select
              value={materiaId}
              onChange={(e) => {
                setMateriaId(e.target.value);
                setMazoId("");
              }}
              disabled={!schemaOk || busy !== null || materias.length === 0}
            >
              {materias.length === 0 && <option value="">Sin materias</option>}
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mazo existente (opcional)
            <select
              value={mazoId}
              onChange={(e) => {
                const id = e.target.value;
                setMazoId(id);
                const m = mazos.find((x) => x.id === id);
                if (m) {
                  setNombre(m.nombre);
                  setMateriaId(m.materiaId);
                }
              }}
              disabled={busy !== null}
            >
              <option value="">— Crear mazo nuevo —</option>
              {mazosMateria.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.numFichas})
                </option>
              ))}
            </select>
          </label>

          <label>
            Nombre del mazo
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. CE · Título I"
              disabled={busy !== null}
            />
          </label>

          {mazoId && (
            <label className="sim-toggle" style={{ alignSelf: "end" }}>
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              <span>Sustituir fichas del mazo (si no, se añaden)</span>
            </label>
          )}
        </div>

        <label style={{ display: "block", marginTop: "0.75rem" }}>
          Texto
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            placeholder={EJEMPLO}
            disabled={busy !== null}
            style={{ width: "100%", fontFamily: "inherit" }}
          />
        </label>

        <p className="muted small">
          Vista previa: <strong>{previewCount}</strong> ficha
          {previewCount !== 1 ? "s" : ""} detectada{previewCount !== 1 ? "s" : ""}.
        </p>

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={busy !== null || !texto.trim() || previewCount === 0}
            onClick={() => void importar()}
          >
            {busy === "import" ? "Importando…" : "Importar fichas"}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy !== null}
            onClick={() => setTexto(EJEMPLO)}
          >
            Pegar ejemplo
          </button>
        </div>
      </div>

      <div className="card card-elevated">
        <h2>Mazos ({mazos.length})</h2>
        {mazos.length === 0 ? (
          <p className="muted small">Aún no hay mazos.</p>
        ) : (
          <ul className="admin-resumenes-list">
            {mazos.map((m) => (
              <li key={m.id} className="admin-resumenes-row">
                <div className="admin-resumenes-row-main">
                  <strong>{m.nombre}</strong>
                  <span className="muted small">
                    {m.materiaNombre} · {m.numFichas} ficha{m.numFichas !== 1 ? "s" : ""}
                    {!m.active ? " · oculto" : ""}
                  </span>
                </div>
                <div className="admin-resumenes-row-actions">
                  <Link href={`/fichas/${m.id}`} className="btn-link btn-sm">
                    Ver
                  </Link>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    disabled={busy !== null}
                    onClick={() => void eliminar(m)}
                  >
                    {busy === m.id ? "…" : "Eliminar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
