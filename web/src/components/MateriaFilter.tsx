"use client"; // v2

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
      <label className="materia-filter-label" htmlFor="materia-select">{label}</label>
      <select
        id="materia-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          padding: "0.5rem 0.75rem",
          font: "inherit",
          fontSize: "0.9rem",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "#fff",
          cursor: "pointer",
          minWidth: "200px",
        }}
      >
        <option value="">Todas las materias</option>
        {materias.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>
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
