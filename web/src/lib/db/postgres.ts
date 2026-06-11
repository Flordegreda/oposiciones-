import fs from "fs";
import path from "path";
import { Client } from "pg";

const PROJECT_REF = "pdesjumwekvgjhfldfge";

/** Region del pooler Supavisor (IPv4). Ajusta SUPABASE_POOLER_REGION en Vercel si falla. */
const DEFAULT_POOLER_REGION = "eu-central-1";

function getDbPassword(override?: string): string {
  const password = override?.trim() || process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "Falta la contraseña de la base de datos. Configura SUPABASE_DB_PASSWORD en Vercel o introdúcela en el formulario.",
    );
  }
  return password;
}

function getPostgresConfig(dbPassword?: string) {
  const password = getDbPassword(dbPassword);
  const poolerHost = process.env.SUPABASE_POOLER_HOST?.trim();
  const poolerRegion =
    process.env.SUPABASE_POOLER_REGION?.trim() || DEFAULT_POOLER_REGION;

  if (poolerHost) {
    return {
      host: poolerHost,
      port: Number(process.env.SUPABASE_POOLER_PORT ?? 5432),
      database: "postgres",
      user: `postgres.${PROJECT_REF}`,
      password,
    };
  }

  // Supavisor session mode (IPv4) — funciona desde Vercel serverless
  return {
    host: `aws-0-${poolerRegion}.pooler.supabase.com`,
    port: 5432,
    database: "postgres",
    user: `postgres.${PROJECT_REF}`,
    password,
  };
}

const POOLER_REGIONS = [
  "eu-central-1",
  "eu-central-2",
  "eu-south-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "us-west-1",
  "ap-southeast-1",
];

const POOLER_PREFIXES = ["aws-1", "aws-0"];

async function connectAndRun(
  config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  },
  sql: string,
) {
  const client = new Client({ ...config, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function runSqlFile(filename: string, dbPassword?: string) {
  const sqlPath = path.join(process.cwd(), "supabase", filename);
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontró ${filename}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const password = getDbPassword(dbPassword);
  const errors: string[] = [];

  const customHost = process.env.SUPABASE_POOLER_HOST?.trim();
  if (customHost) {
    await connectAndRun(getPostgresConfig(dbPassword), sql);
    return;
  }

  const preferred = process.env.SUPABASE_POOLER_REGION?.trim();
  const regions = preferred
    ? [preferred, ...POOLER_REGIONS.filter((r) => r !== preferred)]
    : POOLER_REGIONS;

  for (const prefix of POOLER_PREFIXES) {
    for (const region of regions) {
      try {
        await connectAndRun(
          {
            host: `${prefix}-${region}.pooler.supabase.com`,
            port: 5432,
            database: "postgres",
            user: `postgres.${PROJECT_REF}`,
            password,
          },
          sql,
        );
        return;
      } catch (e) {
        errors.push(
          `${prefix}-${region}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  try {
    await connectAndRun(
      {
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        database: "postgres",
        user: "postgres",
        password,
      },
      sql,
    );
    return;
  } catch (e) {
    errors.push(`direct: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(
    `No se pudo conectar a Supabase Postgres. ${errors.slice(0, 3).join(" | ")}`,
  );
}
