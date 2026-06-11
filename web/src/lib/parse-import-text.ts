export type ParsedQuestion = {
  enunciado: string;
  opciones: string[];
  respuesta: number;
};

const OPTION_RE = /^([A-Da-d])[\).\]]\s*(.+)$/;
const ANSWER_RE = /^Respuesta:\s*([A-Da-d])/i;

export function parseImportText(texto: string): ParsedQuestion[] {
  const blocks = texto
    .split(/\n(?=\d+\.\s)/)
    .map((b) => b.trim())
    .filter(Boolean);

  const preguntas: ParsedQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const head = lines[0].replace(/^\d+\.\s*/, "");
    const opciones: string[] = [];
    let respuesta = -1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const ans = line.match(ANSWER_RE);
      if (ans) {
        respuesta = ans[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }
      const opt = line.match(OPTION_RE);
      if (opt) opciones.push(opt[2].trim());
    }

    if (opciones.length >= 2 && respuesta >= 0 && respuesta < opciones.length) {
      preguntas.push({ enunciado: head, opciones, respuesta });
    }
  }

  return preguntas;
}
