export type ParsedFicha = {
  frente: string;
  dorso: string;
};

/**
 * Formatos admitidos (mezclables):
 *
 * P: ¿pregunta?
 * R: respuesta
 *
 * Q: pregunta
 * A: answer
 *
 * 1. Pregunta
 * Respuesta: texto
 *
 * frente :: dorso   (una línea, separador ::)
 * frente<TAB>dorso
 *
 * Bloques separados por línea en blanco o ---
 */
export function parseFichasText(texto: string): ParsedFicha[] {
  const raw = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!raw) return [];

  const blocks = raw
    .split(/\n(?:---+\s*\n)+|\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out: ParsedFicha[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Una sola línea: frente :: dorso  o  frente\tdorso
    if (lines.length === 1) {
      const line = lines[0];
      const sep = line.includes("\t")
        ? "\t"
        : line.includes("::")
          ? "::"
          : null;
      if (sep) {
        const i = line.indexOf(sep);
        const frente = line.slice(0, i).trim();
        const dorso = line.slice(i + sep.length).trim();
        if (frente && dorso) out.push({ frente, dorso });
      }
      continue;
    }

    let frente = "";
    let dorso = "";
    let mode: "none" | "frente" | "dorso" = "none";

    for (const line of lines) {
      const p = line.match(/^(?:P|Q|Pregunta)\s*:\s*(.+)$/i);
      if (p) {
        frente = p[1].trim();
        mode = "frente";
        continue;
      }
      const r = line.match(/^(?:R|A|Respuesta|Respuesta correcta)\s*:\s*(.+)$/i);
      if (r) {
        dorso = r[1].trim();
        mode = "dorso";
        continue;
      }
      const numbered = line.match(/^\d+[\.\)]\s+(.+)$/);
      if (numbered && !frente) {
        frente = numbered[1].trim();
        mode = "frente";
        continue;
      }
      if (mode === "frente") {
        frente = `${frente} ${line}`.trim();
      } else if (mode === "dorso") {
        dorso = `${dorso} ${line}`.trim();
      } else if (!frente) {
        frente = line;
        mode = "frente";
      } else if (!dorso) {
        dorso = line;
        mode = "dorso";
      } else {
        dorso = `${dorso} ${line}`.trim();
      }
    }

    if (frente && dorso) out.push({ frente, dorso });
  }

  return out;
}
