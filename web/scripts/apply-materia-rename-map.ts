/**
 * Aplica el mapa WEB → NOMBRE NUEVO en materias.
 * Uso: npx tsx scripts/apply-materia-rename-map.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  planMateriaRenames,
  summarizeMateriaRenamePlan,
} from "../src/lib/materia-rename-map";

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Faltan credenciales Supabase en web/.env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("materias").select("id, nombre").order("nombre");
  if (error) {
    console.error("Error leyendo materias:", error.message);
    process.exit(1);
  }

  const plan = planMateriaRenames(data ?? []);
  const resumen = summarizeMateriaRenamePlan(plan);

  console.log("Resumen:", resumen);
  console.log("");

  for (const row of plan) {
    const mark =
      row.estado === "ok"
        ? "→"
        : row.estado === "igual"
          ? "="
          : row.estado === "conflicto"
            ? "!"
            : "?";
    console.log(
      `${mark} [${row.web || "—"}] «${row.actual}» → «${row.nuevo}»${row.detalle ? ` (${row.detalle})` : ""}`,
    );
  }

  if (resumen.conflictos > 0) {
    console.error("\nHay conflictos. No se aplicó nada.");
    process.exit(1);
  }

  const toApply = plan.filter((p) => p.estado === "ok" && p.id);
  if (!toApply.length) {
    console.log("\nNada que renombrar (todo ya está actualizado).");
    return;
  }

  console.log(`\nAplicando ${toApply.length} renombres…`);

  for (const row of toApply) {
    const { error: uErr } = await supabase
      .from("materias")
      .update({ nombre: row.nuevo })
      .eq("id", row.id);
    if (uErr) {
      console.error(`Error «${row.actual}»:`, uErr.message);
      process.exit(1);
    }
    console.log(`OK: «${row.actual}» → «${row.nuevo}»`);
  }

  console.log(`\nListo: ${toApply.length} materia(s) renombrada(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
