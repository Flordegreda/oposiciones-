/**
 * Temario oficial (19 carpetas). El número se conserva aunque haya huecos (04, 05…).
 */

export type TemarioFolder = {
  orden: number;
  nombre: string;
  aliases: string[];
};

export const TEMARIO_CATALOGO: TemarioFolder[] = [
  { orden: 1, nombre: "ABOGACIA", aliases: ["ABOGACIA GENERAL", "ABOGACIA"] },
  {
    orden: 2,
    nombre: "ADMINISTRACION ELECTRONICA",
    aliases: [
      "ADMINISTRACION ELECTRONICA",
      "AMINSTRACION ELECTRONICA",
      "ADMON ELECTRONICA",
      "ADMIN ELECTRONICA",
    ],
  },
  {
    orden: 3,
    nombre: "ADMINISTRACION LOCAL",
    aliases: ["ADMINISTRACION LOCAL", "ADMIN LOCAL", "ADMON LOCAL"],
  },
  {
    orden: 6,
    nombre: "CONTRATOS ADMINISTRATIVOS",
    aliases: ["CONTRATOS ADMINISTRATIVOS", "CONTRATOS DEL SECTOR PUBLICO", "LCSP", "CONTRATOS"],
  },
  {
    orden: 8,
    nombre: "EJECUCION RESOLUCIONES",
    aliases: ["EJECUCION RESOLUCIONES", "EJCUCION RESOLUCIONES"],
  },
  {
    orden: 9,
    nombre: "ESTATUTO BASICO",
    aliases: ["ESTATUTO BASICO DEL EMPLEADO PUBLICO", "ESTATUTO BASICO", "EBEP"],
  },
  {
    orden: 10,
    nombre: "ESTATUTO TRABAJADORES",
    aliases: ["ESTATUTO DE LOS TRABAJADORES", "ESTATUTO TRABAJADORES", "ET TEORICO", "ET"],
  },
  { orden: 11, nombre: "EXPROPIACION", aliases: ["EXPROPIACION FORZOSA", "EXPROPIACION"] },
  {
    orden: 12,
    nombre: "GOBIERNO ABIERTO",
    aliases: ["GOBIERNO ABIERTO", "GOBIENRO ABIERTO"],
  },
  { orden: 13, nombre: "HACIENDA", aliases: ["HACIENDA PUBLICA", "HACIENDA"] },
  { orden: 14, nombre: "IGUALDAD", aliases: ["IGUALDAD", "IGAULDAD"] },
  {
    orden: 18,
    nombre: "LEY FUNCION PUBLICA",
    aliases: ["LEY FUNCION PUBLICA", "FUNCION PUBLICA", "LFPEX", "LFPE"],
  },
  { orden: 21, nombre: "PATRIMONIO", aliases: ["PATRIMONIO"] },
  {
    orden: 27,
    nombre: "TASAS Y PRECIOS",
    aliases: ["TASAS Y PRECIOS PUBLICOS", "TASAS Y PRECIOS", "TASAS"],
  },
  { orden: 28, nombre: "TECNICA NORMATIVA", aliases: ["TECNICA NORMATIVA"] },
  { orden: 30, nombre: "TRIBUNAL DE CUENTAS", aliases: ["TRIBUNAL DE CUENTAS"] },
  { orden: 31, nombre: "UNION EUROPEA", aliases: ["UNION EUROPEA", "INSTITUCIONES UE"] },
  {
    orden: 32,
    nombre: "V CONVENIO",
    aliases: ["V CONVENIO", "5 CONVENIO", "QUINTO CONVENIO"],
  },
  { orden: 33, nombre: "OTROS", aliases: ["OTROS"] },
];

export const TEMARIO_OTROS = TEMARIO_CATALOGO[TEMARIO_CATALOGO.length - 1]!;

export function padTemarioOrden(orden: number): string {
  return String(orden).padStart(2, "0");
}

export function displayMateriaNombre(folder: Pick<TemarioFolder, "orden" | "nombre">): string {
  return `${padTemarioOrden(folder.orden)} ${folder.nombre}`;
}

export function foldTemarioText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsFolded(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (haystack === needle) return true;
  if (haystack.startsWith(`${needle} `)) return true;
  if (haystack.endsWith(` ${needle}`)) return true;
  return haystack.includes(` ${needle} `);
}

export function parseTemarioOrden(nombre: string): number | null {
  const folded = foldTemarioText(nombre);
  const m = folded.match(/^(\d{1,2})(?:\s|$)/);
  if (!m) return null;
  const orden = Number.parseInt(m[1], 10);
  return Number.isFinite(orden) ? orden : null;
}

export function folderByOrden(orden: number): TemarioFolder | null {
  return TEMARIO_CATALOGO.find((f) => f.orden === orden) ?? null;
}

/** Carpeta del catálogo o null si no hay coincidencia (el llamador usa OTROS). */
export function matchTemarioFolder(text: string): TemarioFolder | null {
  const folded = foldTemarioText(text);
  if (!folded) return null;

  const prefixOrden = parseTemarioOrden(folded);
  if (prefixOrden != null) {
    const byOrden = folderByOrden(prefixOrden);
    if (byOrden) return byOrden;
  }

  let best: { folder: TemarioFolder; len: number } | null = null;
  for (const folder of TEMARIO_CATALOGO) {
    for (const alias of folder.aliases) {
      const needle = foldTemarioText(alias);
      if (needle.length < 2) continue;
      if (needle.length < 3) {
        if (haystack !== needle && !haystack.startsWith(`${needle} `)) continue;
      } else if (!containsFolded(haystack, needle)) {
        continue;
      }
      if (!best || needle.length > best.len) {
        best = { folder, len: needle.length };
      }
    }
  }
  return best?.folder ?? null;
}

export function resolveTemarioFolder(
  primary: string,
  fallback = "",
): TemarioFolder {
  return matchTemarioFolder(primary) ?? matchTemarioFolder(fallback) ?? TEMARIO_OTROS;
}

export function materiaSortKey(nombre: string): number {
  const parsed = parseTemarioOrden(nombre);
  if (parsed != null) return parsed;
  const matched = matchTemarioFolder(nombre);
  if (matched) return matched.orden;
  return 999;
}

export function compareMateriasByNombre(a: string, b: string): number {
  const oa = materiaSortKey(a);
  const ob = materiaSortKey(b);
  if (oa !== ob) return oa - ob;
  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}
