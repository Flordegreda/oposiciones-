import { formatNotaSobre10 } from "@/lib/exam-utils";
import type { TemarioChecklistItem, TemarioMateriaResumen } from "@/lib/temario-checklist";

export type Sugerencia = { href: string; titulo: string; detalle: string };

function preguntasDeTests(m: TemarioMateriaResumen): number {
  return m.items.reduce((s, i) => s + (i.kind === "test" ? i.count : 0), 0);
}

function primerTestPendiente(items: TemarioChecklistItem[]): TemarioChecklistItem | undefined {
  return (
    items.find((i) => i.kind === "test" && i.count > 0 && !i.hecho) ??
    items.find((i) => i.kind === "test" && i.count > 0)
  );
}

function testMasFlojo(items: TemarioChecklistItem[]): TemarioChecklistItem | undefined {
  return items
    .filter((i) => i.kind === "test" && i.hecho && i.notaSobre10 !== null)
    .sort((a, b) => (a.notaSobre10 ?? 10) - (b.notaSobre10 ?? 10))[0];
}

/** Qué hacer ahora en todo el temario. */
export function sugerenciasGlobales(
  materias: TemarioMateriaResumen[],
  falladasPendientes: number,
): Sugerencia[] {
  const out: Sugerencia[] = [];
  const conMaterial = materias.filter((m) => m.total > 0);

  if (falladasPendientes > 0) {
    out.push({
      href: "/repaso-fallos",
      titulo: "Repasa lo que has fallado",
      detalle: `${falladasPendientes} pregunta${falladasPendientes === 1 ? "" : "s"} pendiente${falladasPendientes === 1 ? "" : "s"}`,
    });
  }

  const hueco = conMaterial
    .filter((m) => m.hechos === 0)
    .sort((a, b) => preguntasDeTests(b) - preguntasDeTests(a))[0];
  const huecoTest = hueco ? primerTestPendiente(hueco.items) : undefined;
  if (hueco && huecoTest) {
    out.push({ href: huecoTest.href, titulo: `Empieza ${hueco.materiaNombre}`, detalle: "aún no la has tocado" });
  }

  const floja = conMaterial
    .filter((m) => m.mediaTests !== null && m.hechos < m.total)
    .sort((a, b) => (a.mediaTests ?? 10) - (b.mediaTests ?? 10))[0];
  const flojaTest = floja ? primerTestPendiente(floja.items) : undefined;
  if (floja && flojaTest) {
    out.push({
      href: flojaTest.href,
      titulo: `Refuerza ${floja.materiaNombre}`,
      detalle: `nota ${formatNotaSobre10(floja.mediaTests)}`,
    });
  }

  out.push({ href: "/simulacro", titulo: "Simulacro con tiempo", detalle: "como el examen" });
  return out;
}

/** Qué hacer ahora dentro de un bloque concreto. */
export function sugerenciasBloque(
  materia: TemarioMateriaResumen,
  pendientesPorBanco: Map<string, number>,
): Sugerencia[] {
  const out: Sugerencia[] = [];
  const tests = materia.items.filter((i) => i.kind === "test");

  const conFallos = tests
    .map((t) => ({ t, n: pendientesPorBanco.get(t.id) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)[0];
  if (conFallos) {
    const q = new URLSearchParams({ modo: "banco", banco: conFallos.t.id, nombre: conFallos.t.nombre });
    out.push({
      href: `/repaso-fallos?${q}`,
      titulo: `Repasa fallos de ${conFallos.t.nombre}`,
      detalle: `${conFallos.n} pendiente${conFallos.n === 1 ? "" : "s"}`,
    });
  }

  const nuevo = tests.find((i) => i.count > 0 && !i.hecho);
  if (nuevo) {
    out.push({ href: nuevo.href, titulo: `Empieza ${nuevo.nombre}`, detalle: `${nuevo.count} preguntas sin hacer` });
  }

  const flojo = testMasFlojo(tests);
  if (flojo && flojo.id !== conFallos?.t.id) {
    out.push({
      href: flojo.href,
      titulo: `Repite ${flojo.nombre}`,
      detalle: `tu nota más baja aquí: ${formatNotaSobre10(flojo.notaSobre10)}`,
    });
  }

  const mazo = materia.items.find((i) => i.kind === "fichas" && !i.hecho);
  if (mazo) {
    out.push({ href: mazo.href, titulo: `Fichas: ${mazo.nombre}`, detalle: `${mazo.count} fichas sin repasar` });
  }

  if (!out.length) {
    out.push({ href: "/simulacro", titulo: "Bloque al día", detalle: "prueba un simulacro" });
  }
  return out;
}
