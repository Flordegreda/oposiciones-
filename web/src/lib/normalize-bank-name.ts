/**
 * Normalización de nombres de bancos de tests.
 * Formato objetivo: `[MATERIA/BLOQUE] [TIPO] [NÚMERO]` con `- PARTE N` para divisiones.
 */

/** Mapeo exacto nombre actual → nombre normalizado (prioridad sobre reglas). */
export const BANK_NAME_OVERRIDES: Record<string, string> = {
  "ABOGACIA TEORICO 1": "ABOGACIA GENERAL TEORICO 1",
  "ABOGACIA TEORICO 2": "ABOGACIA GENERAL TEORICO 2",
  "ABOGACIA TEORICO 3": "ABOGACIA GENERAL TEORICO 3",
  "ABOGACIA TEORICO 4": "ABOGACIA GENERAL TEORICO 4",

  "ADMIN LOCAL": "ADMINISTRACION LOCAL",
  "ADMIN LOCAL (2/2)": "ADMINISTRACION LOCAL - PARTE 2",
  "ADMIN LOCAL 1": "ADMINISTRACION LOCAL - PARTE 1",
  "ADMON LOCAL (1/2)": "ADMINISTRACION LOCAL - PARTE 1",

  "COLEGIOS PROFESIONAL TEO 1": "COLEGIOS PROFESIONALES TEORICO 1",
  "COLEGIOS PROFESIONAL TEO 2": "COLEGIOS PROFESIONALES TEORICO 2",
  "COLEGIOS PROFESIONALES PRAC 1": "COLEGIOS PROFESIONALES PRACTICO 1",

  "POTESTAD SANCIONADORA 1 (1/2)": "DISCIPLINARIO POTESTAD SANCIONADORA 1 - PARTE 1",
  "POTESTAD SANCIONADORA 1 (2/2)": "DISCIPLINARIO POTESTAD SANCIONADORA 1 - PARTE 2",
  "POTESTAD SAN PRACTICO 2": "DISCIPLINARIO PRACTICO 2",
  "EJCUCION RESOLUCIONES ENCADENADO 1 (+1 temas) (+1 temas)":
    "EJECUCION RESOLUCIONES ENCADENADO 1",

  "IGAULDAD TEORI": "IGUALDAD TEORICO 1",
  "GOBIENRO ABIERTO": "GOBIERNO ABIERTO",

  "EBEP ENCADENADO 0 (+2 temas)": "EBEP ENCADENADO 0",
  "EBEP ENCADENADO 3 (+3 temas)": "EBEP ENCADENADO 3",
  "EBEP PRACTICO 2 (+2 temas)": "EBEP PRACTICO 2",
  "EBEP PRACTICO 5 (+2 temas)": "EBEP PRACTICO 5",
  "EBEP PRACTICO 8 (+2 temas)": "EBEP PRACTICO 8",
  "EBEP PRACTICO 11 (+1 temas)": "EBEP PRACTICO 11",
  "EBEP TEORICO 1 (1/3)": "EBEP TEORICO 1 - PARTE 1",
  "EBEP TEORICO 1 (2/3)": "EBEP TEORICO 1 - PARTE 2",
  "EBEP TEORICO 2 (1/2)": "EBEP TEORICO 2 - PARTE 1",
  "EBEP TEORICO 2 (2/2)": "EBEP TEORICO 2 - PARTE 2",
  "EBEP TEORICO 3 (1/2)": "EBEP TEORICO 3 - PARTE 1",
  "EBEP TEORICO 3 (2/2)": "EBEP TEORICO 3 - PARTE 2",
  "EBEP TEORICO 4 (1/2)": "EBEP TEORICO 4 - PARTE 1",
  "EBEP TEORICO 4 (2/2)": "EBEP TEORICO 4 - PARTE 2",
  "EBEP TEORICO 5 (1/2)": "EBEP TEORICO 5 - PARTE 1",
  "EBEP TEORICO 5 (2/2)": "EBEP TEORICO 5 - PARTE 2",
  "EBEP TEORICO 6 (1/4)": "EBEP TEORICO 6 - PARTE 1",
  "EBEP TEORICO 6 (2/4)": "EBEP TEORICO 6 - PARTE 2",
  "EBEP TEORICO 6 (3/4)": "EBEP TEORICO 6 - PARTE 3",
  "EBEP TEORICO 6 (4/4)": "EBEP TEORICO 6 - PARTE 4",

  "LCSP TEORICO 2 (1/6)": "LCSP TEORICO 2 - PARTE 1",
  "LCSP TEORICO 2 (2/6)": "LCSP TEORICO 2 - PARTE 2",
  "LCSP TEORICO 2 (3/6)": "LCSP TEORICO 2 - PARTE 3",
  "LCSP TEORICO 2 (4/6)": "LCSP TEORICO 2 - PARTE 4",
  "LCSP TEORICO 2 (5/6)": "LCSP TEORICO 2 - PARTE 5",
  "LCSP TEORICO 2 (6/6)": "LCSP TEORICO 2 - PARTE 6",
  "LCSP PRACTICO (+2 temas)": "LCSP PRACTICO",
  "LCSP TEORICO 1 (1/2)": "LCSP TEORICO 1 - PARTE 1",
  "LCSP TEORICO 1 (2/2) (+2 temas)": "LCSP TEORICO 1 - PARTE 2",
  "LCSP TEORICO 3 (1/2)": "LCSP TEORICO 3 - PARTE 1",
  "LCSP TEORICO 3 (2/2)": "LCSP TEORICO 3 - PARTE 2",
  "LCSP TEORICO 4 (1/2)": "LCSP TEORICO 4 - PARTE 1",
  "LCSP TEORICO 4 (2/2)": "LCSP TEORICO 4 - PARTE 2",
  "LCSP TEORICO 5 (1/2)": "LCSP TEORICO 5 - PARTE 1",
  "LCSP TEORICO 5 (2/2)": "LCSP TEORICO 5 - PARTE 2",
  "LCSP TEORICO 6 (1/2)": "LCSP TEORICO 6 - PARTE 1",
  "LCSP TEORICO 6 (2/2)": "LCSP TEORICO 6 - PARTE 2",
  "LCSP TEORICO 7 (1/2)": "LCSP TEORICO 7 - PARTE 1",
  "LCSP TEORICO 7 (2/2)": "LCSP TEORICO 7 - PARTE 2",
  "LCSP TEORICO 8 (1/3)": "LCSP TEORICO 8 - PARTE 1",
  "LCSP TEORICO 8 (2/3)": "LCSP TEORICO 8 - PARTE 2",
  "LCSP TEORICO 9 (1/2)": "LCSP TEORICO 9 - PARTE 1",
  "LCSP TEORICO 10 (1/2)": "LCSP TEORICO 10 - PARTE 1",
  "LCSP TEORICO 10 (2/2)": "LCSP TEORICO 10 - PARTE 2",

  "LPACAP PRACTICO 1 (+2 temas)": "LPACAP PRACTICO 1",
  "LPACAP TEORICO 7 (1/2)": "LPACAP TEORICO 7 - PARTE 1",
  "LPACAP TEORICO 7 (2/2) (+2 temas)": "LPACAP TEORICO 7 - PARTE 2",
  "LPACAP TEORICO 13 (1/2)": "LPACAP TEORICO 13 - PARTE 1",

  "LFPEX TEORICO 1 (1/2)": "LFPEX TEORICO 1 - PARTE 1",
  "LFPEX TEORICO 1 (2/2)": "LFPEX TEORICO 1 - PARTE 2",
  "LFPEX TEORICO 2 (1/2)": "LFPEX TEORICO 2 - PARTE 1",
  "LFPEX TEORICO 2 (2/2)": "LFPEX TEORICO 2 - PARTE 2",
  "LFPEX TEORICO 3 (1/2)": "LFPEX TEORICO 3 - PARTE 1",
  "LFPEX TEORICO 3 (2/2)": "LFPEX TEORICO 3 - PARTE 2",
  "LFPEX TEORICO 4 (1/2)": "LFPEX TEORICO 4 - PARTE 1",
  "LFPEX TEORICO 4 (2/2)": "LFPEX TEORICO 4 - PARTE 2",
  "LFPEX TEORICO 5 (1/3)": "LFPEX TEORICO 5 - PARTE 1",
  "LFPEX TEORICO 5 (2/3)": "LFPEX TEORICO 5 - PARTE 2",
  "LFPEX TEORICO 5 (3/3) (+1 temas)": "LFPEX TEORICO 5 - PARTE 3",
  "LFPEX TEORICO 6 (1/2)": "LFPEX TEORICO 6 - PARTE 1",
  "LFPEX TEORICO 7 (1/2)": "LFPEX TEORICO 7 - PARTE 1",
  "LFPEX TEORICO 7 (2/2)": "LFPEX TEORICO 7 - PARTE 2",
  "LFPEX TEORICO 8 (1/2)": "LFPEX TEORICO 8 - PARTE 1",
  "LFPEX TEORICO 8 (2/2)": "LFPEX TEORICO 8 - PARTE 2",

  "LRJSP 5 (1/3)": "LRJSP TEORICO 5 - PARTE 1",
  "LRJSP 5 (2/3)": "LRJSP TEORICO 5 - PARTE 2",
  "LRJSP 5 (3/3) (+2 temas)": "LRJSP TEORICO 5 - PARTE 3",
  "LRJSP TEORICO (1/4)": "LRJSP TEORICO 1 - PARTE 1",
  "LRJSP TEORICO (2/4)": "LRJSP TEORICO 1 - PARTE 2",
  "LRJSP TEORICO (3/4)": "LRJSP TEORICO 1 - PARTE 3",
  "LRJSPT TEORICO 2 (1/4)": "LRJSP TEORICO 2 - PARTE 1",
  "LRJSPT TEORICO 2 (2/4)": "LRJSP TEORICO 2 - PARTE 2",
  "LRJSPT TEORICO 2 (3/4)": "LRJSP TEORICO 2 - PARTE 3",
  "LRJSPT TEORICO 3 (1/2)": "LRJSP TEORICO 3 - PARTE 1",
  "LRJSPT TEORICO 3 (2/2)": "LRJSP TEORICO 3 - PARTE 2",

  "V CONVENIO COMPLEMENTOS (+3 temas)": "V CONVENIO COMPLEMENTOS",
  "V CONVENIO TEORICO 1 (1/2)": "V CONVENIO TEORICO 1 - PARTE 1",
  "V CONVENIO TEORICO 1 (2/2)": "V CONVENIO TEORICO 1 - PARTE 2",
  "V CONVENIO TEORICO 2 (1/2)": "V CONVENIO TEORICO 2 - PARTE 1",
  "V CONVENIO TEORICO 2 (2/2)": "V CONVENIO TEORICO 2 - PARTE 2",

  "LPRL (1/2)": "LPRL TEORICO 1 - PARTE 1",
  "LPRL (2/2)": "LPRL TEORICO 1 - PARTE 2",
  "LPRL ENCADENADO (+1 temas)": "LPRL ENCADENADO 1",
};

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Reglas genéricas aplicadas cuando no hay override exacto. */
export function normalizeBankNameRules(original: string): string {
  let name = collapseSpaces(original);

  name = name.replace(/\s*\(\+\d+\s*temas?\)(?:\s*\(\+\d+\s*temas?\))*/gi, "");
  name = name.replace(/\s*\((\d+)\/(\d+)\)\s*/g, " - PARTE $1");

  const replacements: Array<[RegExp, string]> = [
    [/\bLRJSPT\b/g, "LRJSP"],
    [/\bEJCUCION\b/g, "EJECUCION"],
    [/\bGOBIENRO\b/g, "GOBIERNO"],
    [/\bIGAULDAD\b/g, "IGUALDAD"],
    [/\bADMON\b/g, "ADMINISTRACION"],
    [/\bADMIN LOCAL\b/g, "ADMINISTRACION LOCAL"],
    [/\bCOLEGIOS PROFESIONAL\b/g, "COLEGIOS PROFESIONALES"],
    [/\bABOGACIA TEORICO\b/g, "ABOGACIA GENERAL TEORICO"],
    [/\bABOGACIA PRACTICO\b/g, "ABOGACIA GENERAL PRACTICO"],
    [/\bTEORI\b/g, "TEORICO"],
    [/\bTEO\b/g, "TEORICO"],
    [/\bPRAC\b/g, "PRACTICO"],
    [/\bENCA\b/g, "ENCADENADO"],
    [/\bPOTESTAD SAN\b/g, "DISCIPLINARIO PRACTICO"],
  ];

  for (const [pattern, replacement] of replacements) {
    name = name.replace(pattern, replacement);
  }

  return collapseSpaces(name);
}

export function normalizeBankName(original: string): string {
  const trimmed = collapseSpaces(original);
  const override = BANK_NAME_OVERRIDES[trimmed];
  if (override) return override;
  return normalizeBankNameRules(trimmed);
}

export type BankRenamePlan = {
  id: string;
  from: string;
  to: string;
};

export type NormalizeBankNamesResult = {
  plans: BankRenamePlan[];
  unchanged: string[];
  conflicts: Array<{ name: string; ids: string[]; from: string[] }>;
};

export function planBankRenames(
  bancos: Array<{ id: string; nombre: string }>,
): NormalizeBankNamesResult {
  const plans: BankRenamePlan[] = [];
  const unchanged: string[] = [];
  const targetById = new Map<string, string>();

  for (const banco of bancos) {
    const to = normalizeBankName(banco.nombre);
    targetById.set(banco.id, to);
    if (to !== banco.nombre.trim()) {
      plans.push({ id: banco.id, from: banco.nombre, to });
    } else {
      unchanged.push(banco.nombre);
    }
  }

  const idsByTarget = new Map<string, string[]>();
  for (const banco of bancos) {
    const target = targetById.get(banco.id)!;
    const ids = idsByTarget.get(target) ?? [];
    ids.push(banco.id);
    idsByTarget.set(target, ids);
  }

  const conflictTargets = new Set<string>();
  for (const [name, ids] of idsByTarget) {
    if (ids.length > 1) conflictTargets.add(name);
  }

  const conflicts = [...conflictTargets].map((name) => {
    const ids = idsByTarget.get(name)!;
    return {
      name,
      ids,
      from: ids.map((id) => bancos.find((b) => b.id === id)!.nombre),
    };
  });

  const safePlans = plans.filter((p) => !conflictTargets.has(p.to));

  return { plans: safePlans, unchanged, conflicts };
}
