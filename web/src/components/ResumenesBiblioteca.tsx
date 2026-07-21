"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MateriaFilter, materiasFromResumenes } from "@/components/MateriaFilter";
import { formatPdfSize } from "@/lib/format-pdf-size";
import type { ResumenPdfSection } from "@/lib/resumenes-types";

type Props = {
  sections: ResumenPdfSection[];
};

export function ResumenesBiblioteca({ sections }: Props) {
  const [materiaId, setMateriaId] = useState<string | null>(null);

  const materias = useMemo(() => materiasFromResumenes(sections), [sections]);

  const visible = useMemo(() => {
    if (!materiaId) return sections;
    return sections.filter((s) => s.materiaId === materiaId);
  }, [sections, materiaId]);

  return (
    <div className="resumenes-biblioteca resumenes-biblioteca--desktop">
      <div className="linea-block-head">
        <MateriaFilter materias={materias} value={materiaId} onChange={setMateriaId} />
      </div>

      {visible.map((section) => (
        <section key={section.materiaId} className="materia-section card">
          <div className="materia-head">
            <span className="materia-tag">{section.materiaNombre}</span>
            <span className="muted small">
              {section.items.length} PDF{section.items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="resumenes-list">
            {section.items.map((item) => (
              <li key={item.id}>
                <Link href={`/resumen/${item.id}`} className="resumen-list-item">
                  <span className="resumen-list-title">{item.titulo}</span>
                  <span className="muted small resumen-list-meta">
                    {item.filename} · {formatPdfSize(item.sizeBytes)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
