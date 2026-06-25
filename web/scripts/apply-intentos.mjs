import fs from "fs";
import path from "path";
import pg from "pg";

const PROJECT_REF = "pdesjumwekvgjhfldfge";
const envPath = path.join(process.cwd(), ".env.production.local");
const envLocal = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");

function get(key) {
  const m = envLocal.match(new RegExp(`^${key}="([^"]*)"`, "m"));
  return m?.[1] ?? "";
}

const password = get("SUPABASE_DB_PASSWORD");
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD in .env.production.local or .env.local");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase", "INTENTOS-DETALLE.sql"),
  "utf8",
);

const regions = ["eu-central-1", "eu-central-2", "eu-west-1", "eu-west-2", "eu-west-3"];
const prefixes = ["aws-0", "aws-1"];

async function tryConnect(cfg) {
  const client = new pg.Client({ ...cfg, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("OK: tabla intentos creada via", cfg.host);
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
        user: `postgres.${PROJECT_REF}`,
        password,
      });
      process.exit(0);
    } catch (e) {
      errors.push(`${prefix}-${region}: ${e.message}`);
    }
  }
}

console.error("Failed:", errors.slice(0, 5).join("\n"));
process.exit(1);
