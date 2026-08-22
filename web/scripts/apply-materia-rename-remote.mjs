/**
 * Renombra materias en producción vía API admin (sin credenciales locales).
 * Uso: node scripts/apply-materia-rename-remote.mjs
 */
const BASE = (process.env.APP_URL ?? "https://web-iota-drab-20.vercel.app").replace(/\/$/, "");

const MAP = [
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

function norm(s) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function matches(entry, nombre) {
  const key = norm(nombre);
  return [entry.web, ...(entry.aliases ?? [])]
    .filter(Boolean)
    .map(norm)
    .includes(key);
}

const listRes = await fetch(`${BASE}/api/admin/materias`);
const materias = await listRes.json();
if (!listRes.ok) {
  console.error("Error listando materias:", materias.error ?? listRes.status);
  process.exit(1);
}

const used = new Set();
const toApply = [];

for (const entry of MAP) {
  const m = materias.find((x) => !used.has(x.id) && matches(entry, x.nombre));
  if (!m) {
    console.warn(`? Sin match: WEB «${entry.web || entry.aliases?.[0]}» → «${entry.nuevo}»`);
    continue;
  }
  used.add(m.id);
  if (norm(m.nombre) === norm(entry.nuevo)) {
    console.log(`= Ya OK: «${m.nombre}»`);
    continue;
  }
  const conflict = materias.find(
    (x) => x.id !== m.id && norm(x.nombre) === norm(entry.nuevo),
  );
  if (conflict) {
    console.error(`! Conflicto: «${m.nombre}» → «${entry.nuevo}» (ya existe «${conflict.nombre}»)`);
    process.exit(1);
  }
  toApply.push({ id: m.id, de: m.nombre, a: entry.nuevo });
}

for (const m of materias) {
  if (!used.has(m.id)) {
    console.warn(`? Materia sin mapa: «${m.nombre}»`);
  }
}

if (!toApply.length) {
  console.log("\nNada que renombrar.");
  process.exit(0);
}

console.log(`\nRenombrando ${toApply.length} materia(s)…\n`);

for (const row of toApply) {
  const res = await fetch(`${BASE}/api/admin/materias?id=${row.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: row.a }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Error «${row.de}»:`, data.error ?? res.status);
    process.exit(1);
  }
  console.log(`OK: «${row.de}» → «${row.a}»`);
}

console.log(`\nListo: ${toApply.length} materia(s) renombrada(s).`);
