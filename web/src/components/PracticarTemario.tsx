"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BancoTile } from "@/components/BancoTile";
import { MateriaFilter, materiasFromSections } from "@/components/MateriaFilter";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { MateriaSection } from "@/lib/queries/bancos";

type Props = {
  sections: MateriaSection[];
};

export function PracticarTemario({ sections }: Props) {
  const [materiaId, setMateriaId] = useState<string | null>(null);

  const materias = useMemo(() => materiasFromSections(sections), [sections]);

  const visible = useMemo(() => {
    if (!materiaId) return sections;
    return sections.filter((s) => s.id === materiaId);
  }, [sections, materiaId]);

  const totalBancos = visible.reduce((n, s) => n + s.bancos.length, 0);

  return (
    <div className="linea-block">
      <div className="linea-block-head">
        <h2 className="linea-block-title">Temario</h2>
        <MateriaFilter materias={materias} value={materiaId} onChange={setMateriaId} />
      </div>

      {visible.length === 0 || totalBancos === 0 ? (
        <div className="card">
          <p className="muted">No hay bancos en esta materia.</p>
        </div>
      ) : (
        visible.map((section) => (
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
                label="PDF todos"
                className="materia-print-btn"
              />
              {section.hasResumen && (
                <Link href={`/materia/${section.id}`} className="btn-link btn-sm materia-ficha-link">
                  {section.fichaCount && section.fichaCount > 0
                    ? `Fichas (${section.fichaCount})`
                    : "Ficha"}
                </Link>
              )}
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
