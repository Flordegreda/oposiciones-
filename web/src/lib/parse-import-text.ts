export type ParsedQuestion = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string;
};

export type ParsedSupuesto = {
  titulo?: string;
  texto: string;
  preguntas: ParsedQuestion[];
};

export type ParsedImportDocument = {
  sueltas: ParsedQuestion[];
  supuestos: ParsedSupuesto[];
};

export type ImportContext = {
  tipo?: "teorico" | "practico";
  nombre?: string;
  encadenado?: boolean;
};

const OPTION_RE = /^([A-Da-d])[\.\)\]:\-]\s*(.+)$/;
const EXPLAIN_RE = /^(?:Explicaci[oó]n|E)\s*:\s*(.+)$/i;
const INLINE_OPTION_SPLIT_RE = /\s+(?=[A-D][\.\)]\s)/;
const NUMBERED_HEAD_RE = /^\d+[\.\)]\s+/;
const P_HEAD_RE = /^P:\s*/i;
const SUPUESTO_START_RE = /^={3}\s*SUPUESTO(?:\s*:\s*(.*))?\s*$/i;
const SUPUESTO_END_RE = /^={3}\s*$/;

/** Acepta `Respuesta: B`, `Respuesta: B.`, `(B)`, `**Respuesta:** B`, etc. */
function parseAnswerLine(line: string): { respuesta: number; explicacion?: string } | null {
  const cleaned = line.trim().replace(/\*\*/g, "");
  const m = cleaned.match(
    /^(?:Respuesta|R|Soluci[oó]n|Correcta|Clave)\s*:+\s*(?:\(?([A-Da-d])\)?)[\.\)]?\s*(.*)$/i,
  );
  if (!m) return null;

  const respuesta = m[1].toUpperCase().charCodeAt(0) - 65;
  if (respuesta < 0 || respuesta > 3) return null;

  let explicacion: string | undefined;
  const tail = m[2]?.trim();
  if (tail) {
    const expl = tail.match(/^(?:Explicaci[oó]n|E)\s*:\s*(.+)$/i);
    if (expl) explicacion = expl[1].trim();
  }

  return { respuesta, explicacion };
}

const INLINE_ANSWER_RE =
  /(?:Respuesta|R|Soluci[oó]n|Correcta|Clave)\s*:+\s*(?:\(?([A-Da-d])\)?)[\.\)]?(?:\s+(?:Explicaci[oó]n|E)\s*:\s*(.+))?/i;

function lineTrim(line: string): string {
  return line.trim();
}

function isSupuestoStart(line: string): boolean {
  return SUPUESTO_START_RE.test(lineTrim(line));
}

function isSupuestoEnd(line: string): boolean {
  return SUPUESTO_END_RE.test(lineTrim(line));
}

function normalizeText(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    // Preguntas pegadas en la misma línea (p. ej. «…Respuesta: B 50. Siguiente…»).
    // No partir fechas (2024.) ni «artículo 10.» cuando la línea siguiente es D).
    .replace(/[ \t]+(?=\d{1,3}[\.\)]\s+(?![A-D][\.\)]\s))/g, "\n")
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
      const ans = parseAnswerLine(line);
      if (ans) {
        respuesta = ans.respuesta;
        if (ans.explicacion) explicacion = ans.explicacion;
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

/** Formato inline: `1. enunciado A) … B) … C) … D) … Respuesta: A` (una línea o varias pegadas). */
function parseInlineNumberedBlocks(texto: string): ParsedQuestion[] {
  const blocks = texto
    .split(/\n(?=\d+[\.\)]\s+)/)
    .map((b) => b.trim())
    .filter(Boolean);

  const preguntas: ParsedQuestion[] = [];

  for (const block of blocks) {
    const line = block.replace(/\s*\n\s*/g, " ").trim();
    const numMatch = line.match(/^\d+[\.\)]\s+([\s\S]+)$/);
    if (!numMatch) continue;

    let content = numMatch[1];
    if (isIntroLine(content)) continue;

    content = content.replace(/\*\*/g, "");
    const ansMatch = content.match(INLINE_ANSWER_RE);
    if (!ansMatch) continue;

    const respuesta = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
    const explicacion = ansMatch[2]?.trim();
    content = content.slice(0, ansMatch.index).trim();

    const parts = content.split(INLINE_OPTION_SPLIT_RE);
    if (parts.length < 2) continue;

    const enunciado = parts[0].trim();
    const opciones: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      const optMatch = parts[i].match(/^([A-D])[\.\)]\s*(.+)$/i);
      if (optMatch) opciones.push(optMatch[2].trim());
    }

    if (
      enunciado &&
      opciones.length >= 2 &&
      respuesta >= 0 &&
      respuesta < opciones.length
    ) {
      preguntas.push({ enunciado, opciones, respuesta, explicacion });
    }
  }

  return preguntas;
}

function parseOptionBlocks(texto: string): ParsedQuestion[] {
  const preguntas: ParsedQuestion[] = [];
  const lines = texto.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && (isIntroLine(lines[i]) || parseAnswerLine(lines[i]))) {
      i++;
    }
    if (i >= lines.length) break;

    const enunciadoParts: string[] = [];
    while (i < lines.length && !OPTION_RE.test(lines[i])) {
      if (parseAnswerLine(lines[i]) || EXPLAIN_RE.test(lines[i])) break;
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
    if (i < lines.length) {
      const ans = parseAnswerLine(lines[i]);
      if (ans) {
        respuesta = ans.respuesta;
        if (ans.explicacion) explicacion = ans.explicacion;
        i++;
      }
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
      continue;
    }
  }

  return preguntas;
}

function parseQuestionsFromText(texto: string): ParsedQuestion[] {
  const normalized = normalizeText(texto);
  if (!normalized) return [];

  const candidates = [
    parseNumberedBlocks(normalized),
    parseOptionBlocks(normalized),
    parseInlineNumberedBlocks(normalized),
  ];

  return candidates.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

export function countParsedQuestions(doc: ParsedImportDocument): number {
  return (
    doc.sueltas.length + doc.supuestos.reduce((n, s) => n + s.preguntas.length, 0)
  );
}

/** Cuenta líneas que parecen inicio de pregunta (`1.` / `P:`). */
export function countQuestionHeaders(texto: string): number {
  const normalized = normalizeText(texto);
  if (!normalized) return 0;

  let count = 0;
  for (const line of normalized.split("\n")) {
    const t = line.trim();
    if (/^\d+[\.\)]\s+/.test(t) || /^P:\s/i.test(t)) count++;
  }
  return count;
}

/** Texto antes de la primera pregunta numerada (1. / P:). */
export function splitPreambleAndQuestions(texto: string): { preamble: string; body: string } {
  const normalized = normalizeText(texto);
  if (!normalized) return { preamble: "", body: "" };

  const lines = normalized.split("\n");
  let splitAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\d+[\.\)]\s+/.test(lines[i]) || /^P:\s/i.test(lines[i])) {
      splitAt = i;
      break;
    }
  }

  if (splitAt <= 0) return { preamble: "", body: normalized };
  return {
    preamble: lines.slice(0, splitAt).join("\n").trim(),
    body: lines.slice(splitAt).join("\n"),
  };
}

/** Si no hay bloques === SUPUESTO ===, usa el texto previo a la 1. pregunta como supuesto. */
export function parseImportDocumentWithPreamble(
  texto: string,
  opts?: { titulo?: string },
): ParsedImportDocument {
  const doc = parseImportDocument(texto);
  if (doc.supuestos.length) return doc;

  const { preamble, body } = splitPreambleAndQuestions(texto);
  if (!preamble || !body.trim()) return doc;

  const preguntas = parseQuestionsFromText(body);
  if (!preguntas.length) return doc;

  return {
    sueltas: [],
    supuestos: [{ titulo: opts?.titulo, texto: preamble, preguntas }],
  };
}

/** Parser de importación según si el banco es supuesto encadenado. */
export function parseImportForContext(
  texto: string,
  ctx?: ImportContext,
): ParsedImportDocument {
  const doc = parseImportDocument(texto);
  if (doc.supuestos.length || !ctx?.encadenado) return doc;
  return doc;
}

export function parseImportDocument(texto: string): ParsedImportDocument {
  const normalized = normalizeText(texto);
  if (!normalized) return { sueltas: [], supuestos: [] };

  const lines = normalized.split("\n");
  if (!lines.some((l) => isSupuestoStart(l))) {
    return { sueltas: parseQuestionsFromText(normalized), supuestos: [] };
  }

  const sueltas: ParsedQuestion[] = [];
  const supuestos: ParsedSupuesto[] = [];
  const preamble: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lineTrim(lines[i]);
    const startMatch = line.match(SUPUESTO_START_RE);
    if (!startMatch) {
      preamble.push(lines[i]);
      i++;
      continue;
    }

    if (preamble.length) {
      const text = preamble.join("\n").trim();
      if (text) sueltas.push(...parseQuestionsFromText(text));
      preamble.length = 0;
    }

    const titulo = startMatch[1]?.trim() || undefined;
    i++;

    const textoLines: string[] = [];
    while (i < lines.length && !isSupuestoEnd(lines[i])) {
      textoLines.push(lines[i]);
      i++;
    }
    if (i < lines.length) i++;

    const questionLines: string[] = [];
    while (i < lines.length && !isSupuestoStart(lines[i])) {
      questionLines.push(lines[i]);
      i++;
    }

    const textoSupuesto = textoLines.join("\n").trim();
    const preguntas = parseQuestionsFromText(questionLines.join("\n"));

    if (textoSupuesto && preguntas.length > 0) {
      supuestos.push({ titulo, texto: textoSupuesto, preguntas });
    } else if (preguntas.length > 0) {
      sueltas.push(...preguntas);
    }
  }

  if (preamble.length) {
    const text = preamble.join("\n").trim();
    if (text) sueltas.push(...parseQuestionsFromText(text));
  }

  return { sueltas, supuestos };
}

/** Lista plana de preguntas (útil para vista previa rápida). */
export function parseImportText(texto: string): ParsedQuestion[] {
  const doc = parseImportDocument(texto);
  return [
    ...doc.sueltas,
    ...doc.supuestos.flatMap((s) => s.preguntas),
  ];
}
