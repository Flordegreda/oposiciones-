export type ParsedFicha = {
  frente: string;
  dorso: string;
};

export type FichaRejection = {
  /** Índice del bloque en el texto (1-based). */
  numero?: number;
  enunciado: string;
  motivo: string;
};

export type FichasDiagnostics = {
  validas: number;
  /** Bloques separados por línea en blanco o --- */
  bloques: number;
  /** Líneas que empiezan por P:/Q:/Pregunta: */
  marcadas: number;
  rechazadas: FichaRejection[];
};

function normalizeFichasText(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function splitFichaBlocks(raw: string): string[] {
  return raw
    .split(/\n(?:---+\s*\n)+|\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function countFichaMarkers(raw: string): number {
  let count = 0;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (/^(?:P|Q|Pregunta)\s*:/i.test(t)) count++;
  }
  return count;
}

type BlockParseResult =
  | { ok: true; ficha: ParsedFicha }
  | { ok: false; motivo: string; snippet: string };

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
function parseFichaBlock(block: string): BlockParseResult {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    return { ok: false, motivo: "Bloque vacío", snippet: "" };
  }

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
      if (frente && dorso) return { ok: true, ficha: { frente, dorso } };
      if (!frente && !dorso) {
        return { ok: false, motivo: "Separador :: o tab sin texto", snippet: line.slice(0, 90) };
      }
      return {
        ok: false,
        motivo: frente ? "Dorso vacío" : "Frente vacío",
        snippet: (frente || dorso).slice(0, 90),
      };
    }
    return {
      ok: false,
      motivo: "Una sola línea sin P:/R: ni separador ::",
      snippet: line.slice(0, 90),
    };
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

  if (frente && dorso) return { ok: true, ficha: { frente, dorso } };
  if (frente && !dorso) {
    return { ok: false, motivo: "Falta R:/A: (respuesta)", snippet: frente.slice(0, 90) };
  }
  if (!frente && dorso) {
    return { ok: false, motivo: "Falta P:/Q: (pregunta)", snippet: dorso.slice(0, 90) };
  }
  return {
    ok: false,
    motivo: "Sin P: y R: reconocibles",
    snippet: lines[0].slice(0, 90),
  };
}

export function parseFichasText(texto: string): ParsedFicha[] {
  const raw = normalizeFichasText(texto);
  if (!raw) return [];

  const out: ParsedFicha[] = [];
  for (const block of splitFichaBlocks(raw)) {
    const parsed = parseFichaBlock(block);
    if (parsed.ok) out.push(parsed.ficha);
  }
  return out;
}

/** Detecta fichas en el texto que no pasan validación de importación. */
export function getFichasDiagnostics(texto: string): FichasDiagnostics {
  const raw = normalizeFichasText(texto);
  if (!raw) {
    return { validas: 0, bloques: 0, marcadas: 0, rechazadas: [] };
  }

  const blocks = splitFichaBlocks(raw);
  const rechazadas: FichaRejection[] = [];
  let validas = 0;

  for (let i = 0; i < blocks.length; i++) {
    const parsed = parseFichaBlock(blocks[i]);
    if (parsed.ok) {
      validas++;
      continue;
    }
    rechazadas.push({
      numero: i + 1,
      enunciado: parsed.snippet,
      motivo: parsed.motivo,
    });
  }

  return {
    validas,
    bloques: blocks.length,
    marcadas: countFichaMarkers(raw),
    rechazadas,
  };
}
