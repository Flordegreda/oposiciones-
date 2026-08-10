/**
 * Normaliza nombres de bancos vía API admin (usa credenciales de Vercel en producción).
 *
 * Uso:
 *   node scripts/normalize-bank-names.mjs              # vista previa (dry-run)
 *   node scripts/normalize-bank-names.mjs --apply      # aplicar cambios
 *   node scripts/normalize-bank-names.mjs --url https://tu-app.vercel.app
 */

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const urlArg = args.find((a) => a.startsWith("--url="));
const baseUrl = (urlArg?.slice(6) ?? process.env.APP_URL ?? "https://web-iota-drab-20.vercel.app").replace(
  /\/$/,
  "",
);

const endpoint = `${baseUrl}/api/admin/normalize-bank-names`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dryRun: !apply }),
});

const data = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("Error", res.status, data.error ?? data);
  if (data.conflicts?.length) {
    console.error("\nConflictos:");
    for (const c of data.conflicts) {
      console.error(`  "${c.name}" ←`, c.from.join(" | "));
    }
  }
  process.exit(1);
}

if (data.dryRun) {
  console.log(`Vista previa (${data.total} bancos, ${data.toUpdate} cambios, ${data.unchanged} sin cambio)`);
  if (data.conflicts?.length) {
    console.log(`\n⚠ ${data.conflicts.length} conflictos (no se aplicarían):`);
    for (const c of data.conflicts) {
      console.log(`  "${c.name}" ← ${c.from.join(" | ")}`);
    }
  }
  if (data.plans?.length) {
    console.log("\nCambios previstos:");
    for (const p of data.plans) {
      console.log(`  "${p.from}" → "${p.to}"`);
    }
  }
  if (!apply) {
    console.log("\nEjecuta con --apply para aplicar.");
  }
} else {
  console.log(`✅ ${data.updated} bancos actualizados (${data.unchanged} sin cambio).`);
  if (data.errors?.length) {
    console.error("\nErrores:");
    for (const e of data.errors) console.error(`  ${e.from}: ${e.error}`);
  }
}
