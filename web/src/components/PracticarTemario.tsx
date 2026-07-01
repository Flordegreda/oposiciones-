"use client";

import { BancoTile } from "@/components/BancoTile";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { MateriaSection } from "@/lib/queries/bancos";

type Props = {
  sections: MateriaSection[];
};

export function PracticarTemario({ sections }: Props) {
  return (
    <div className="linea-block">
      <div className="linea-block-head">
        <h2 className="linea-block-title">Temario</h2>
      </div>

      {sections.length === 0 ? (
        <div className="card">
          <p className="muted">No hay bancos disponibles.</p>
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.id} className="materia-section card">
            <div className="materia-head">
              <span className="materia-tag">{section.nombre}</span>
              <span className="muted small">
                {section.bancos.length} banco
                {section.bancos.length !== 1 ? "s" : ""}
              </span>
              <TestPrintButton
                materiaId={section.id}
                title={section.nombre}
                label="Imprimir todos"
                className="materia-print-btn"
              />
            </div>
            <div className="banco-grid banco-grid--wide">
              {section.bancos.map((b) => (
                <BancoTile key={b.id} banco={b} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
