import fs from "fs";

const envPath = ".env.production.local";
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.production.local");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf8");
function get(key) {
  const m = env.match(new RegExp(`^${key}="([^"]*)"`, "m"));
  return m?.[1] ?? "";
}

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing Supabase env keys");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function q(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const bancos = await q(
  "bancos?select=id,nombre,tipo,materia_id&or=(nombre.ilike.*EBEP%20ENCADENADO*,nombre.ilike.*EBEP%20ENCADENADO%201*)&order=nombre",
);

console.log(`Found ${bancos.length} bank(s)\n`);

for (const b of bancos) {
  const pregs = await q(
    `preguntas?select=id,supuesto_id,enunciado,orden&banco_id=eq.${b.id}&order=orden`,
  );
  let sups = [];
  try {
    sups = await q(`supuestos?select=id,titulo,texto,orden&banco_id=eq.${b.id}&order=orden`);
  } catch {
    sups = [];
  }

  const linked = pregs.filter((p) => p.supuesto_id).length;
  console.log(`=== ${b.nombre} (${b.id}) ===`);
  console.log(`  tipo: ${b.tipo}`);
  console.log(`  preguntas: ${pregs.length} · con supuesto_id: ${linked}`);
  console.log(`  supuestos en tabla: ${sups.length}`);
  for (const s of sups) {
    console.log(`    supuesto ${s.id}: titulo=${JSON.stringify(s.titulo)} texto=${(s.texto || "").length} chars`);
  }
  if (pregs.length && linked === 0) {
    console.log("  ⚠ Ninguna pregunta tiene supuesto_id — no contará como encadenado ni imprimirá enunciado compartido");
  }
  console.log();
}
