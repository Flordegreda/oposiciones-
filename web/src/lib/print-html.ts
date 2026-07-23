import "server-only";

import { readFileSync } from "fs";
import { join } from "path";
import {
  collectPrintSupuestos,
  flattenSections,
  shufflePrintSections,
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

let cachedCss: string | null = null;

function printCss(): string {
  if (!cachedCss) {
    cachedCss = readFileSync(join(process.cwd(), "src/app/imprimir/print.css"), "utf8");
  }
  return cachedCss;
}

function buildPrintBody(job: PrintHtmlJob): string {
  const sections = shufflePrintSections(job.sections);
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const inline = job.answerStyle === "inline";
  const flat = flattenSections(sections);
  const multi = sections.length > 1 || sections.some((s) => s.title);
  let counter = 0;
  let body = "";

  body += `<article class="print-document">`;
  body += `<header class="print-sheet-head">`;
  body += `<h1 class="print-sheet-title">${esc(job.title)}</h1>`;
  if (job.subtitle) body += `<p class="print-sheet-sub">${esc(job.subtitle)}</p>`;
  body += `<p class="print-sheet-meta">${flat.length} pregunta${flat.length !== 1 ? "s" : ""} · ${esc(date)}`;
  if (multi && sections.length > 1) body += ` · ${sections.length} bancos`;
  body += inline ? " · Respuestas marcadas en cada pregunta" : " · Solucionario al final";
  body += `</p></header>`;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const sectionTitle = section.title.trim() || job.title;
    const sectionSupuestos = collectPrintSupuestos(section);
    const supuestoAtTop = sectionSupuestos.length === 1;

    body += `<div class="print-banco-block">`;
    body += `<table class="print-banco-table">`;
    body += `<thead><tr><th class="print-repeat-head" scope="colgroup">`;
    body += `<span class="print-repeat-head-title">${esc(sectionTitle)}</span>`;
    body += `<span class="print-repeat-head-meta">${section.preguntas.length} pregunta${section.preguntas.length !== 1 ? "s" : ""}`;
    if (multi && job.subtitle) body += ` · ${esc(job.subtitle)}`;
    body += `</span></th></tr></thead><tbody>`;

    if (supuestoAtTop) {
      for (const s of sectionSupuestos) {
        body += `<tr class="print-supuesto-row"><td>`;
        body += `<div class="print-supuesto-block">`;
        if (s.titulo) body += `<p class="print-supuesto-title">${esc(s.titulo)}</p>`;
        body += `<p class="print-supuesto-text">${esc(s.texto)}</p></div>`;
        body += `</td></tr>`;
      }
    }

    for (let qi = 0; qi < section.preguntas.length; qi++) {
      const q = section.preguntas[qi];
      counter += 1;
      const prev = qi > 0 ? section.preguntas[qi - 1] : null;
      const showSupuesto =
        !supuestoAtTop &&
        !!q.supuestoTexto &&
        (!prev || prev.supuestoId !== q.supuestoId);

      body += `<tr class="print-question-row"><td>`;
      if (showSupuesto && q.supuestoTexto) {
        body += `<div class="print-supuesto-block">`;
        if (q.supuestoTitulo) body += `<p class="print-supuesto-title">${esc(q.supuestoTitulo)}</p>`;
        body += `<p class="print-supuesto-text">${esc(q.supuestoTexto)}</p></div>`;
      }
      body += `<div class="print-question-item">`;
      body += `<p class="print-question-text"><span class="print-question-num">${counter}.</span> ${esc(q.enunciado)}</p>`;
      body += `<ul class="print-option-list">`;
      for (let oi = 0; oi < q.opciones.length; oi++) {
        const correct = oi === q.respuesta;
        body += `<li class="print-option${inline && correct ? " print-option--correct" : ""}">`;
        body += `<span class="print-option-letter">${LETTERS[oi]})</span> ${esc(q.opciones[oi] ?? "")}`;
        if (inline && correct) body += `<span class="print-option-mark"> ✓ Correcta</span>`;
        body += `</li>`;
      }
      body += `</ul>`;
      if (inline && job.showExplanations && q.explicacion?.trim()) {
        body += `<p class="print-explanation"><strong>Explicación:</strong> ${esc(q.explicacion.trim())}</p>`;
      }
      body += `</div></td></tr>`;
    }

    body += `</tbody></table></div>`;
  }

  if (!inline) {
    body += `<section class="print-answer-key">`;
    body += `<table class="print-banco-table">`;
    body += `<thead><tr><th class="print-repeat-head" scope="colgroup">`;
    body += `<span class="print-repeat-head-title">Solucionario</span>`;
    body += `<span class="print-repeat-head-meta">${esc(job.title)}</span>`;
    body += `</th></tr></thead><tbody>`;
    for (let i = 0; i < flat.length; i++) {
      const q = flat[i];
      body += `<tr class="print-answer-row"><td>`;
      body += `<div class="print-answer-key-item">`;
      body += `<span class="print-answer-key-num">${i + 1}.</span> `;
      body += `<strong>${LETTERS[q.respuesta] ?? "?"}</strong>`;
      if (job.showExplanations && q.explicacion?.trim()) {
        body += `<span class="print-answer-key-explain"> — ${esc(q.explicacion.trim())}</span>`;
      }
      body += `</div></td></tr>`;
    }
    body += `</tbody></table></section>`;
  }

  body += `</article>`;
  return body;
}

export { buildPrintBody };

export function buildPrintDocumentHtml(job: PrintHtmlJob): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(job.title)}</title>
  <style>${printCss()}</style>
</head>
<body>
  <div class="print-route">${buildPrintBody(job)}</div>
</body>
</html>`;
}
