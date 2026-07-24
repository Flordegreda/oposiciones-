import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countParsedQuestions,
  getImportDiagnostics,
  parseImportDocument,
  type ParsedImportDocument,
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

function buildSupuestoFixture(closeLine: string, n = 17): string {
  return `=== SUPUESTO: Test Case ===
Body line 1

Body line 2 with blank line above
${closeLine}
${buildNQuestions(n)}`;
}

function assertDocEqual(a: ParsedImportDocument, b: ParsedImportDocument) {
  assert.equal(countParsedQuestions(a), countParsedQuestions(b));
  assert.equal(a.sueltas.length, b.sueltas.length);
  assert.equal(a.supuestos.length, b.supuestos.length);
  assert.equal(a.supuestos[0]?.preguntas.length ?? 0, b.supuestos[0]?.preguntas.length ?? 0);
  assert.equal(a.supuestos[0]?.titulo, b.supuestos[0]?.titulo);
  assert.equal(a.supuestos[0]?.texto, b.supuestos[0]?.texto);
}

describe("parse-import-text supuesto encadenado", () => {
  const expectedCount = 17;

  it("(a) supuesto with bare === close imports 17 questions", () => {
    const text = buildSupuestoFixture("===");
    const doc = parseImportDocument(text);
    const diag = getImportDiagnostics(text);

    assert.equal(countParsedQuestions(doc), expectedCount);
    assert.equal(doc.supuestos.length, 1);
    assert.equal(doc.supuestos[0].preguntas.length, expectedCount);
    assert.equal(doc.supuestos[0].titulo, "Test Case");
    assert.match(doc.supuestos[0].texto, /Body line 1/);
    assert.match(doc.supuestos[0].texto, /Body line 2 with blank line above/);
    assert.equal(diag.rechazadas.length, 0);
    assert.equal(diag.validas, expectedCount);
  });

  it("(b) === FIN SUPUESTO === close yields identical result", () => {
    const bare = buildSupuestoFixture("===");
    const fin = buildSupuestoFixture("=== FIN SUPUESTO ===");
    const docBare = parseImportDocument(bare);
    const docFin = parseImportDocument(fin);

    assertDocEqual(docBare, docFin);
    assert.equal(getImportDiagnostics(fin).rechazadas.length, 0);
  });

  it("(c) BOM prefix yields identical result", () => {
    const bare = buildSupuestoFixture("===");
    const withBom = `\uFEFF${bare}`;
    assertDocEqual(parseImportDocument(bare), parseImportDocument(withBom));
  });

  it("(d) supuesto without close imports questions and emits aviso", () => {
    const text = `=== SUPUESTO: Unclosed Case ===
Body line 1

Body line 2
${buildNQuestions(5)}`;
    const doc = parseImportDocument(text);
    const diag = getImportDiagnostics(text);

    assert.equal(countParsedQuestions(doc), 5);
    assert.equal(doc.supuestos.length, 1);
    assert.equal(doc.supuestos[0].preguntas.length, 5);
    assert.equal(diag.rechazadas.length, 0);
    assert.ok(diag.avisos?.includes("supuesto sin cierre"));
  });

  it("(e) file without supuesto imports all numbered questions", () => {
    const text = buildNQuestions(10);
    const doc = parseImportDocument(text);
    const diag = getImportDiagnostics(text);

    assert.equal(countParsedQuestions(doc), 10);
    assert.equal(doc.sueltas.length, 10);
    assert.equal(doc.supuestos.length, 0);
    assert.equal(diag.rechazadas.length, 0);
    assert.equal(diag.validas, 10);
  });

  it("accepts === === as terminator", () => {
    const text = buildSupuestoFixture("=== ===");
    const doc = parseImportDocument(text);
    assert.equal(countParsedQuestions(doc), expectedCount);
    assert.equal(doc.supuestos[0].texto.includes("==="), false);
  });

  it("accepts === FIN === as terminator", () => {
    const text = buildSupuestoFixture("=== FIN ===");
    const doc = parseImportDocument(text);
    assert.equal(countParsedQuestions(doc), expectedCount);
  });

  it("(f) fullwidth equals markers import without false rejection", () => {
    const ascii = buildSupuestoFixture("===");
    const fullwidth = ascii.replace(/={3}/g, "＝＝＝");
    const doc = parseImportDocument(fullwidth);
    const diag = getImportDiagnostics(fullwidth);

    assert.equal(countParsedQuestions(doc), expectedCount);
    assert.equal(doc.supuestos.length, 1);
    assert.equal(diag.rechazadas.length, 0);
    assert.equal(diag.validas, expectedCount);
  });

  it("(g) ignores preamble junk before supuesto marker", () => {
    const text = `Texto accidental antes del bloque\n${buildSupuestoFixture("===")}`;
    const doc = parseImportDocument(text);
    const diag = getImportDiagnostics(text);

    assert.equal(countParsedQuestions(doc), expectedCount);
    assert.equal(doc.supuestos.length, 1);
    assert.equal(diag.rechazadas.length, 0);
  });

  it("(h) detects supuesto when marker is not at line start", () => {
    const inner = buildSupuestoFixture("===");
    const firstLine = inner.split("\n")[0];
    const text = `copiado del chat ${firstLine}\n${inner.split("\n").slice(1).join("\n")}`;
    const doc = parseImportDocument(text);
    const diag = getImportDiagnostics(text);

    assert.equal(countParsedQuestions(doc), expectedCount);
    assert.equal(doc.supuestos.length, 1);
    assert.equal(diag.rechazadas.length, 0);
  });

  it("(i) never blocks valid import on junk preamble diagnostics", () => {
    const text = `comentario del chat o basura\n${buildSupuestoFixture("===")}`;
    const diag = getImportDiagnostics(text);
    assert.equal(diag.validas, expectedCount);
    assert.equal(diag.rechazadas.length, 0);
  });
});
