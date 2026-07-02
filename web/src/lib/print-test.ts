export type PrintablePregunta = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string | null;
  supuestoId?: string | null;
  supuestoTitulo?: string | null;
  supuestoTexto?: string | null;
};

export type PrintSection = {
  title: string;
  preguntas: PrintablePregunta[];
};

export type PrintBundle = {
  title: string;
  subtitle: string;
  sections: Array<{
    bancoId: string;
    bancoNombre: string;
    tipo: string;
    preguntas: PrintablePregunta[];
  }>;
  totalPreguntas: number;
};

export function bundleToSections(bundle: PrintBundle): PrintSection[] {
  return bundle.sections.map((s) => ({
    title: s.bancoNombre,
    preguntas: s.preguntas,
  }));
}

export function flattenSections(sections: PrintSection[]): PrintablePregunta[] {
  return sections.flatMap((s) => s.preguntas);
}

export function totalPreguntas(sections: PrintSection[]): number {
  return flattenSections(sections).length;
}
