"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MazoFichas } from "@/lib/queries/fichas";
import { getFichasDiagnostics, parseFichasText } from "@/lib/parse-fichas-text";

type Materia = { id: string; nombre: string };

type Props = {
  materias: Materia[];
  mazos: MazoFichas[];
  fichasOk: boolean;
  schemaOk: boolean;
};

function previewSnippet(text: string, max = 100): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).trim()}…`;
}

const EJEMPLO = `P: ¿Quién garantiza el derecho a la tutela judicial efectiva?
R: Art. 24.1 CE: todos tienen derecho a obtener la tutela efectiva de los jueces y tribunales en el ejercicio de sus derechos e intereses legítimos, sin que, en ningún caso, pueda producirse indefensión.

P: ¿Puede la Administración actuar sin habilitación legal?
R: No. Principio de legalidad (art. 103.1 CE / art. 9.1 CE): la Administración pública actúa con sometimiento pleno a la ley y al Derecho.

P: Art. 103.1 CE — ¿a quién sirve la Administración?
R: Con objetividad los intereses generales y actúa de acuerdo con los principios de eficacia, jerarquía, descentralización, desconcentración y coordinación.`;

export function AdminFichas({ materias, mazos, fichasOk, schemaOk }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [mazoId, setMazoId] = useState("");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [esperadas, setEsperadas] = useState("");

  const previewCount = useMemo(() => parseFichasText(texto).length, [texto]);
  const diagnostics = useMemo(
    () => (texto.trim() ? getFichasDiagnostics(texto) : null),
    [texto],
  );
  const rechazadas = diagnostics?.rechazadas ?? [];
  const bloques = diagnostics?.bloques ?? 0;
  const marcadas = diagnostics?.marcadas ?? 0;
  const esperadasNum = esperadas.trim() ? parseInt(esperadas, 10) : null;
  const cuentaEsperadasMal =
    esperadasNum !== null && !Number.isNaN(esperadasNum) && previewCount !== esperadasNum;
  const puedeImportar =
    !busy &&
    texto.trim() &&
    previewCount > 0 &&
    rechazadas.length === 0 &&
    !cuentaEsperadasMal;

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
        <h2 className="admin-section-title">Pegar fichas en texto plano</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Igual que los tests: pega el bloque generado por tu IA (docenas o cientos de
          fichas) o carga un <code>.txt</code>. Solo pregunta/respuesta — sin A/B/C/D. Se
          verán en <Link href="/fichas">Fichas</Link>.
        </p>

        <div className="cafe-highlight" style={{ marginTop: "0.75rem" }}>
          <strong>Formato de importación (salida del prompt):</strong>
          <pre className="format-ejemplo">{`P: ¿pregunta breve y concreta?
R: Respuesta con el dato normativo (art. X norma: …).

P: ¿otra pregunta?
R: Otra respuesta.

---`}</pre>
          <p className="muted small" style={{ marginTop: "0.5rem" }}>
            Una ficha = bloque <code>P:</code> + <code>R:</code> separado por línea en
            blanco (o <code>---</code>). También vale <code>Q:</code>/<code>A:</code> o{" "}
            <code>frente :: dorso</code> en una línea.
          </p>
        </div>

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

        <label className="file-upload" style={{ marginTop: "0.75rem" }}>
          Archivo .txt (opcional)
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const text = typeof reader.result === "string" ? reader.result : "";
                setTexto(text);
                if (!nombre.trim()) {
                  setNombre(file.name.replace(/\.txt$/i, "").trim() || "Mazo");
                }
                setMsg(`Cargado «${file.name}»`);
                setErr(null);
              };
              reader.onerror = () => setErr("No se pudo leer el archivo");
              reader.readAsText(file, "UTF-8");
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <span className="btn-secondary btn-sm">Elegir .txt</span>
        </label>

        <label>
          Fichas esperadas (opcional)
          <input
            type="number"
            min={1}
            value={esperadas}
            onChange={(e) => setEsperadas(e.target.value)}
            placeholder="100"
            disabled={busy !== null}
          />
        </label>
        <p className="muted small" style={{ marginTop: "-0.5rem" }}>
          Si indicas 100, no dejará importar hasta que la vista previa detecte exactamente 100
          válidas y ninguna rechazada.
        </p>

        <label style={{ display: "block", marginTop: "0.75rem" }}>
          Texto de las fichas
          <textarea
            className="textarea-taller"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={16}
            placeholder="Pega aquí el bloque completo generado por la IA…"
            disabled={busy !== null}
          />
        </label>

        {texto.trim() && (
          <>
            <p className={previewCount > 0 ? "ok" : "error"} style={{ marginTop: "0.5rem" }}>
              {previewCount > 0
                ? `${previewCount} ficha${previewCount !== 1 ? "s" : ""} válida${previewCount !== 1 ? "s" : ""}` +
                  (bloques > previewCount ? ` · ${bloques} bloques en el texto` : "") +
                  (marcadas > previewCount ? ` · ${marcadas} con P:/Q:` : "") +
                  (rechazadas.length
                    ? ` · ${rechazadas.length} rechazada${rechazadas.length !== 1 ? "s" : ""}`
                    : "")
                : "No se detectan fichas válidas — revisa que cada bloque tenga P: y R:."}
            </p>
            {rechazadas.length > 0 && (
              <div className="card card-warning" style={{ marginTop: "0.75rem", padding: "0.75rem 1rem" }}>
                <p className="small" style={{ margin: 0 }}>
                  <strong>
                    {rechazadas.length} ficha{rechazadas.length !== 1 ? "s" : ""} no se
                    importará{rechazadas.length !== 1 ? "n" : ""}
                  </strong>{" "}
                  — corrige el texto o pide a la IA que regenere esos bloques.
                </p>
                <ul className="muted small" style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
                  {rechazadas.map((r, idx) => (
                    <li key={`${r.numero ?? idx}-${r.enunciado.slice(0, 20)}`} style={{ marginBottom: "0.35rem" }}>
                      {r.numero !== undefined ? (
                        <strong>Bloque {r.numero}:</strong>
                      ) : (
                        <strong>Sin número:</strong>
                      )}{" "}
                      {r.motivo}
                      {r.enunciado && (
                        <span className="muted" style={{ display: "block", marginTop: "0.15rem" }}>
                          {previewSnippet(r.enunciado)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cuentaEsperadasMal && (
              <p className="error small" style={{ marginTop: "0.5rem" }}>
                Esperabas {esperadasNum} fichas pero solo hay {previewCount} válidas. Corrige el
                texto antes de importar.
              </p>
            )}
          </>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!puedeImportar}
            onClick={() => void importar()}
          >
            {busy === "import"
              ? "Importando…"
              : previewCount > 0
                ? `Importar ${previewCount} ficha${previewCount !== 1 ? "s" : ""}`
                : "Importar fichas"}
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
          <ul className="admin-fichas-list">
            {mazos.map((m) => (
              <li key={m.id} className="admin-fichas-row">
                <div className="admin-fichas-row-main">
                  <strong>{m.nombre}</strong>
                  <span className="muted small">
                    {m.materiaNombre} · {m.numFichas} ficha{m.numFichas !== 1 ? "s" : ""}
                    {!m.active ? " · oculto" : ""}
                  </span>
                </div>
                <div className="admin-fichas-row-actions">
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
