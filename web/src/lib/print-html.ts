import {
  collectPrintSupuestos,
  flattenSections,
  type PrintSection,
} from "@/lib/print-test";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type PrintHtmlJob = {
  title: string;
  subtitle?: string;
  sections: PrintSection[];
  answerStyle: "key-at-end" | "inline";
  showExplanations: boolean;
};

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PRINT_CSS = `
  @page { margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111;
    background: #fff;
  }
  .print-sheet-head {
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #222;
  }
  .print-sheet-title { margin: 0 0 0.25rem; font-size: 16pt; }
  .print-sheet-sub { margin: 0 0 0.35rem; font-size: 11pt; color: #333; }
  .print-sheet-meta { margin: 0; font-size: 9pt; color: #555; }
  .print-banco-title {
    margin: 1.25rem 0 0.65rem;
    font-size: 12pt;
    font-weight: 700;
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.35rem;
  }
  .print-banco-block:first-of-type .print-banco-title { margin-top: 0; }
  .print-banco-count { font-weight: 500; font-size: 10pt; color: #555; }
  .print-supuesto-block {
    margin: 0 0 0.75rem;
    padding: 0.7rem 0.85rem;
    border: 1px solid #ccc;
    border-left: 4px solid #7c3aed;
    background: #f8f6ff;
  }
  .print-supuesto-title { margin: 0 0 0.35rem; font-size: 10pt; font-weight: 700; }
  .print-supuesto-text { margin: 0; font-size: 9.5pt; white-space: pre-wrap; }
  .print-question-list { margin: 0; padding: 0; list-style: none; }
  .print-question-wrap {
    margin-bottom: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid #ddd;
  }
  .print-question-text { margin: 0 0 0.45rem; font-weight: 600; }
  .print-question-num { font-weight: 700; }
  .print-option-list { margin: 0; padding: 0 0 0 1rem; list-style: none; }
  .print-option { margin: 0.2rem 0; }
  .print-option-letter { font-weight: 700; margin-right: 0.15rem; }
  .print-option--correct { font-weight: 600; }
  .print-option-mark { font-size: 9pt; color: #1a6b47; }
  .print-explanation { margin: 0.35rem 0 0; font-size: 9.5pt; color: #333; }
  .print-answer-key {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 3px double #222;
    page-break-before: always;
  }
  .print-answer-key-title {
    margin: 0 0 0.75rem;
    font-size: 13pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .print-answer-key-list { margin: 0; padding: 0; list-style: none; }
  .print-answer-key-item { margin: 0.25rem 0; font-size: 11pt; }
  .print-answer-key-num { color: #555; }
  .print-answer-key-explain { font-size: 9pt; color: #444; }
`;

export function buildPrintHtml(job: PrintHtmlJob): string {
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const inline = job.answerStyle === "inline";
  const flat = flattenSections(job.sections);
  const multi = job.sections.length > 1 || job.sections.some((s) => s.title);
  let counter = 0;

  let body = "";

  body += `<header class="print-sheet-head">`;
  body += `<h1 class="print-sheet-title">${esc(job.title)}</h1>`;
  if (job.subtitle) {
    body += `<p class="print-sheet-sub">${esc(job.subtitle)}</p>`;
  }
  body += `<p class="print-sheet-meta">${flat.length} pregunta${flat.length !== 1 ? "s" : ""} · ${esc(date)}`;
  if (multi && job.sections.length > 1) body += ` · ${job.sections.length} bancos`;
  body += inline ? " · Respuestas marcadas en cada pregunta" : " · Solucionario al final";
  body += `</p></header>`;

  for (let si = 0; si < job.sections.length; si++) {
    const section = job.sections[si];
    const sectionSupuestos = collectPrintSupuestos(section);
    const supuestoAtTop = sectionSupuestos.length === 1;

    body += `<div class="print-banco-block">`;
    if (section.title) {
      body += `<h2 class="print-banco-title">${esc(section.title)}<span class="print-banco-count"> (${section.preguntas.length} preg.)</span></h2>`;
    }
    if (supuestoAtTop) {
      for (const s of sectionSupuestos) {
        body += `<div class="print-supuesto-block">`;
        if (s.titulo) body += `<p class="print-supuesto-title">${esc(s.titulo)}</p>`;
        body += `<p class="print-supuesto-text">${esc(s.texto)}</p></div>`;
      }
    }
    body += `<ol class="print-question-list">`;

    for (let qi = 0; qi < section.preguntas.length; qi++) {
      const q = section.preguntas[qi];
      counter += 1;
      const prev = qi > 0 ? section.preguntas[qi - 1] : null;
      const showSupuesto =
        !supuestoAtTop &&
        !!q.supuestoTexto &&
        (!prev || prev.supuestoId !== q.supuestoId);

      body += `<li class="print-question-wrap">`;
      if (showSupuesto && q.supuestoTexto) {
        body += `<div class="print-supuesto-block">`;
        if (q.supuestoTitulo) {
          body += `<p class="print-supuesto-title">${esc(q.supuestoTitulo)}</p>`;
        }
        body += `<p class="print-supuesto-text">${esc(q.supuestoTexto)}</p></div>`;
      }
      body += `<div class="print-question-item">`;
      body += `<p class="print-question-text"><span class="print-question-num">${counter}.</span> ${esc(q.enunciado)}</p>`;
      body += `<ul class="print-option-list">`;
      for (let oi = 0; oi < q.opciones.length; oi++) {
        const correct = oi === q.respuesta;
        const cls = inline && correct ? " print-option--correct" : "";
        body += `<li class="print-option${cls}">`;
        body += `<span class="print-option-letter">${LETTERS[oi]})</span> ${esc(q.opciones[oi] ?? "")}`;
        if (inline && correct) body += `<span class="print-option-mark"> ✓ Correcta</span>`;
        body += `</li>`;
      }
      body += `</ul>`;
      if (inline && job.showExplanations && q.explicacion?.trim()) {
        body += `<p class="print-explanation"><strong>Explicación:</strong> ${esc(q.explicacion.trim())}</p>`;
      }
      body += `</div></li>`;
    }
    body += `</ol></div>`;
  }

  if (!inline) {
    body += `<section class="print-answer-key">`;
    body += `<h2 class="print-answer-key-title">Plantilla de respuestas correctas</h2>`;
    body += `<ol class="print-answer-key-list">`;
    for (let i = 0; i < flat.length; i++) {
      const q = flat[i];
      body += `<li class="print-answer-key-item">`;
      body += `<span class="print-answer-key-num">${i + 1}.</span> `;
      body += `<strong>${LETTERS[q.respuesta] ?? "?"}</strong>`;
      if (job.showExplanations && q.explicacion?.trim()) {
        body += `<span class="print-answer-key-explain"> — ${esc(q.explicacion.trim())}</span>`;
      }
      body += `</li>`;
    }
    body += `</ol></section>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(job.title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="print-sheet">${body}</div>
</body>
</html>`;
}

/** Abre documento de impresión aislado (no depende del layout de la app). */
export function openPrintDocument(html: string): "window" | "iframe" | "blocked" {
  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    const trigger = () => {
      w.focus();
      w.print();
    };
    w.onload = trigger;
    if (w.document.readyState === "complete") trigger();
    w.onafterprint = () => w.close();
    return "window";
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Imprimir test");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return "blocked";
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return "blocked";
  }
  win.onafterprint = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  win.focus();
  win.print();
  return "iframe";
}
