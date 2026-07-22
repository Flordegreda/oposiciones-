"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MateriaFilter, materiasFromResumenes } from "@/components/MateriaFilter";
import type { MazoFichasSection } from "@/lib/queries/fichas";

type Props = {
  sections: MazoFichasSection[];
};

export function FichasBiblioteca({ sections }: Props) {
  const [materiaId, setMateriaId] = useState<string | null>(null);

  const materias = useMemo(() => materiasFromResumenes(sections), [sections]);

  const visible = useMemo(() => {
    if (!materiaId) return sections;
    return sections.filter((s) => s.materiaId === materiaId);
  }, [sections, materiaId]);

  const totalMazos = visible.reduce((n, s) => n + s.mazos.length, 0);

  return (
    <div className="linea-block">
      <div className="linea-block-head">
        <MateriaFilter materias={materias} value={materiaId} onChange={setMateriaId} />
      </div>

      {visible.length === 0 || totalMazos === 0 ? (
        <div className="card">
          <p className="muted">No hay mazos en esta materia.</p>
        </div>
      ) : (
        visible.map((section) => (
          <section key={section.materiaId} className="materia-section card">
            <div className="materia-head">
              <span className="materia-tag">{section.materiaNombre}</span>
              <span className="muted small">
                {section.mazos.length} mazo{section.mazos.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="banco-grid banco-grid--wide">
              {section.mazos.map((m) => (
                <div key={m.id} className="banco-tile-card">
                  <div className="banco-tile banco-tile--static">
                    <div className="banco-tile-body">
                      <span className="banco-tile-title">{m.nombre}</span>
                      <span className="banco-tile-meta">
                        <span className="tipo-pill teorico">fichas</span>
                        {m.numFichas > 0 && (
                          <span className="banco-tile-count">{m.numFichas} fich.</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="banco-tile-actions">
                    <Link href={`/fichas/${m.id}`} className="banco-tile-action banco-tile-action--flash">
                      Estudiar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
