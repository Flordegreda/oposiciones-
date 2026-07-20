export type FichaSection = {
  id: string;
  title: string;
  body: string;
};

export type FichaTrampa = {
  id: string;
  text: string;
};

/** Tema_37_LEF_ficha.docx → 37 */
export function parseTemaFromFilename(name: string): number | null {
  const m = name.match(/tema[_\s.-]*(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 ? n : null;
}

/** TEMA 37 — Título… dentro del markdown */
export function parseTemaFromMarkdown(md: string): number | null {
  const m = md.match(
    /^\s*(?:#+\s*)?\*{0,2}TEMA\s*(\d+)\s*[—–\-]/im,
  );
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 ? n : null;
}

export function parseTituloFromMarkdown(md: string, temaNumero?: number): string {
  const m = md.match(
    /^\s*(?:#+\s*)?\*{0,2}TEMA\s*\d+\s*[—–\-]\s*(.+?)\*{0,2}\s*$/im,
  );
  if (m) return m[1].replace(/\*+/g, "").trim();
  if (temaNumero) return `Tema ${temaNumero}`;
  return "Ficha";
}

/** Partes separadas por --- entre temas importados en bloque */
export function splitLegacyMateriaResumen(md: string): string[] {
  const trimmed = md.trim();
  if (!trimmed) return [];
  if (!trimmed.includes("\n---\n")) return [trimmed];
  return trimmed.split(/\n---\n+/).map((c) => c.trim()).filter(Boolean);
}

/** Secciones numeradas (**1\. …**, **2\. …**) */
export function splitFichaSections(md: string): FichaSection[] {
  const introMatch = md.match(/^[\s\S]*?(?=^\*\*\d+\\?\.\s)/m);
  const intro = introMatch ? introMatch[0].trim() : "";
  const rest = intro ? md.slice(intro.length) : md;
  const chunks = rest.split(/(?=^\*\*\d+\\?\.\s)/m).filter((c) => c.trim());

  const sections: FichaSection[] = [];
  if (intro) {
    sections.push({ id: "intro", title: "Introducción", body: intro });
  }

  for (const chunk of chunks) {
    const titleMatch = chunk.match(/^\*\*(\d+\\?\.\s.+?)\*\*/);
    const title = titleMatch
      ? titleMatch[1].replace(/\\./g, ".").trim()
      : "Sección";
    const body = titleMatch ? chunk.slice(titleMatch[0].length).trim() : chunk.trim();
    const id = titleMatch ? `s-${titleMatch[1].replace(/\D+/g, "")}` : `s-${sections.length}`;
    sections.push({ id, title, body });
  }

  if (!sections.length) {
    sections.push({ id: "full", title: "Contenido", body: md.trim() });
  }

  return sections;
}

/** Recuadros 📌 (trampas / near-miss) */
export function extractTrampas(md: string): FichaTrampa[] {
  const trampas: FichaTrampa[] = [];
  const re = /(?:^|\n)(?:>\s*)?(?:_\s*)?(📌[\s\S]*?)(?:_\s*)?(?=\n(?:\*\*\d|$|📌|#|\|---)|$)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(md)) !== null) {
    const text = m[1]
      .replace(/^>\s?/gm, "")
      .replace(/^_+|_+$/g, "")
      .replace(/\*+/g, "")
      .trim();
    if (text.length > 8) {
      trampas.push({ id: `t-${i++}`, text });
    }
  }
  return trampas;
}

/** Intenta emparejar un banco con un tema de ficha */
export function guessTemaFromBancoNombre(
  bancoNombre: string,
  fichas: { tema_numero: number }[],
): number | null {
  const direct = bancoNombre.match(/\btema\s*(\d+)\b/i);
  if (direct) {
    const n = parseInt(direct[1], 10);
    if (fichas.some((f) => f.tema_numero === n)) return n;
  }

  const leading = bancoNombre.match(/^(\d+)[\s._-]/);
  if (leading) {
    const n = parseInt(leading[1], 10);
    if (fichas.some((f) => f.tema_numero === n)) return n;
  }

  if (fichas.length === 1) return fichas[0].tema_numero;
  return null;
}
