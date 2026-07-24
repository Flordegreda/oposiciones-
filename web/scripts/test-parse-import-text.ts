import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countParsedQuestions,
  getImportDiagnostics,
  parseImportForContext,
} from "../src/lib/parse-import-text";

function buildQuestion(n: number): string {
  return `${n}. Question text ${n}?
A) opt1
B) opt2
C) opt3
D) opt4
Respuesta: A`;
}

function buildNQuestions(n: number): string {
  return Array.from({ length: n }, (_, i) => buildQuestion(i + 1)).join("\n\n");
}

describe("parse-import-text supuesto práctico", () => {
  const caso =
    "El 30 de abril de 2026 expira el mandato del tercio de Magistrados del Tribunal Constitucional.";

  it("imports questions only as sueltas when not encadenado", () => {
    const text = buildNQuestions(5);
    const doc = parseImportForContext(text, { encadenado: false });
    assert.equal(doc.sueltas.length, 5);
    assert.equal(doc.supuestos.length, 0);
  });

  it("links caso + preguntas with two fields", () => {
    const preguntas = buildNQuestions(17);
    const doc = parseImportForContext(preguntas, {
      encadenado: true,
      supuestoTexto: caso,
      nombre: "Renovación TC",
    });
    const diag = getImportDiagnostics(preguntas, {
      encadenado: true,
      supuestoTexto: caso,
    });

    assert.equal(countParsedQuestions(doc), 17);
    assert.equal(doc.supuestos.length, 1);
    assert.equal(doc.supuestos[0].titulo, "Renovación TC");
    assert.match(doc.supuestos[0].texto, /30 de abril/);
    assert.equal(doc.supuestos[0].preguntas.length, 17);
    assert.equal(diag.rechazadas.length, 0);
  });

  it("fallback: single paste with preamble before 1.", () => {
    const text = `${caso}\n\n${buildNQuestions(3)}`;
    const doc = parseImportForContext(text, { encadenado: true, nombre: "Caso TC" });

    assert.equal(countParsedQuestions(doc), 3);
    assert.equal(doc.supuestos.length, 1);
    assert.match(doc.supuestos[0].texto, /30 de abril/);
  });

  it("diagnostics never inspect caso text when using two fields", () => {
    const diag = getImportDiagnostics(buildNQuestions(5), {
      encadenado: true,
      supuestoTexto: "=== SUPUESTO: esto no es una pregunta",
    });
    assert.equal(diag.validas, 5);
    assert.equal(diag.rechazadas.length, 0);
  });
});
