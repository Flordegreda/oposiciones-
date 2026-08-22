export type MateriaRenameEntry = {
  /** Nombre actual en la web (vacío = buscar alias). */
  web: string;
  nuevo: string;
  /** Nombres alternativos en BD si `web` no coincide exactamente. */
  aliases?: string[];
};

/** WEB → NOMBRE NUEVO (materias visibles en la app). */
export const MATERIA_RENAME_MAP: MateriaRenameEntry[] = [
  { web: "ABOGACIA GENERAL", nuevo: "ABOGACIA" },
  { web: "ADMIN ELECTRONICA", nuevo: "ADMINISTRACION ELECTRONICA", aliases: ["AMINISTRACION ELECTRONICA"] },
  { web: "ADMINISTRACION LOCAL", nuevo: "ADMINISTRACION LOCAL" },
  { web: "COLEGIOS PROFESIOALES", nuevo: "COLEGIOS PROFESIONALES", aliases: ["COLEGIOS PROFESIONALES"] },
  { web: "COMISION JURIDICA", nuevo: "COMISION JURIDICA" },
  { web: "LCSP", nuevo: "CONTRATOS ADMINISTRATIVOS" },
  { web: "DISCIPLINARIO", nuevo: "DISCIPLINARIO" },
  { web: "EJECUCION RESOLUCIONES", nuevo: "EJECUCION RESOLUCIONES" },
  { web: "EBEP", nuevo: "ESTATUTO BASICO" },
  { web: "ESTAUTO TRABAJADORES", nuevo: "ESTATUTO TRABAJADORES", aliases: ["ESTATUTO TRABAJADORES"] },
  { web: "EXPROPIACION", nuevo: "EXPROPIACION" },
  { web: "GOBIERNO ABIERTO", nuevo: "GOBIERNO ABIERTO" },
  { web: "HACIENDA", nuevo: "HACIENDA" },
  { web: "IGUALDAD", nuevo: "IGUALDAD" },
  { web: "INCOMPATIBILIDADES", nuevo: "INCOMPATIBILIDADES" },
  { web: "LJCA", nuevo: "JURIDICCION CONTENCIOSA" },
  { web: "JURISDICCION SOCIAL", nuevo: "JIRISDICCION SOCIAL" },
  { web: "LFPEX", nuevo: "FUNCION PUBLICA" },
  { web: "LEY 1/2002", nuevo: "GOBIERNO EX" },
  { web: "LIBERTAD SINDICAL", nuevo: "LIBERTAD SINDICAL" },
  { web: "PATRIMONIO", nuevo: "PATRIMONIO" },
  { web: "LPRL", nuevo: "PREVENCION RIESGOS" },
  { web: "LPACAP", nuevo: "PROCEDIMIENTO ADMINISTRATIVO" },
  { web: "PROTECCION DATOS", nuevo: "PROTECCION DE DATOS" },
  { web: "LRJSP", nuevo: "REGIMEN JURIDICO" },
  { web: "SUBVENCIONES", nuevo: "SUBVENCIONES" },
  {
    web: "",
    nuevo: "TASAS Y PRECIOS",
    aliases: ["TASAS", "TASAS Y PRECIOS PUBLICOS", "TASAS Y PRECIOS PUBLICAS"],
  },
  { web: "TECNICA NORMATIVA", nuevo: "TECNICA NORMATIVA" },
  { web: "TRIBUNAL CONSTITUCIONAL", nuevo: "TRIBUNAL CONSTITUCIONAL" },
  { web: "TRIBUNAL DE CUENTAS", nuevo: "TRIBUNAL DE CUENTAS" },
  { web: "UNION EUROPEA", nuevo: "UNION EUROPEA", aliases: ["UNIÓN EUROPEA", "INSTITUCIONES UE"] },
  { web: "V CONVENIO", nuevo: "V CONVENIO" },
];

export function normalizeMateriaKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

export type MateriaRow = { id: string; nombre: string };

export type MateriaRenamePlanItem = {
  id: string;
  web: string;
  actual: string;
  nuevo: string;
  cambia: boolean;
  estado: "ok" | "igual" | "no_encontrada" | "conflicto";
  detalle?: string;
};

function entryMatches(entry: MateriaRenameEntry, nombre: string): boolean {
  const key = normalizeMateriaKey(nombre);
  const candidates = [entry.web, ...(entry.aliases ?? [])].filter(Boolean).map(normalizeMateriaKey);
  return candidates.includes(key);
}

export function planMateriaRenames(materias: MateriaRow[]): MateriaRenamePlanItem[] {
  const usedIds = new Set<string>();
  const plan: MateriaRenamePlanItem[] = [];

  for (const entry of MATERIA_RENAME_MAP) {
    const match = materias.find((m) => !usedIds.has(m.id) && entryMatches(entry, m.nombre));

    if (!match) {
      plan.push({
        id: "",
        web: entry.web || entry.aliases?.[0] || "(sin web)",
        actual: "—",
        nuevo: entry.nuevo,
        cambia: false,
        estado: "no_encontrada",
        detalle: "No hay materia en la BD con ese nombre",
      });
      continue;
    }

    usedIds.add(match.id);
    const cambia = normalizeMateriaKey(match.nombre) !== normalizeMateriaKey(entry.nuevo);

    const conflict = materias.find(
      (m) =>
        m.id !== match.id &&
        normalizeMateriaKey(m.nombre) === normalizeMateriaKey(entry.nuevo),
    );

    plan.push({
      id: match.id,
      web: entry.web || match.nombre,
      actual: match.nombre,
      nuevo: entry.nuevo,
      cambia,
      estado: conflict ? "conflicto" : cambia ? "ok" : "igual",
      detalle: conflict
        ? `Ya existe otra materia «${conflict.nombre}» con el nombre destino`
        : undefined,
    });
  }

  const extras = materias.filter((m) => !usedIds.has(m.id));
  for (const m of extras) {
    plan.push({
      id: m.id,
      web: "—",
      actual: m.nombre,
      nuevo: m.nombre,
      cambia: false,
      estado: "no_encontrada",
      detalle: "Materia en la BD sin fila en el mapa WEB → NOMBRE NUEVO",
    });
  }

  return plan;
}

export function summarizeMateriaRenamePlan(plan: MateriaRenamePlanItem[]) {
  return {
    total: plan.length,
    renombrar: plan.filter((p) => p.estado === "ok").length,
    iguales: plan.filter((p) => p.estado === "igual").length,
    noEncontradas: plan.filter((p) => p.estado === "no_encontrada" && !p.id).length,
    conflictos: plan.filter((p) => p.estado === "conflicto").length,
    sinMapa: plan.filter((p) => p.estado === "no_encontrada" && p.id).length,
  };
}
