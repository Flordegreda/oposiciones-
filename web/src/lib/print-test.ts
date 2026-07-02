export type PrintablePregunta = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string | null;
  supuestoId?: string | null;
  supuestoTitulo?: string | null;
  supuestoTexto?: string | null;
};

export type PrintSupuesto = {
  id?: string | null;
  titulo?: string | null;
  texto: string;
};

export type PrintSection = {
  title: string;
  preguntas: PrintablePregunta[];
  supuestos?: PrintSupuesto[];
};

export type PrintBundle = {
  title: string;
  subtitle: string;
  sections: Array<{
    bancoId: string;
    bancoNombre: string;
    tipo: string;
    preguntas: PrintablePregunta[];
    supuestos?: PrintSupuesto[];
  }>;
  totalPreguntas: number;
};

export function collectPrintSupuestos(section: PrintSection): PrintSupuesto[] {
  if (section.supuestos?.length) {
    return section.supuestos.filter((s) => s.texto?.trim());
  }
  const seen = new Set<string>();
  const out: PrintSupuesto[] = [];
  for (const q of section.preguntas) {
    const texto = q.supuestoTexto?.trim();
    if (!texto) continue;
    const key = q.supuestoId ?? texto;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: q.supuestoId, titulo: q.supuestoTitulo, texto });
  }
  return out;
}

export function bundleToSections(bundle: PrintBundle): PrintSection[] {
  return bundle.sections.map((s) => ({
    title: s.bancoNombre,
    preguntas: s.preguntas,
    supuestos: s.supuestos,
  }));
}

export function flattenSections(sections: PrintSection[]): PrintablePregunta[] {
  return sections.flatMap((s) => s.preguntas);
}

export function totalPreguntas(sections: PrintSection[]): number {
  return flattenSections(sections).length;
}
