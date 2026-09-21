/**
 * Limpieza del catálogo: erratas, mazos mal ubicados, vacíos y duplicados.
 * No toca Supabase; la ruta admin aplica el plan.
 */

import { normalizeBankName } from "@/lib/normalize-bank-name";
import { normalizeMateriaKey } from "@/lib/materia-rename-map";
import { baseMazoNombre } from "@/lib/split-fichas-mazo";

export type CatalogMateria = { id: string; nombre: string };
export type CatalogMazo = {
  id: string;
  nombre: string;
  materiaId: string;
  materiaNombre: string;
  numFichas: number;
};
export type CatalogBanco = {
  id: string;
  nombre: string;
  materiaId: string;
  numPreguntas: number;
};

export type CatalogRename = { id: string; from: string; to: string };
export type CatalogMove = { id: string; nombre: string; from: string; to: string; toId: string };
export type CatalogDelete = { id: string; nombre: string; where: string; reason: string };
export type CatalogMerge = {
  keeperId: string;
  loserIds: string[];
  nombre: string;
  reason: string;
};

export type CatalogCleanupPlan = {
  materiaRenames: CatalogRename[];
  mazoRenames: CatalogRename[];
  mazoMoves: CatalogMove[];
  mazoDeletes: CatalogDelete[];
  mazoMerges: CatalogMerge[];
  bancoRenames: CatalogRename[];
  bancoMerges: CatalogMerge[];
  bancoDeletes: CatalogDelete[];
};

const MATERIA_TYPOS: Record<string, string> = {
  "JIRISDICCION SOCIAL": "JURISDICCION SOCIAL",
  "JURIDICCION CONTENCIOSA": "JURISDICCION CONTENCIOSA",
};

const TEXT_TYPOS: Array<[RegExp, string]> = [
  [/\bINCOMPATIBILIADES\b/gi, "INCOMPATIBILIDADES"],
  [/\bFUNCION PULICA\b/gi, "FUNCION PUBLICA"],
  [/\bFUCNION\b/gi, "FUNCION"],
  [/\bGOBIERNO EXREMADURA\b/gi, "GOBIERNO EXTREMADURA"],
  [/\bPROCEDMIENTO\b/gi, "PROCEDIMIENTO"],
  [/\bIUALDAD\b/gi, "IGUALDAD"],
  [/\bIGAULDAD\b/gi, "IGUALDAD"],
  [/\bJIRISDICCION\b/gi, "JURISDICCION"],
  [/\bJURIDICCION\b/gi, "JURISDICCION"],
];

export function fixCatalogTypos(nombre: string): string {
  let n = String(nombre ?? "").replace(/\s+/g, " ").trim();
  if (!n || n === "—" || n === "-" || n === "–") return "";
  for (const [re, to] of TEXT_TYPOS) n = n.replace(re, to);
  return n.replace(/\s+/g, " ").trim();
}

function scoreNames(a: string, b: string): number {
  const x = normalizeMateriaKey(a);
  const y = normalizeMateriaKey(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  const at = new Set(x.split(" "));
  const bt = y.split(" ").filter(Boolean);
  if (!bt.length) return 0;
  const hit = bt.filter((t) => at.has(t)).length;
  return hit / Math.max(at.size, bt.length);
}

function bestMateria(
  mazoNombre: string,
  materias: CatalogMateria[],
): { materia: CatalogMateria; score: number } | null {
  const base = baseMazoNombre(mazoNombre);
  let best: CatalogMateria | null = null;
  let bestS = 0;
  for (const m of materias) {
    const s = scoreNames(base, m.nombre);
    if (s > bestS) {
      bestS = s;
      best = m;
    }
  }
  return best ? { materia: best, score: bestS } : null;
}

export function planCatalogCleanup(input: {
  materias: CatalogMateria[];
  mazos: CatalogMazo[];
  bancos: CatalogBanco[];
}): CatalogCleanupPlan {
  const materiaRenames: CatalogRename[] = [];
  const materias = input.materias.map((m) => {
    const key = normalizeMateriaKey(m.nombre);
    const to = MATERIA_TYPOS[key];
    if (to && to !== m.nombre) {
      materiaRenames.push({ id: m.id, from: m.nombre, to });
      return { ...m, nombre: to };
    }
    return m;
  });

  const mazoRenames: CatalogRename[] = [];
  const mazoMoves: CatalogMove[] = [];
  const mazoDeletes: CatalogDelete[] = [];
  const mazoMerges: CatalogMerge[] = [];
  const deleteIds = new Set<string>();

  const mazos = input.mazos.map((z) => {
    const to = fixCatalogTypos(z.nombre);
    if (to && to !== z.nombre) {
      mazoRenames.push({ id: z.id, from: z.nombre, to });
      return { ...z, nombre: to };
    }
    return z;
  });

  for (const z of mazos) {
    const emptyName = !fixCatalogTypos(z.nombre);
    if (emptyName && z.numFichas === 0) {
      mazoDeletes.push({
        id: z.id,
        nombre: z.nombre || "—",
        where: z.materiaNombre,
        reason: "mazo vacío",
      });
      deleteIds.add(z.id);
      continue;
    }
    if (z.numFichas === 0) {
      mazoDeletes.push({
        id: z.id,
        nombre: z.nombre,
        where: z.materiaNombre,
        reason: "sin fichas",
      });
      deleteIds.add(z.id);
    }
  }

  for (const z of mazos) {
    if (deleteIds.has(z.id)) continue;
    const hit = bestMateria(z.nombre, materias);
    if (!hit || hit.score < 0.85) continue;
    const here = scoreNames(baseMazoNombre(z.nombre), z.materiaNombre);
    if (hit.materia.id === z.materiaId || here >= 0.55) continue;

    const destSame = mazos.filter(
      (o) =>
        o.id !== z.id &&
        !deleteIds.has(o.id) &&
        o.materiaId === hit.materia.id &&
        normalizeMateriaKey(o.nombre) === normalizeMateriaKey(z.nombre),
    );
    if (destSame.length) {
      mazoDeletes.push({
        id: z.id,
        nombre: z.nombre,
        where: z.materiaNombre,
        reason: `duplicado de ${hit.materia.nombre}`,
      });
      deleteIds.add(z.id);
    } else {
      mazoMoves.push({
        id: z.id,
        nombre: z.nombre,
        from: z.materiaNombre,
        to: hit.materia.nombre,
        toId: hit.materia.id,
      });
    }
  }

  const byKey = new Map<string, CatalogMazo[]>();
  for (const z of mazos) {
    if (deleteIds.has(z.id)) continue;
    const key = `${z.materiaId}::${normalizeMateriaKey(z.nombre)}`;
    const list = byKey.get(key) ?? [];
    list.push(z);
    byKey.set(key, list);
  }
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.numFichas - a.numFichas || a.id.localeCompare(b.id));
    const keeper = list[0];
    const losers = list.slice(1);
    const equalOrEmpty = losers.filter(
      (l) => l.numFichas === 0 || l.numFichas === keeper.numFichas,
    );
    const rest = losers.filter((l) => !equalOrEmpty.includes(l));
    for (const loser of equalOrEmpty) {
      mazoDeletes.push({
        id: loser.id,
        nombre: loser.nombre,
        where: loser.materiaNombre,
        reason: `duplicado de «${keeper.nombre}»`,
      });
      deleteIds.add(loser.id);
    }
    if (rest.length) {
      mazoMerges.push({
        keeperId: keeper.id,
        loserIds: rest.map((l) => l.id),
        nombre: keeper.nombre,
        reason: `fusionar ${rest.length + 1} mazos «${keeper.nombre}»`,
      });
      for (const l of rest) deleteIds.add(l.id);
    }
  }

  const bancoRenames: CatalogRename[] = [];
  const bancoDeletes: CatalogDelete[] = [];
  const bancoMerges: CatalogMerge[] = [];
  const bancoDeleteIds = new Set<string>();

  const bancos = input.bancos.map((b) => {
    const empty = !fixCatalogTypos(b.nombre);
    if (empty && b.numPreguntas === 0) {
      bancoDeletes.push({
        id: b.id,
        nombre: b.nombre || "—",
        where: b.materiaId,
        reason: "banco vacío",
      });
      bancoDeleteIds.add(b.id);
      return b;
    }
    const to = normalizeBankName(fixCatalogTypos(b.nombre) || b.nombre);
    if (to && to !== b.nombre.trim()) {
      bancoRenames.push({ id: b.id, from: b.nombre, to });
      return { ...b, nombre: to };
    }
    return b;
  });

  const bankGroups = new Map<string, CatalogBanco[]>();
  for (const b of bancos) {
    if (bancoDeleteIds.has(b.id)) continue;
    const key = `${b.materiaId}::${normalizeMateriaKey(b.nombre)}`;
    const list = bankGroups.get(key) ?? [];
    list.push(b);
    bankGroups.set(key, list);
  }
  for (const list of bankGroups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.numPreguntas - a.numPreguntas || a.id.localeCompare(b.id));
    const keeper = list[0];
    const losers = list.slice(1);
    bancoMerges.push({
      keeperId: keeper.id,
      loserIds: losers.map((l) => l.id),
      nombre: keeper.nombre,
      reason: `fusionar ${losers.length + 1} bancos «${keeper.nombre}»`,
    });
    for (const l of losers) bancoDeleteIds.add(l.id);
  }

  return {
    materiaRenames,
    mazoRenames: mazoRenames.filter((r) => !deleteIds.has(r.id)),
    mazoMoves: mazoMoves.filter((r) => !deleteIds.has(r.id)),
    mazoDeletes,
    mazoMerges,
    bancoRenames: bancoRenames.filter((r) => !bancoDeleteIds.has(r.id)),
    bancoMerges,
    bancoDeletes,
  };
}

export function summarizeCatalogPlan(plan: CatalogCleanupPlan) {
  return {
    materias: plan.materiaRenames.length,
    mazosRenombrados: plan.mazoRenames.length,
    mazosMovidos: plan.mazoMoves.length,
    mazosEliminados: plan.mazoDeletes.length,
    mazosFusionados: plan.mazoMerges.length,
    bancosRenombrados: plan.bancoRenames.length,
    bancosFusionados: plan.bancoMerges.length,
    bancosEliminados: plan.bancoDeletes.length,
  };
}
