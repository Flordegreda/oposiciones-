import type { MateriaSection } from "@/lib/queries/bancos";
import type { MazoFichasSection } from "@/lib/queries/fichas";
import { examNotaSobre10 } from "@/lib/exam-utils";
import type { TestResultRecord } from "@/lib/persistence/types";
import type { ChecklistMark } from "@/lib/persistence/checklist-service";
import { mazoChecklistKey } from "@/lib/persistence/checklist-service";

export type MateriaCatalogo = { id: string; nombre: string };

export type TemarioItemKind = "test" | "fichas";

export type TemarioChecklistItem = {
  id: string;
  kind: TemarioItemKind;
  nombre: string;
  materiaId: string;
  tipo?: string;
  count: number;
  hecho: boolean;
  /** Solo tests: % aciertos bruto (0–100), sin penalización. */
  porcentaje: number | null;
  /** Solo tests: nota penalizada media en base 10. */
  notaSobre10: number | null;
  /** Solo tests: intentos guardados. */
  intentos: number;
  href: string;
  /** Fichas: marca manual en localStorage. */
  manual: boolean;
};

export type TemarioMateriaResumen = {
  materiaId: string;
  materiaNombre: string;
  items: TemarioChecklistItem[];
  total: number;
  hechos: number;
  pctHecho: number;
  testsTotal: number;
  testsHechos: number;
  fichasTotal: number;
  fichasHechas: number;
  /** Media de notas penalizadas sobre 10 de los tests hechos en esta materia. */
  mediaTests: number | null;
  /** Media de % de acierto bruto de los tests hechos. */
  mediaPct: number | null;
};

export type TemarioContenidoTotales = {
  bancosTeorico: number;
  bancosPractico: number;
  mazosFichas: number;
  preguntasTeorico: number;
  preguntasPractico: number;
  totalFichas: number;
};

export type TemarioResumenGlobal = {
  materias: TemarioMateriaResumen[];
  totalItems: number;
  hechos: number;
  pctHecho: number;
  testsTotal: number;
  testsHechos: number;
  fichasTotal: number;
  fichasHechas: number;
  contenido: TemarioContenidoTotales;
  /** Media global de notas penalizadas sobre 10 (tests hechos). */
  mediaTests: number | null;
  /** Media global de % de acierto bruto. */
  mediaPct: number | null;
};

function pctFromRatio(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function calcularContenidoTotales(items: TemarioChecklistItem[]): TemarioContenidoTotales {
  let bancosTeorico = 0;
  let bancosPractico = 0;
  let mazosFichas = 0;
  let preguntasTeorico = 0;
  let preguntasPractico = 0;
  let totalFichas = 0;

  for (const item of items) {
    if (item.kind === "fichas") {
      mazosFichas += 1;
      totalFichas += item.count;
    } else if (item.tipo === "practico") {
      bancosPractico += 1;
      preguntasPractico += item.count;
    } else {
      bancosTeorico += 1;
      preguntasTeorico += item.count;
    }
  }

  return {
    bancosTeorico,
    bancosPractico,
    mazosFichas,
    preguntasTeorico,
    preguntasPractico,
    totalFichas,
  };
}

const nf = new Intl.NumberFormat("es-ES");

/** Texto compacto: preguntas teórico/práctico, fichas y bancos/mazos. */
export function formatContenidoResumen(c: TemarioContenidoTotales): string {
  const parts: string[] = [];
  if (c.preguntasTeorico > 0 || c.bancosTeorico > 0) {
    parts.push(
      `${nf.format(c.preguntasTeorico)} preg. teórico (${c.bancosTeorico} banco${c.bancosTeorico !== 1 ? "s" : ""})`,
    );
  }
  if (c.preguntasPractico > 0 || c.bancosPractico > 0) {
    parts.push(
      `${nf.format(c.preguntasPractico)} preg. práctico (${c.bancosPractico} banco${c.bancosPractico !== 1 ? "s" : ""})`,
    );
  }
  if (c.totalFichas > 0 || c.mazosFichas > 0) {
    parts.push(
      `${nf.format(c.totalFichas)} fichas (${c.mazosFichas} mazo${c.mazosFichas !== 1 ? "s" : ""})`,
    );
  }
  return parts.length ? parts.join(" · ") : "Sin material cargado";
}

type BancoScore = {
  intentos: number;
  porcentaje: number;
  notaSobre10: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Un valor por banco: media de las notas /10 de cada intento. */
function scoresPorBanco(resultados: TestResultRecord[]): Map<string, BancoScore> {
  const groups = new Map<string, TestResultRecord[]>();
  for (const r of resultados) {
    if (!r.banco) continue;
    const list = groups.get(r.banco) ?? [];
    list.push(r);
    groups.set(r.banco, list);
  }

  const out = new Map<string, BancoScore>();
  for (const [id, list] of groups) {
    const notas: number[] = [];
    let aciertos = 0;
    let preguntas = 0;
    for (const r of list) {
      const n = r.totalPreguntas ?? 0;
      if (n <= 0) continue;
      const nota = examNotaSobre10(r.aciertos, r.fallos, n);
      if (nota !== null) notas.push(nota);
      aciertos += r.aciertos;
      preguntas += n;
    }
    if (!notas.length && preguntas <= 0) continue;
    out.set(id, {
      intentos: list.length,
      porcentaje: preguntas > 0 ? Math.round((aciertos / preguntas) * 100) : 0,
      notaSobre10: notas.length ? round1(notas.reduce((s, n) => s + n, 0) / notas.length) : 0,
    });
  }
  return out;
}

function mediaDeNotas(items: TemarioChecklistItem[]): number | null {
  const notas = items
    .filter((i) => i.kind === "test" && i.notaSobre10 !== null)
    .map((i) => i.notaSobre10 as number);
  if (!notas.length) return null;
  return round1(notas.reduce((s, n) => s + n, 0) / notas.length);
}

function mediaDePct(items: TemarioChecklistItem[]): number | null {
  const pcts = items
    .filter((i) => i.kind === "test" && i.porcentaje !== null)
    .map((i) => i.porcentaje as number);
  if (!pcts.length) return null;
  return Math.round(pcts.reduce((s, n) => s + n, 0) / pcts.length);
}

export function construirTemarioChecklist(
  testSections: MateriaSection[],
  fichaSections: MazoFichasSection[],
  resultados: TestResultRecord[],
  marks: Record<string, ChecklistMark>,
  allMaterias: MateriaCatalogo[] = [],
): TemarioResumenGlobal {
  const byBanco = scoresPorBanco(resultados);
  const materiaMap = new Map<
    string,
    { nombre: string; items: TemarioChecklistItem[] }
  >();

  function ensureMateria(id: string, nombre: string) {
    if (!materiaMap.has(id)) {
      materiaMap.set(id, { nombre, items: [] });
    }
    return materiaMap.get(id)!;
  }

  for (const m of allMaterias) {
    ensureMateria(m.id, m.nombre);
  }

  for (const section of testSections) {
    const m = ensureMateria(section.id, section.nombre);
    for (const b of section.bancos) {
      m.items.push({
        id: b.id,
        kind: "test",
        nombre: b.nombre,
        materiaId: section.id,
        tipo: b.tipo,
        count: b.numPreguntas ?? 0,
        hecho: (byBanco.get(b.id)?.intentos ?? 0) > 0,
        porcentaje: byBanco.get(b.id)?.porcentaje ?? null,
        notaSobre10: byBanco.get(b.id)?.notaSobre10 ?? null,
        intentos: byBanco.get(b.id)?.intentos ?? 0,
        href: `/test/${b.id}`,
        manual: false,
      });
    }
  }

  function materiaIdPorNombre(nombre: string): string | null {
    const norm = nombre.trim().toLowerCase();
    if (!norm) return null;
    for (const [id, m] of materiaMap) {
      if (m.nombre.trim().toLowerCase() === norm) return id;
    }
    return null;
  }

  for (const section of fichaSections) {
    const materiaId =
      (materiaMap.has(section.materiaId) ? section.materiaId : null) ??
      materiaIdPorNombre(section.materiaNombre) ??
      section.materiaId;
    const m = ensureMateria(materiaId, section.materiaNombre);
    for (const mz of section.mazos) {
      const key = mazoChecklistKey(mz.id);
      m.items.push({
        id: mz.id,
        kind: "fichas",
        nombre: mz.nombre,
        materiaId,
        count: mz.numFichas,
        hecho: marks[key]?.done ?? false,
        porcentaje: null,
        notaSobre10: null,
        intentos: 0,
        href: `/fichas/${mz.id}`,
        manual: true,
      });
    }
  }

  const materias: TemarioMateriaResumen[] = [...materiaMap.entries()]
    .map(([materiaId, { nombre, items }]) => {
      items.sort(ordenarItemsEstudio);
      const tests = items.filter((i) => i.kind === "test");
      const fichas = items.filter((i) => i.kind === "fichas");
      const hechos = items.filter((i) => i.hecho).length;
      return {
        materiaId,
        materiaNombre: nombre,
        items,
        total: items.length,
        hechos,
        pctHecho: pctFromRatio(hechos, items.length),
        testsTotal: tests.length,
        testsHechos: tests.filter((i) => i.hecho).length,
        fichasTotal: fichas.length,
        fichasHechas: fichas.filter((i) => i.hecho).length,
        mediaTests: mediaDeNotas(items),
        mediaPct: mediaDePct(items),
      };
    })
    .sort((a, b) => a.materiaNombre.localeCompare(b.materiaNombre, "es"));

  let totalItems = 0;
  let hechos = 0;
  let testsTotal = 0;
  let testsHechos = 0;
  let fichasTotal = 0;
  let fichasHechas = 0;

  for (const m of materias) {
    totalItems += m.total;
    hechos += m.hechos;
    testsTotal += m.testsTotal;
    testsHechos += m.testsHechos;
    fichasTotal += m.fichasTotal;
    fichasHechas += m.fichasHechas;
  }

  const allItems = materias.flatMap((m) => m.items);
  const contenido = calcularContenidoTotales(allItems);

  return {
    materias,
    totalItems,
    hechos,
    pctHecho: pctFromRatio(hechos, totalItems),
    testsTotal,
    testsHechos,
    fichasTotal,
    fichasHechas,
    contenido,
    mediaTests: mediaDeNotas(materias.flatMap((m) => m.items)),
    mediaPct: mediaDePct(materias.flatMap((m) => m.items)),
  };
}

/** Inventario completo para imprimir (sin progreso, orden alfabético). */
export function construirTemarioInventario(
  testSections: MateriaSection[],
  fichaSections: MazoFichasSection[],
  allMaterias: MateriaCatalogo[] = [],
): TemarioResumenGlobal {
  const res = construirTemarioChecklist(testSections, fichaSections, [], {}, allMaterias);
  for (const m of res.materias) {
    m.items.sort(ordenarItemsInventario);
    m.hechos = 0;
    m.pctHecho = 0;
    m.testsHechos = 0;
    m.fichasHechas = 0;
    m.mediaTests = null;
    m.mediaPct = null;
  }
  res.hechos = 0;
  res.pctHecho = 0;
  res.testsHechos = 0;
  res.fichasHechas = 0;
  res.mediaTests = null;
  res.mediaPct = null;
  return res;
}

/** Pendientes primero; tests hechos de peor a mejor nota. */
function ordenarItemsEstudio(a: TemarioChecklistItem, b: TemarioChecklistItem): number {
  if (a.hecho !== b.hecho) return a.hecho ? 1 : -1;
  if (a.kind !== b.kind) return a.kind === "test" ? -1 : 1;
  if (a.kind === "test" && a.hecho && b.hecho) {
    const pa = a.notaSobre10 ?? a.porcentaje ?? 0;
    const pb = b.notaSobre10 ?? b.porcentaje ?? 0;
    if (pa !== pb) return pa - pb;
  }
  return a.nombre.localeCompare(b.nombre, "es");
}

function ordenarItemsInventario(a: TemarioChecklistItem, b: TemarioChecklistItem): number {
  if (a.kind !== b.kind) return a.kind === "test" ? -1 : 1;
  const ta = a.tipo === "practico" ? 1 : 0;
  const tb = b.tipo === "practico" ? 1 : 0;
  if (ta !== tb) return ta - tb;
  return a.nombre.localeCompare(b.nombre, "es");
}

/** Solo ítems pendientes; oculta materias ya completadas. */
export function filtrarTemarioPendientes(resumen: TemarioResumenGlobal): TemarioResumenGlobal {
  const materias: TemarioMateriaResumen[] = resumen.materias
    .map((m) => {
      const items = m.items.filter((i) => !i.hecho);
      const tests = items.filter((i) => i.kind === "test");
      const fichas = items.filter((i) => i.kind === "fichas");
      return {
        ...m,
        items,
        total: items.length,
        hechos: 0,
        pctHecho: 0,
        testsTotal: tests.length,
        testsHechos: 0,
        fichasTotal: fichas.length,
        fichasHechas: 0,
        mediaTests: m.mediaTests,
        mediaPct: m.mediaPct,
      };
    })
    .filter((m) => m.total > 0);

  let totalItems = 0;
  let testsTotal = 0;
  let fichasTotal = 0;
  for (const m of materias) {
    totalItems += m.total;
    testsTotal += m.testsTotal;
    fichasTotal += m.fichasTotal;
  }

  return {
    materias,
    totalItems,
    hechos: 0,
    pctHecho: 0,
    testsTotal,
    testsHechos: 0,
    fichasTotal,
    fichasHechas: 0,
    contenido: calcularContenidoTotales(materias.flatMap((m) => m.items)),
    mediaTests: resumen.mediaTests,
    mediaPct: resumen.mediaPct,
  };
}

export type NotaBanda = "alta" | "media" | "baja" | "sin";

export function notaBanda(notaSobre10: number | null): NotaBanda {
  if (notaSobre10 === null) return "sin";
  if (notaSobre10 >= 7.5) return "alta";
  if (notaSobre10 >= 6) return "media";
  return "baja";
}

/** Materias con tests hechos, de peor media a mejor (para saber dónde centrarse). */
export function materiasAReforzar(
  materias: TemarioMateriaResumen[],
  max = 6,
): TemarioMateriaResumen[] {
  return materias
    .filter((m) => m.mediaTests !== null && m.testsHechos > 0)
    .sort((a, b) => (a.mediaTests ?? 0) - (b.mediaTests ?? 0))
    .slice(0, max);
}

function tipoEtiqueta(item: TemarioChecklistItem): string {
  if (item.kind === "fichas") return "Fichas";
  return item.tipo === "practico" ? "Práctico" : "Teórico";
}

function tipoCodigo(item: TemarioChecklistItem): string {
  if (item.kind === "fichas") return "F";
  return item.tipo === "practico" ? "P" : "T";
}

export { tipoEtiqueta, tipoCodigo };
