import {
  construirTemarioInventario,
  tipoCodigo,
  tipoEtiqueta,
  type MateriaCatalogo,
} from "@/lib/temario-checklist";
import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { PrintTemarioToolbar } from "@/components/temario/PrintTemarioToolbar";

type Props = {
  testSections: MateriaSection[];
  fichaSections: MazoFichasSection[];
  allMaterias: MateriaCatalogo[];
};

export function TemarioChecklistPrintView({
  testSections,
  fichaSections,
  allMaterias,
}: Props) {
  const resumen = construirTemarioInventario(testSections, fichaSections, allMaterias);
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (resumen.materias.length === 0) {
    return (
      <>
        <PrintTemarioToolbar />
        <p className="print-sheet-meta">No hay materias definidas todavía.</p>
      </>
    );
  }

  return (
    <>
      <PrintTemarioToolbar />
      <article className="print-document print-checklist-doc">
        <header className="print-sheet-head">
          <h1 className="print-sheet-title">Plan de temario — Checklist</h1>
          <p className="print-sheet-sub">Oposiciones JEX · Jurídica · Junta de Extremadura</p>
          <p className="print-sheet-meta">
            {resumen.materias.length} materia{resumen.materias.length !== 1 ? "s" : ""} ·{" "}
            {resumen.testsTotal} test{resumen.testsTotal !== 1 ? "s" : ""} ·{" "}
            {resumen.fichasTotal} mazo{resumen.fichasTotal !== 1 ? "s" : ""} de fichas ·{" "}
            {resumen.totalItems} ítems · {date}
          </p>
          <p className="print-checklist-legend">
            <span className="print-checklist-legend-item">
              <strong>T</strong> = Test teórico
            </span>
            <span className="print-checklist-legend-item">
              <strong>P</strong> = Test práctico
            </span>
            <span className="print-checklist-legend-item">
              <strong>F</strong> = Fichas
            </span>
            · Marca con ✓ cada ítem cuando lo completes
          </p>
        </header>

        {resumen.materias.map((m) => (
          <section key={m.materiaId} className="print-checklist-materia">
            <h2 className="print-checklist-materia-title">{m.materiaNombre}</h2>
            <p className="print-checklist-materia-meta">
              {m.testsTotal} test{m.testsTotal !== 1 ? "s" : ""}
              {m.fichasTotal > 0 && (
                <>
                  {" "}
                  · {m.fichasTotal} ficha{m.fichasTotal !== 1 ? "s" : ""}
                </>
              )}{" "}
              · {m.total} ítems
            </p>
            <table className="print-checklist-table">
              <thead>
                <tr>
                  <th className="print-checklist-col-check" scope="col">
                    ✓
                  </th>
                  <th className="print-checklist-col-tipo" scope="col">
                    Tipo
                  </th>
                  <th className="print-checklist-col-nombre" scope="col">
                    Nombre
                  </th>
                  <th className="print-checklist-col-n" scope="col">
                    Nº
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="print-checklist-empty">
                      Sin tests ni fichas en esta materia
                    </td>
                  </tr>
                ) : (
                  m.items.map((item) => (
                    <tr key={`${item.kind}-${item.id}`}>
                      <td className="print-checklist-col-check">
                        <span className="print-check-box" aria-hidden="true" />
                      </td>
                      <td className="print-checklist-col-tipo">
                        <span
                          className={`print-checklist-tipo print-checklist-tipo--${tipoCodigo(item).toLowerCase()}`}
                          title={tipoEtiqueta(item)}
                        >
                          {tipoCodigo(item)}
                        </span>
                      </td>
                      <td className="print-checklist-col-nombre">{item.nombre}</td>
                      <td className="print-checklist-col-n">
                        {item.count} {item.kind === "test" ? "preg." : "fich."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ))}

        <footer className="print-checklist-footer">
          <p>
            Resumen al imprimir: _____ / {resumen.totalItems} ítems completados
          </p>
        </footer>
      </article>
    </>
  );
}
