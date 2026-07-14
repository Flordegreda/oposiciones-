import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

loadEnv(".env.production.local");
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

async function tableExists(name) {
  const res = await fetch(`${url}/rest/v1/${name}?select=id&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.ok) return true;
  const body = await res.text();
  return body.includes("does not exist") || body.includes("Could not find") ? false : `err:${res.status}`;
}

for (const t of ["bancos", "materias", "preguntas"]) {
  console.log(t, await tableExists(t));
}
