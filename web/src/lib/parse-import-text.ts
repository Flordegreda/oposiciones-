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
  /** Texto del caso (campo separado en admin). */
  supuestoTexto?: string;
};

const OPTION_RE = /^([A-Da-d])[\.\)\]:\-]\s*(.+)$/;
const EMPTY_OPTION_RE = /^([A-Da-d])[\.\)\]:\-]\s*$/;
const EXPLAIN_RE = /^(?:Explicaci[oó]n|E)\s*:\s*(.+)$/i;
const INLINE_OPTION_SPLIT_RE = /\s+(?=[A-D][\.\)]\s)/;
const NUMBERED_HEAD_RE = /^\d+[\.\)]\s+/;
const P_HEAD_RE = /^P:\s*/i;

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

function normalizeText(texto: string): string {
  return texto
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\uFF1D\uFE66\u207C]/g, "=")
    .replace(/[\uFF08\uFF09]/g, (c) => (c === "\uFF08" ? "(" : ")"))
    .replace(/\uFF1A/g, ":")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/[ \t]+(?=\d{1,3}[\.\)]\s+(?![A-D][\.\)]\s))/g, "\n")
    .trim();
}

/** Normaliza unicode y quita basura final (VALIDACIÓN, markdown). */
export function prepareImportText(texto: string): string {
  const text = normalizeText(texto);
  if (!text) return text;

  const out = text.split("\n");
  while (out.length > 0) {
    const t = out[out.length - 1].trim();
    if (!t) {
      out.pop();
      continue;
    }
    if (/^VALIDACIÓN:/i.test(t) || /^validacion:/i.test(t) || /^---+/.test(t) || /^#+\s/.test(t)) {
      out.pop();
      continue;
    }
    break;
  }

  return out.join("\n").trim();
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

export type ImportRejection = {
  numero?: number;
  enunciado: string;
  motivo: string;
  linea?: number;
  primeraLinea?: string;
};

export type ImportDiagnostics = {
  validas: number;
  numeradas: number;
  rechazadas: ImportRejection[];
  avisos?: string[];
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
    if (motivo && enunciado) {
      rechazadas.push({
        enunciado: enunciado.slice(0, 90),
        motivo,
        linea: baseLine + blockStartIdx,
        primeraLinea: enunciadoParts[0] ?? bodyLines[0] ?? "",
      });
    }
  }

  return rechazadas;
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
    }
  }

  return preguntas;
}

function parseQuestionsFromText(texto: string): ParsedQuestion[] {
  const normalized = prepareImportText(texto);
  if (!normalized) return [];

  const candidates = [
    parseNumberedBlocks(normalized),
    parseOptionBlocks(normalized),
    parseInlineNumberedBlocks(normalized),
  ];

  return candidates.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

export function countParsedQuestions(doc: ParsedImportDocument): number {
  return doc.sueltas.length + doc.supuestos.reduce((n, s) => n + s.preguntas.length, 0);
}

export function countQuestionHeaders(texto: string): number {
  const normalized = prepareImportText(texto);
  if (!normalized) return 0;

  let count = 0;
  for (const line of normalized.split("\n")) {
    const t = line.trim();
    if (/^\d+[\.\)]\s+/.test(t) || /^P:\s/i.test(t)) count++;
  }
  return count;
}

export function splitPreambleAndQuestions(texto: string): { preamble: string; body: string } {
  const normalized = prepareImportText(texto);
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

export function parseImportDocument(texto: string): ParsedImportDocument {
  return { sueltas: parseQuestionsFromText(texto), supuestos: [] };
}

export function parseImportForContext(
  texto: string,
  ctx?: ImportContext,
): ParsedImportDocument {
  const prepared = prepareImportText(texto);

  if (ctx?.encadenado) {
    const supuestoTexto = ctx.supuestoTexto?.trim();
    const preguntas = parseQuestionsFromText(prepared);

    if (supuestoTexto && preguntas.length > 0) {
      return {
        sueltas: [],
        supuestos: [{ titulo: ctx.nombre, texto: supuestoTexto, preguntas }],
      };
    }

    const { preamble, body } = splitPreambleAndQuestions(prepared);
    const fromBody = parseQuestionsFromText(body);
    const qs = fromBody.length > 0 ? fromBody : preguntas;

    if (preamble && qs.length > 0) {
      return {
        sueltas: [],
        supuestos: [{ titulo: ctx.nombre, texto: preamble, preguntas: qs }],
      };
    }
  }

  return { sueltas: parseQuestionsFromText(prepared), supuestos: [] };
}

export function getImportDiagnostics(
  texto: string,
  ctx?: Pick<ImportContext, "encadenado" | "supuestoTexto">,
): ImportDiagnostics {
  const prepared = prepareImportText(texto);
  const doc = parseImportForContext(prepared, ctx);
  const validas = countParsedQuestions(doc);

  let questionText = prepared;
  if (ctx?.encadenado && ctx.supuestoTexto?.trim()) {
    questionText = prepared;
  } else if (ctx?.encadenado) {
    questionText = splitPreambleAndQuestions(prepared).body || prepared;
  }

  const numeradas = countQuestionHeaders(questionText);
  let rechazadas =
    numeradas > 0
      ? diagnoseNumberedBlocks(questionText)
      : diagnoseOptionBlocks(questionText);

  if (validas > 0) {
    rechazadas = rechazadas.filter((r) => r.numero !== undefined);
  }

  if (numeradas > 0) {
    rechazadas = rechazadas.sort((a, b) => (a.numero ?? 9999) - (b.numero ?? 9999));
  }

  return { validas, numeradas, rechazadas };
}

export function parseImportText(texto: string): ParsedQuestion[] {
  const doc = parseImportDocument(texto);
  return [...doc.sueltas, ...doc.supuestos.flatMap((s) => s.preguntas)];
}
