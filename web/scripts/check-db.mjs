import fs from "fs";

const env = fs.readFileSync(".env.production.local", "utf8");
function get(key) {
  const m = env.match(new RegExp(`^${key}="([^"]*)"`, "m"));
  return m?.[1] ?? "";
}

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function q(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const bancos = await q("bancos?select=id,nombre,materia_id,linea_id&order=nombre");
const preguntas = await q("preguntas?select=id,banco_id,enunciado&order=created_at");
const materias = await q("materias?select=id,nombre");

console.log("materias", materias.length);
console.log("bancos", bancos.length);
console.log("preguntas", preguntas.length);
console.log("\nBancos:");
for (const b of bancos) console.log("-", b.nombre, b.id);
console.log("\nPreguntas por banco:");
const tally = new Map();
for (const p of preguntas) tally.set(p.banco_id, (tally.get(p.banco_id) ?? 0) + 1);
for (const b of bancos) console.log(b.nombre, tally.get(b.id) ?? 0);
