export type ParsedQuestion = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string;
};

const OPTION_RE = /^([A-Da-d])[\.\)\]:\-]\s*(.+)$/;
const ANSWER_RE =
  /^(?:Respuesta|R|Soluci[oó]n|Correcta|Clave)\s*:?\s*([A-Da-d])\s*$/i;
const EXPLAIN_RE = /^(?:Explicaci[oó]n|E)\s*:?\s*(.+)$/i;
const NUMBERED_HEAD_RE = /^\d+[\.\)]\s+/;
const P_HEAD_RE = /^P:\s*/i;

function normalizeText(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .trim();
}

function isIntroLine(line: string): boolean {
  const l = line.toLowerCase();
  return (
    l.includes("aquí tienes") ||
    l.includes("aqui tienes") ||
    l.includes("archivo unificado") ||
    l.includes("formato solicitado") ||
    l.startsWith("—") ||
    l.startsWith("--") ||
    l === "o" ||
    l === "— o —"
  );
}

function parseNumberedBlocks(texto: string): ParsedQuestion[] {
  const blocks = texto
    .split(/\n(?=\d+[\.\)]\s+|P:\s)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const preguntas: ParsedQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const head = lines[0]
      .replace(NUMBERED_HEAD_RE, "")
      .replace(P_HEAD_RE, "")
      .trim();
    if (!head || isIntroLine(head)) continue;

    const opciones: string[] = [];
    let respuesta = -1;
    let explicacion: string | undefined;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const ans = line.match(ANSWER_RE);
      if (ans) {
        respuesta = ans[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }
      const expl = line.match(EXPLAIN_RE);
      if (expl) {
        explicacion = expl[1].trim();
        continue;
      }
      const opt = line.match(OPTION_RE);
      if (opt) opciones.push(opt[2].trim());
    }

    if (opciones.length >= 2 && respuesta >= 0 && respuesta < opciones.length) {
      preguntas.push({ enunciado: head, opciones, respuesta, explicacion });
    }
  }

  return preguntas;
}

/** Formato PDF/IA: enunciado(s) + A) B) C) D) + Respuesta: X (sin numerar) */
function parseOptionBlocks(texto: string): ParsedQuestion[] {
  const preguntas: ParsedQuestion[] = [];
  const lines = texto.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && (isIntroLine(lines[i]) || ANSWER_RE.test(lines[i]))) {
      i++;
    }
    if (i >= lines.length) break;

    const enunciadoParts: string[] = [];
    while (i < lines.length && !OPTION_RE.test(lines[i])) {
      if (ANSWER_RE.test(lines[i]) || EXPLAIN_RE.test(lines[i])) break;
      if (!isIntroLine(lines[i])) enunciadoParts.push(lines[i]);
      i++;
    }

    const opciones: string[] = [];
    while (i < lines.length && OPTION_RE.test(lines[i])) {
      const m = lines[i].match(OPTION_RE);
      if (m) opciones.push(m[2].trim());
      i++;
    }

    let respuesta = -1;
    let explicacion: string | undefined;
    if (i < lines.length && ANSWER_RE.test(lines[i])) {
      const m = lines[i].match(ANSWER_RE);
      if (m) respuesta = m[1].toUpperCase().charCodeAt(0) - 65;
      i++;
    }
    if (i < lines.length && EXPLAIN_RE.test(lines[i])) {
      const m = lines[i].match(EXPLAIN_RE);
      if (m) explicacion = m[1].trim();
      i++;
    }

    const enunciado = enunciadoParts.join(" ").trim();
    if (
      enunciado &&
      opciones.length >= 2 &&
      respuesta >= 0 &&
      respuesta < opciones.length
    ) {
      preguntas.push({ enunciado, opciones, respuesta, explicacion });
    } else if (enunciadoParts.length && opciones.length === 0) {
      // Líneas sueltas sin opciones: seguir buscando
      continue;
    }
  }

  return preguntas;
}

export function parseImportText(texto: string): ParsedQuestion[] {
  const normalized = normalizeText(texto);
  if (!normalized) return [];

  const numbered = parseNumberedBlocks(normalized);
  const optionStyle = parseOptionBlocks(normalized);

  if (numbered.length >= optionStyle.length) return numbered;
  return optionStyle;
}
