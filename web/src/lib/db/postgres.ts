import fs from "fs";
import path from "path";
import { Client } from "pg";

const PROJECT_REF = "pdesjumwekvgjhfldfge";

function getDbPassword(override?: string): string {
  const password = override?.trim() || process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "Falta la contraseña de la base de datos. Configura SUPABASE_DB_PASSWORD en Vercel o introdúcela en el formulario.",
    );
  }
  return password;
}

export async function runSqlFile(filename: string, dbPassword?: string) {
  const sqlPath = path.join(process.cwd(), "supabase", filename);
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontró ${filename}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: getDbPassword(dbPassword),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}
