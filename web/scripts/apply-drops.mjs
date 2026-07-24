import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ref = "pdesjumwekvgjhfldfge";

function loadEnv(file, override = false) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (!override && process.env[key]) continue;
    process.env[key] = m[2].replace(/^"|"$/g, "");
  }
}

loadEnv(".env.production.local");
loadEnv(".env.local");
loadEnv(".env.vercel.local");
loadEnv(".env.vercel.prod.local", true);

const pwd = process.env.SUPABASE_DB_PASSWORD;
if (!pwd) {
  console.error("Falta SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: node scripts/apply-drops.mjs DROP-RESULTADOS.sql [DROP-PROGRESO.sql ...]");
  process.exit(1);
}

const regions = [
  process.env.SUPABASE_POOLER_REGION,
  "eu-central-1",
  "eu-central-2",
  "eu-south-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "us-west-1",
  "ap-southeast-1",
].filter(Boolean);

const prefixes = ["aws-1", "aws-0"];

async function connectAndRun(config, sql) {
  const client = new Client({ ...config, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function runSqlFile(filename) {
  const sqlPath = path.join(root, "supabase", filename);
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontró ${filename}`);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  const errors = [];

  for (const prefix of prefixes) {
    for (const region of regions) {
      try {
        await connectAndRun(
          {
            host: `${prefix}-${region}.pooler.supabase.com`,
            port: 5432,
            database: "postgres",
            user: `postgres.${ref}`,
            password: pwd,
          },
          sql,
        );
        console.log("OK", filename, `${prefix}-${region}`);
        return;
      } catch (e) {
        errors.push(`${prefix}-${region}: ${e.message}`);
      }
    }
  }

  try {
    await connectAndRun(
      {
        host: `db.${ref}.supabase.co`,
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: pwd,
      },
      sql,
    );
    console.log("OK", filename, "direct");
    return;
  } catch (e) {
    errors.push(`direct: ${e.message}`);
  }

  throw new Error(`${filename}: ${errors.slice(0, 2).join(" | ")}`);
}

for (const file of files) {
  await runSqlFile(file);
}
