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
const EMPTY_OPTION_RE = /^([A-Da-d])[\.\)\]:\-]\s*$/;
const EXPLAIN_RE = /^(?:Explicaci[oó]n|E)\s*:\s*(.+)$/i;
const INLINE_OPTION_SPLIT_RE = /\s+(?=[A-D][\.\)]\s)/;
const NUMBERED_HEAD_RE = /^\d+[\.\)]\s+/;
const P_HEAD_RE = /^P:\s*/i;
const NUMBERED_QUESTION_START_RE = /^\s*\d+[\.\)]\s+/;
const SUPUESTO_START_RE =
  /^\s*={3,}\s*SUPUESTO\s*:?\s*(?<titulo>.*?)\s*={0,}\s*$/i;
const SUPUESTO_END_RE = /^\s*={3,}\s*(FIN(\s+SUPUESTO)?)?\s*={0,}\s*$/i;

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
  const trimmed = lineTrim(line);
  if (isSupuestoStart(line)) return false;
  return SUPUESTO_END_RE.test(trimmed);
}

function isSupuestoMarkerLine(line: string): boolean {
  return isSupuestoStart(line) || isSupuestoEnd(line);
}

/** Detecta si el texto incluye un bloque === SUPUESTO === (tras normalización). */
export function hasSupuestoMarker(texto: string): boolean {
  const normalized = normalizeText(texto);
  if (!normalized) return false;
  return normalized.split("\n").some((line) => isSupuestoStart(line));
}

function normalizeText(texto: string): string {
  return texto
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\uFF1D\uFE66\u207C]/g, "=")
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

/** Pregunta detectada pero no importable. */
export type ImportRejection = {
  /** Número del enunciado (`1.` / `2.`) si existe. */
  numero?: number;
  /** Resumen del enunciado para localizarla en el texto. */
  enunciado: string;
  motivo: string;
  /** Línea (1-based) del bloque rechazado en el texto original. */
  linea?: number;
  /** Primera línea literal del bloque rechazado. */
  primeraLinea?: string;
};

export type ImportDiagnostics = {
  validas: number;
  numeradas: number;
  rechazadas: ImportRejection[];
  avisos?: string[];
};

type ScanResult = {
  doc: ParsedImportDocument;
  avisos: string[];
  diagnosticTexts: string[];
  diagnosticLineOffsets: number[];
};

function extractQuestionNumber(line: string): number | undefined {
  const m = line.match(/^(\d+)[\.\)]\s+/);
  return m ? parseInt(m[1], 10) : undefined;
}

function blockStartLine(texto: string, block: string, baseLine: number): number {
  const idx = texto.indexOf(block);
  if (idx < 0) return baseLine;
  return baseLine + texto.slice(0, idx).split("\n").length - 1;
}

function parseBlockLines(lines: string[]): {
  enunciado: string;
  opciones: string[];
  opcionesVacias: string[];
  respuesta: number;
} {
  const opciones: string[] = [];
  const opcionesVacias: string[] = [];
  let respuesta = -1;

  for (const line of lines) {
    const ans = parseAnswerLine(line);
    if (ans) {
      respuesta = ans.respuesta;
      continue;
    }
    if (EXPLAIN_RE.test(line)) continue;
    if (EMPTY_OPTION_RE.test(line)) {
      const m = line.match(EMPTY_OPTION_RE);
      if (m) opcionesVacias.push(m[1].toUpperCase());
      continue;
    }
    const opt = line.match(OPTION_RE);
    if (opt) {
      const text = opt[2].trim();
      if (text) opciones.push(text);
      else opcionesVacias.push(opt[1].toUpperCase());
    }
  }

  return { enunciado: "", opciones, opcionesVacias, respuesta };
}

function describeRejection(
  enunciado: string,
  opciones: string[],
  opcionesVacias: string[],
  respuesta: number,
): string | null {
  if (!enunciado) return "Sin enunciado";
  if (opcionesVacias.length) {
    return opcionesVacias.length === 1
      ? `Opción vacía: ${opcionesVacias[0]}`
      : `Opciones vacías: ${opcionesVacias.join(", ")}`;
  }
  if (opciones.length === 0) return "Sin opciones con texto (A-D)";
  if (opciones.length < 2) return `Solo ${opciones.length} opción con texto (se necesitan al menos 2)`;
  if (respuesta < 0) return "Falta línea Respuesta: A-D";
  if (respuesta >= opciones.length) return "Respuesta inválida (letra incorrecta o fuera de rango)";
  return null;
}

function diagnoseNumberedBlocks(texto: string, baseLine = 1): ImportRejection[] {
  const blocks = texto
    .split(/\n(?=\d+[\.\)]\s+|P:\s)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const rechazadas: ImportRejection[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    if (isSupuestoMarkerLine(lines[0])) continue;

    const numero = extractQuestionNumber(lines[0]);
    const head = lines[0]
      .replace(NUMBERED_HEAD_RE, "")
      .replace(P_HEAD_RE, "")
      .trim();
    if (!head || isIntroLine(head)) continue;

    const parsed = parseBlockLines(lines.slice(1));
    parsed.enunciado = head;

    const motivo = describeRejection(
      parsed.enunciado,
      parsed.opciones,
      parsed.opcionesVacias,
      parsed.respuesta,
    );
    if (motivo) {
      rechazadas.push({
        numero,
        enunciado: head.slice(0, 90),
        motivo,
        linea: blockStartLine(texto, block, baseLine),
        primeraLinea: block.split("\n")[0],
      });
    }
  }

  return rechazadas;
}

function diagnoseOptionBlocks(texto: string, baseLine = 1): ImportRejection[] {
  const rechazadas: ImportRejection[] = [];
  const lines = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && (isIntroLine(lines[i]) || parseAnswerLine(lines[i]))) {
      i++;
    }
    if (i >= lines.length) break;

    const blockStartIdx = i;
    const enunciadoParts: string[] = [];
    while (i < lines.length && !OPTION_RE.test(lines[i]) && !EMPTY_OPTION_RE.test(lines[i])) {
      if (parseAnswerLine(lines[i]) || EXPLAIN_RE.test(lines[i])) break;
      if (!isIntroLine(lines[i])) enunciadoParts.push(lines[i]);
      i++;
    }

    const bodyLines: string[] = [];
    while (i < lines.length && (OPTION_RE.test(lines[i]) || EMPTY_OPTION_RE.test(lines[i]))) {
      bodyLines.push(lines[i]);
      i++;
    }

    const answerLine = i < lines.length && parseAnswerLine(lines[i]) ? lines[i] : null;
    if (answerLine) {
      bodyLines.push(answerLine);
      i++;
    }
    if (i < lines.length && EXPLAIN_RE.test(lines[i])) i++;

    if (!enunciadoParts.length && !bodyLines.length) continue;

    const enunciado = enunciadoParts.join(" ").trim();
    const parsed = parseBlockLines(bodyLines);
    parsed.enunciado = enunciado;

    const motivo = describeRejection(
      parsed.enunciado,
      parsed.opciones,
      parsed.opcionesVacias,
      parsed.respuesta,
    );
    if (motivo && enunciado && !isSupuestoMarkerLine(enunciadoParts[0] ?? enunciado)) {
      const primeraLinea = enunciadoParts[0] ?? bodyLines[0] ?? "";
      rechazadas.push({
        enunciado: enunciado.slice(0, 90),
        motivo,
        linea: baseLine + blockStartIdx,
        primeraLinea,
      });
    }
  }

  return rechazadas;
}

function scanImportText(texto: string): ScanResult {
  const normalized = normalizeText(texto);
  if (!normalized) {
    return {
      doc: { sueltas: [], supuestos: [] },
      avisos: [],
      diagnosticTexts: [],
      diagnosticLineOffsets: [],
    };
  }

  const lines = normalized.split("\n");
  if (!lines.some((l) => isSupuestoStart(l))) {
    return {
      doc: { sueltas: parseQuestionsFromText(normalized), supuestos: [] },
      avisos: [],
      diagnosticTexts: [normalized],
      diagnosticLineOffsets: [1],
    };
  }

  const sueltas: ParsedQuestion[] = [];
  const supuestos: ParsedSupuesto[] = [];
  const avisos: string[] = [];
  const diagnosticTexts: string[] = [];
  const diagnosticLineOffsets: number[] = [];
  let i = 0;

  function pushDiagnosticChunk(chunkLines: string[], startIndex: number) {
    const text = chunkLines.join("\n").trim();
    if (!text) return;
    diagnosticTexts.push(text);
    diagnosticLineOffsets.push(startIndex + 1);
    sueltas.push(...parseQuestionsFromText(text));
  }

  while (i < lines.length) {
    if (isSupuestoStart(lines[i])) {
      const startMatch = lineTrim(lines[i]).match(SUPUESTO_START_RE);
      const titulo = startMatch?.groups?.titulo?.trim() || undefined;
      i++;

      const textoLines: string[] = [];
      let closed = false;

      while (i < lines.length) {
        if (isSupuestoEnd(lines[i])) {
          closed = true;
          i++;
          break;
        }
        if (NUMBERED_QUESTION_START_RE.test(lines[i])) {
          if (!closed) avisos.push("supuesto sin cierre");
          break;
        }
        textoLines.push(lines[i]);
        i++;
      }

      const questionStart = i;
      const questionLines: string[] = [];
      while (i < lines.length && !isSupuestoStart(lines[i])) {
        questionLines.push(lines[i]);
        i++;
      }

      const questionText = questionLines.join("\n");
      if (questionText.trim()) {
        diagnosticTexts.push(questionText);
        diagnosticLineOffsets.push(questionStart + 1);
      }

      const preguntas = parseQuestionsFromText(questionText);
      const textoSupuesto = textoLines.join("\n").trim();

      if (textoSupuesto && preguntas.length > 0) {
        supuestos.push({ titulo, texto: textoSupuesto, preguntas });
      } else if (preguntas.length > 0) {
        sueltas.push(...preguntas);
      }
      continue;
    }

    const freeStart = i;
    const freeLines: string[] = [];
    while (i < lines.length && !isSupuestoStart(lines[i])) {
      freeLines.push(lines[i]);
      i++;
    }
    pushDiagnosticChunk(freeLines, freeStart);
  }

  return {
    doc: { sueltas, supuestos },
    avisos,
    diagnosticTexts,
    diagnosticLineOffsets,
  };
}

/** Detecta preguntas en el texto que no pasan validación de importación. */
export function getImportDiagnostics(texto: string): ImportDiagnostics {
  const { doc, avisos, diagnosticTexts, diagnosticLineOffsets } = scanImportText(texto);
  const validas = countParsedQuestions(doc);

  let numeradas = 0;
  let rechazadas: ImportRejection[] = [];

  for (let idx = 0; idx < diagnosticTexts.length; idx++) {
    const chunk = diagnosticTexts[idx];
    const baseLine = diagnosticLineOffsets[idx] ?? 1;
    const chunkNumeradas = countQuestionHeaders(chunk);
    numeradas += chunkNumeradas;

    if (chunkNumeradas > 0) {
      rechazadas.push(...diagnoseNumberedBlocks(chunk, baseLine));
    } else {
      rechazadas.push(...diagnoseOptionBlocks(chunk, baseLine));
    }
  }

  if (numeradas > 0) {
    rechazadas = rechazadas.sort(
      (a, b) => (a.numero ?? 9999) - (b.numero ?? 9999),
    );
  }

  return {
    validas,
    numeradas,
    rechazadas,
    avisos: avisos.length ? avisos : undefined,
  };
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
  return scanImportText(texto).doc;
}

/** Lista plana de preguntas (útil para vista previa rápida). */
export function parseImportText(texto: string): ParsedQuestion[] {
  const doc = parseImportDocument(texto);
  return [
    ...doc.sueltas,
    ...doc.supuestos.flatMap((s) => s.preguntas),
  ];
}
