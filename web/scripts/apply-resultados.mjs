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
  path.join(root, "supabase", "RESULTADOS-FAVORITOS.sql"),
  "utf8",
);

const regions = ["eu-central-1", "eu-central-2", "eu-west-1", "eu-west-2", "eu-west-3"];
const prefixes = ["aws-0", "aws-1"];

async function tryConnect(cfg) {
  const client = new Client({ ...cfg, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("OK: tablas resultados y favoritos via", cfg.host);
  } finally {
    await client.end();
  }
}

const errors = [];
for (const prefix of prefixes) {
  for (const region of regions) {
    try {
      await tryConnect({
        host: `${prefix}-${region}.pooler.supabase.com`,
        port: 5432,
        database: "postgres",
        user: `postgres.${ref}`,
        password: pwd,
      });
      process.exit(0);
    } catch (e) {
      errors.push(`${prefix}-${region}: ${e.message}`);
    }
  }
}

console.error("Failed:", errors.slice(0, 5).join("\n"));
process.exit(1);
