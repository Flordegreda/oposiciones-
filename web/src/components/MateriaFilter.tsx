"use client";

export type MateriaOption = {
  id: string;
  nombre: string;
};

type Props = {
  materias: MateriaOption[];
  value: string | null;
  onChange: (materiaId: string | null) => void;
  label?: string;
};

export function MateriaFilter({ materias, value, onChange, label = "Materia" }: Props) {
  if (materias.length <= 1) return null;

  return (
    <div className="materia-filter-wrap">
      <span className="materia-filter-label">{label}</span>
      <div className="materia-filter" role="tablist" aria-label={label}>
        <button
          type="button"
          role="tab"
          aria-selected={value === null}
          className={`materia-filter-btn${value === null ? " active" : ""}`}
          onClick={() => onChange(null)}
        >
          Todas
        </button>
        {materias.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={value === m.id}
            className={`materia-filter-btn${value === m.id ? " active" : ""}`}
            onClick={() => onChange(m.id)}
          >
            {m.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

export function materiasFromSections(
  sections: { id: string; nombre: string }[],
): MateriaOption[] {
  return sections.map((s) => ({ id: s.id, nombre: s.nombre }));
}

export function materiasFromPreguntas(
  preguntas: { materiaId?: string; materiaNombre?: string }[],
): MateriaOption[] {
  const map = new Map<string, string>();
  for (const p of preguntas) {
    if (p.materiaId && p.materiaNombre) map.set(p.materiaId, p.materiaNombre);
  }
  return [...map.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}
