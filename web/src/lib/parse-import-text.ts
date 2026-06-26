export type ParsedQuestion = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
  explicacion?: string;
};

export type ImportTextAnalysis = {
  parsedCount: number;
  estimatedBlocks: number;
  blocksWithoutAnswer: number;
  blocksWithoutOptions: number;
  warnings: string[];
};

const OPTION_RE = /^([A-Da-d])[\.\)\]:\-]\s*(.+)$/;
const ANSWER_RE =
  /^(?:Respuesta|R|Soluci[oó]n|Correcta|Clave)\s*:?\s*([A-Da-d])\s*$/i;
const EXPLAIN_RE = /^(?:Explicaci[oó]n|E)\s*:?\s*(.+)$/i;
const NUMBERED_HEAD_RE = /^\d+[\.\)]\s+/;
const P_HEAD_RE = /^P:\s*/i;
const QUESTION_NUMBER_RE = /^(\d+)[\.\)]\s+/;
const KEY_ENTRY_RE = /^\s*(\d+)\s*[\.\)]\s*\(?\s*([A-Da-d])\s*\)?(?:\D.*)?$/;

function normalizeText(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/([^\n])\s+([A-Da-d][\.\)\]:\-]\s+)/g, "$1\n$2")
    .replace(/([^\n])\s+((?:Respuesta|R|Soluci[oó]n|Correcta|Clave|Explicaci[oó]n|E)\s*:)/gi, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanPdfImportText(texto: string): string {
  return normalizeText(texto);
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

function extractAnswerKeyMap(texto: string): Map<number, number> {
  const map = new Map<number, number>();
  const lines = texto.split("\n");
  const claveIndex = lines.findIndex((l) => /\bclave\b/i.test(l));
  if (claveIndex < 0) return map;

  for (let i = claveIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const m = line.match(KEY_ENTRY_RE);
    if (!m) continue;

    const qNum = Number(m[1]);
    if (!Number.isFinite(qNum) || qNum <= 0) continue;
    const answerIdx = m[2].toUpperCase().charCodeAt(0) - 65;
    if (answerIdx < 0 || answerIdx > 3) continue;

    map.set(qNum, answerIdx);
  }

  return map;
}

function parseNumberedBlocks(texto: string): ParsedQuestion[] {
  const blocks = splitQuestionBlocks(texto);
  const keyAnswers = extractAnswerKeyMap(texto);

  const preguntas: ParsedQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const numMatch = lines[0].match(QUESTION_NUMBER_RE);
    const qNum = numMatch ? Number(numMatch[1]) : undefined;

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

    if (respuesta < 0 && qNum !== undefined && keyAnswers.has(qNum)) {
      respuesta = keyAnswers.get(qNum) ?? -1;
    }

    if (opciones.length >= 2 && respuesta >= 0 && respuesta < opciones.length) {
      preguntas.push({ enunciado: head, opciones, respuesta, explicacion });
    }
  }

  return preguntas;
}

function splitQuestionBlocks(texto: string): string[] {
  return texto
    .split(/\n(?=\d+[\.\)]\s+|P:\s)/i)
    .map((b) => b.trim())
    .filter(Boolean);
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

export function analyzeImportText(texto: string): ImportTextAnalysis {
  const normalized = normalizeText(texto);
  if (!normalized) {
    return {
      parsedCount: 0,
      estimatedBlocks: 0,
      blocksWithoutAnswer: 0,
      blocksWithoutOptions: 0,
      warnings: [],
    };
  }

  const parsed = parseImportText(normalized);
  const blocks = splitQuestionBlocks(normalized);

  let blocksWithoutAnswer = 0;
  let blocksWithoutOptions = 0;

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const hasAnswer = lines.some((l) => ANSWER_RE.test(l));
    const optionsCount = lines.filter((l) => OPTION_RE.test(l)).length;
    if (!hasAnswer) blocksWithoutAnswer++;
    if (optionsCount < 2) blocksWithoutOptions++;
  }

  const warnings: string[] = [];
  if (parsed.length === 0) {
    warnings.push("No se detectan preguntas válidas con el formato actual.");
  }
  if (blocksWithoutAnswer > 0) {
    warnings.push(
      `${blocksWithoutAnswer} bloque${blocksWithoutAnswer !== 1 ? "s" : ""} sin línea de respuesta (Respuesta: X o R: X).`,
    );
  }
  if (blocksWithoutOptions > 0) {
    warnings.push(
      `${blocksWithoutOptions} bloque${blocksWithoutOptions !== 1 ? "s" : ""} con menos de 2 opciones detectadas.`,
    );
  }

  return {
    parsedCount: parsed.length,
    estimatedBlocks: blocks.length,
    blocksWithoutAnswer,
    blocksWithoutOptions,
    warnings,
  };
}
