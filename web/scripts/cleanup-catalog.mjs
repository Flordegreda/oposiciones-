/**
 * Limpia el catálogo en producción con los endpoints que ya existen.
 *
 *   node scripts/cleanup-catalog.mjs           # vista previa
 *   node scripts/cleanup-catalog.mjs --apply
 */
const ORIGIN = (process.env.JEX_WEB_ORIGIN || "https://web-iota-drab-20.vercel.app").replace(
  /\/$/,
  "",
);
const APPLY = process.argv.includes("--apply");

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${url} → ${data.error || res.status}`);
  return data;
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function collapse(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function fixTypos(nombre) {
  let n = collapse(nombre);
  if (!n || n === "—" || n === "-" || n === "–") return "";
  const pairs = [
    [/\bINCOMPATIBILIADES\b/gi, "INCOMPATIBILIDADES"],
    [/\bFUNCION PULICA\b/gi, "FUNCION PUBLICA"],
    [/\bFUCNION\b/gi, "FUNCION"],
    [/\bGOBIERNO EXREMADURA\b/gi, "GOBIERNO EXTREMADURA"],
    [/\bPROCEDMIENTO\b/gi, "PROCEDIMIENTO"],
    [/\bIUALDAD\b/gi, "IGUALDAD"],
    [/\bIGAULDAD\b/gi, "IGUALDAD"],
    [/\bJIRISDICCION\b/gi, "JURISDICCION"],
    [/\bJURIDICCION\b/gi, "JURISDICCION"],
    [/\bESTATUTO TRA\b/g, "ESTATUTO TRABAJADORES"],
    [/\bREGIMEN JCO\b/g, "REGIMEN JURIDICO"],
    [/\bTEO\b/g, "TEORICO"],
    [/\bPRAC\b/g, "PRACTICO"],
  ];
  for (const [re, to] of pairs) n = n.replace(re, to);
  n = n.replace(/\s*\(\+\d+\s*temas?\)(?:\s*\(\+\d+\s*temas?\))*/gi, "");
  n = n.replace(/\b(TEORICO|PRACTICO|ENCADENADO)\s+(\d+)(?:\s+\d+)+\s*$/i, "$1 $2");
  n = n.replace(/\bABOGACIA TEORICO\b/g, "ABOGACIA GENERAL TEORICO");
  n = n.replace(/\bABOGACIA PRACTICO\b/g, "ABOGACIA GENERAL PRACTICO");
  return collapse(n);
}

function score(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  const at = new Set(x.split(" "));
  const bt = y.split(" ");
  const hit = bt.filter((t) => at.has(t)).length;
  return hit / Math.max(at.size, bt.length, 1);
}

function baseMazo(nombre) {
  return collapse(String(nombre || "").replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, ""));
}

const log = [];
function note(msg) {
  log.push(msg);
  console.log(msg);
}

async function patchMateria(id, nombre) {
  if (!APPLY) return;
  await fetchJson(`${ORIGIN}/api/admin/materias?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

async function patchMazo(id, body) {
  if (!APPLY) return;
  await fetchJson(`${ORIGIN}/api/admin/fichas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteMazo(id) {
  if (!APPLY) return;
  await fetchJson(`${ORIGIN}/api/admin/fichas/${id}`, { method: "DELETE" });
}

async function patchBanco(id, nombre) {
  if (!APPLY) return;
  await fetchJson(`${ORIGIN}/api/admin/bancos`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, nombre }),
  });
}

async function deleteBanco(id) {
  if (!APPLY) return;
  await fetchJson(`${ORIGIN}/api/admin/bancos/${id}`, { method: "DELETE" });
}

const materias = await fetchJson(`${ORIGIN}/api/admin/materias`);
const mazos = await fetchJson(`${ORIGIN}/api/admin/fichas`);

note(APPLY ? "MODO: aplicar" : "MODO: vista previa (pasa --apply para escribir)");

const MATERIA_TYPOS = {
  "JIRISDICCION SOCIAL": "JURISDICCION SOCIAL",
  "JURIDICCION CONTENCIOSA": "JURISDICCION CONTENCIOSA",
};
for (const m of materias) {
  const to = MATERIA_TYPOS[norm(m.nombre)];
  if (to && to !== m.nombre) {
    note(`Materia «${m.nombre}» → «${to}»`);
    await patchMateria(m.id, to);
    m.nombre = to;
  }
}

const byId = new Map(materias.map((m) => [m.id, m]));

note("\n— Mazos —");
for (const z of mazos) {
  const to = fixTypos(z.nombre) || collapse(z.nombre);
  if (to && to !== z.nombre) {
    note(`Renombrar mazo «${z.nombre}» → «${to}» [${z.materias?.nombre}]`);
    await patchMazo(z.id, { nombre: to });
    z.nombre = to;
  }
}

for (const z of mazos) {
  const materia = byId.get(z.materia_id);
  const here = score(baseMazo(z.nombre), materia?.nombre || z.materias?.nombre || "");
  let best = materia;
  let bestS = here;
  for (const m of materias) {
    const s = score(baseMazo(z.nombre), m.nombre);
    if (s > bestS) {
      bestS = s;
      best = m;
    }
  }
  if (!best || best.id === z.materia_id || bestS < 0.85 || here >= 0.55) continue;
  const destSame = mazos.filter(
    (o) =>
      o.id !== z.id &&
      o.materia_id === best.id &&
      norm(o.nombre) === norm(z.nombre),
  );
  if (destSame.length) {
    note(`Borrar «${z.nombre}» de ${z.materias?.nombre} (duplicado en ${best.nombre})`);
    await deleteMazo(z.id);
    z._deleted = true;
  } else {
    note(`Mover «${z.nombre}» ${z.materias?.nombre} → ${best.nombre}`);
    await patchMazo(z.id, { materiaId: best.id });
    z.materia_id = best.id;
    z.materias = { nombre: best.nombre };
  }
}

const groups = new Map();
for (const z of mazos) {
  if (z._deleted) continue;
  const key = `${z.materia_id}::${norm(z.nombre)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(z);
}

for (const list of groups.values()) {
  if (list.length < 2) continue;
  const withCounts = [];
  for (const z of list) {
    const data = await fetchJson(`${ORIGIN}/api/admin/fichas/${z.id}`);
    withCounts.push({
      z,
      n: data.fichas?.length ?? 0,
      frentes: new Set((data.fichas ?? []).map((f) => norm(f.frente))),
    });
  }
  withCounts.sort((a, b) => b.n - a.n || a.z.id.localeCompare(b.z.id));
  const keeper = withCounts[0];
  for (const loser of withCounts.slice(1)) {
    const subset = [...loser.frentes].every((f) => keeper.frentes.has(f));
    if (loser.n === 0 || loser.n === keeper.n || subset) {
      note(
        `Borrar duplicado «${loser.z.nombre}» (${loser.n} fichas, se queda el de ${keeper.n})`,
      );
      await deleteMazo(loser.z.id);
      loser.z._deleted = true;
    } else {
      const bis = `${loser.z.nombre} (bis)`;
      note(`Renombrar duplicado distinto «${loser.z.nombre}» → «${bis}» (${loser.n} vs ${keeper.n})`);
      await patchMazo(loser.z.id, { nombre: bis });
      loser.z.nombre = bis;
    }
  }
}

note("\n— Bancos —");
const banks = [];
for (const m of materias) {
  try {
    const bundle = await fetchJson(`${ORIGIN}/api/print/materia?materiaId=${m.id}`);
    for (const s of bundle.sections ?? []) {
      banks.push({
        id: s.bancoId,
        nombre: s.bancoNombre,
        n: s.preguntas?.length ?? 0,
        materiaId: m.id,
        materiaNombre: m.nombre,
      });
    }
  } catch {
    /* sin tests */
  }
}

for (const b of banks) {
  const to = fixTypos(b.nombre) || collapse(b.nombre);
  if (to && to !== b.nombre) {
    note(`Renombrar banco «${b.nombre}» → «${to}» [${b.materiaNombre}]`);
    await patchBanco(b.id, to);
    b.nombre = to;
  }
}

const bankGroups = new Map();
for (const b of banks) {
  const key = `${b.materiaId}::${norm(b.nombre)}`;
  if (!bankGroups.has(key)) bankGroups.set(key, []);
  bankGroups.get(key).push(b);
}
for (const list of bankGroups.values()) {
  if (list.length < 2) continue;
  list.sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
  const keeper = list[0];
  for (const loser of list.slice(1)) {
    if (loser.n === 0 || loser.n === keeper.n) {
      note(
        `Borrar banco duplicado «${loser.nombre}» (${loser.n} preg.) en ${loser.materiaNombre}`,
      );
      await deleteBanco(loser.id);
    } else {
      const bis = `${loser.nombre} (bis)`;
      note(
        `Renombrar banco duplicado «${loser.nombre}» → «${bis}» (${loser.n} vs ${keeper.n} preg.)`,
      );
      await patchBanco(loser.id, bis);
      loser.nombre = bis;
    }
  }
}

note(APPLY ? "\nHecho." : "\nNada escrito. Ejecuta con --apply para aplicar.");
