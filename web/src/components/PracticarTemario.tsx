"use client";

import { useEffect, useMemo, useState } from "react";
import { BancoTile } from "@/components/BancoTile";
import { MateriaFilter, materiasFromSections } from "@/components/MateriaFilter";
import { TestPrintButton } from "@/components/TestPrintButton";
import type { MateriaSection } from "@/lib/queries/bancos";
import { getLocalCache } from "@/lib/persistence";
import type { BancoCacheEntry } from "@/lib/persistence/types";

type Props = {
  sections: MateriaSection[];
};

export function PracticarTemario({ sections }: Props) {
  const [materiaId, setMateriaId] = useState<string | null>(null);

  // Cache local de la lista de bancos (cambia poco)
  useEffect(() => {
    const entries: BancoCacheEntry[] = [];
    const now = new Date().toISOString();
    for (const section of sections) {
      for (const b of section.bancos) {
        entries.push({
          id: b.id,
          nombre: b.nombre,
          tipo: b.tipo,
          materiaId: section.id,
          materiaNombre: section.nombre,
          numPreguntas: b.numPreguntas,
          cachedAt: now,
        });
      }
    }
    void getLocalCache().saveBancos(entries).catch(() => undefined);
  }, [sections]);

  const materias = useMemo(() => materiasFromSections(sections), [sections]);

  const visible = useMemo(() => {
    if (!materiaId) return sections;
    return sections.filter((s) => s.id === materiaId);
  }, [sections, materiaId]);

  const totalBancos = visible.reduce((n, s) => n + s.bancos.length, 0);

  return (
    <div className="linea-block">
      <div className="linea-block-head">
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
