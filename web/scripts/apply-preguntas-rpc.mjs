import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ref = "pdesjumwekvgjhfldfge";

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

const pwd = process.env.SUPABASE_DB_PASSWORD;
if (!pwd) {
  console.error("Falta SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(root, "supabase", "PREGUNTAS-COUNTS-RPC.sql"),
  "utf8",
);

const regions = [
  process.env.SUPABASE_POOLER_REGION,
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-2",
  "us-east-1",
].filter(Boolean);

async function run(label, config) {
  const client = new Client({ ...config, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM preguntas_counts_by_banco()",
    );
    await client.end();
    console.log("OK", label, "bancos con preguntas:", rows[0]?.n ?? 0);
    return true;
  } catch (e) {
    try {
      await client.end();
    } catch {}
    console.log("FAIL", label, e.message);
    return false;
  }
}

for (const region of regions) {
  if (
    await run(`pooler-${region}`, {
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 5432,
      database: "postgres",
      user: `postgres.${ref}`,
      password: pwd,
    })
  ) {
    process.exit(0);
  }
}

if (
  await run("direct", {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: pwd,
  })
) {
  process.exit(0);
}

console.error("No se pudo aplicar el RPC");
process.exit(1);
