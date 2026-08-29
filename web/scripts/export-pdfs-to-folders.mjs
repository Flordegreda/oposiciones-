/**
 * Descarga el material de la web en PDF, una carpeta por materia de F:\OPOSICION.
 * Si el archivo ya existe, lo sobrescribe.
 *
 *   node scripts/export-pdfs-to-folders.mjs
 *   node scripts/export-pdfs-to-folders.mjs --dry-run
 *   node scripts/export-pdfs-to-folders.mjs --only=tests
 *   node scripts/export-pdfs-to-folders.mjs --only=fichas
 */
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const ROOT = process.env.JEX_PDF_ROOT || "F:\\OPOSICION";
const ORIGIN =
  process.env.JEX_WEB_ORIGIN || "https://web-iota-drab-20.vercel.app";
const FALLBACK_FOLDER = "33 OTROS";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const ONLY = (() => {
  const raw = process.argv.find((a) => a.startsWith("--only="));
  return raw ? raw.slice("--only=".length) : "all";
})();

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const RENAME = [
  ["ABOGACIA GENERAL", "ABOGACIA"],
  ["ADMIN ELECTRONICA", "ADMINISTRACION ELECTRONICA"],
  ["AMINISTRACION ELECTRONICA", "ADMINISTRACION ELECTRONICA"],
  ["COLEGIOS PROFESIOALES", "COLEGIOS PROFESIONALES"],
  ["LCSP", "CONTRATOS ADMINISTRATIVOS"],
  ["EBEP", "ESTATUTO BASICO"],
  ["ESTAUTO TRABAJADORES", "ESTATUTO TRABAJADORES"],
  ["LJCA", "JURISDICCION CONTENCIOSA"],
  ["JURIDICCION CONTENCIOSA", "JURISDICCION CONTENCIOSA"],
  ["JIRISDICCION SOCIAL", "JURISDICCION SOCIAL"],
  ["LFPEX", "FUNCION PUBLICA"],
  ["LEY 1/2002", "GOBIERNO EX"],
  ["LPRL", "PREVENCION RIESGOS LABORALES"],
  ["PREVENCION RIESGOS", "PREVENCION RIESGOS LABORALES"],
  ["LPACAP", "PROCEDIMIENTO ADMINISTRATIVO"],
  ["PROTECCION DATOS", "PROTECCION DE DATOS"],
  ["LRJSP", "REGIMEN JURIDICO"],
  ["TASAS", "TASAS Y PRECIOS"],
  ["TASAS Y PRECIOS PUBLICOS", "TASAS Y PRECIOS"],
  ["TASAS Y PRECIOS PUBLICAS", "TASAS Y PRECIOS"],
  ["INSTITUCIONES UE", "UNION EUROPEA"],
];

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function folderTitle(dirName) {
  return dirName.replace(/^\d+\s*/, "").replace(/\s+/g, " ").trim();
}

function aliasesFor(nombre) {
  const n = norm(nombre);
  const out = new Set([n]);
  for (const [from, to] of RENAME) {
    if (n === norm(from) || n === norm(to)) {
      out.add(norm(from));
      out.add(norm(to));
    }
  }
  return [...out];
}

function scoreNames(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  const at = new Set(a.split(" "));
  const bt = b.split(" ");
  const hit = bt.filter((t) => at.has(t)).length;
  return hit / Math.max(at.size, bt.length);
}

function matchFolder(materiaNombre, dirs) {
  const cands = aliasesFor(materiaNombre);
  let best = null;
  let bestScore = 0.62;
  for (const dir of dirs) {
    const title = norm(folderTitle(dir));
    for (const c of cands) {
      const s = scoreNames(c, title);
      if (s > bestScore) {
        bestScore = s;
        best = dir;
      }
    }
  }
  return best || FALLBACK_FOLDER;
}

function pdfFilename(title) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "material"}.pdf`;
}

function uniquePath(dir, filename, used) {
  const key = filename.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return path.join(dir, filename);
  }
  const stem = filename.replace(/\.pdf$/i, "");
  let i = 2;
  let next = `${stem}_${i}.pdf`;
  while (used.has(next.toLowerCase())) {
    i += 1;
    next = `${stem}_${i}.pdf`;
  }
  used.add(next.toLowerCase());
  return path.join(dir, next);
}

function esc(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fichasHtml(mazo, fichas) {
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const items = fichas
    .map(
      (f, i) => `<li class="print-ficha-item">
        <p class="print-ficha-num">${i + 1}.</p>
        <div class="print-ficha-body">
          <p class="print-ficha-q"><span class="print-ficha-label">P.</span> ${esc(f.frente)}</p>
          <p class="print-ficha-a"><span class="print-ficha-label">R.</span> ${esc(f.dorso)}</p>
        </div>
      </li>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><title>Fichas · ${esc(mazo.nombre)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color:#111; margin:0; }
  .print-document { max-width:210mm; margin:0 auto; padding:12mm; }
  .print-sheet-title { margin:0 0 4px; font-size:16pt; }
  .print-sheet-sub, .print-sheet-meta { margin:0 0 4px; font-size:10pt; color:#444; }
  .print-sheet-head { border-bottom:2px solid #222; padding-bottom:10px; margin-bottom:14px; }
  .print-fichas-list { list-style:none; margin:0; padding:0; }
  .print-ficha-item { display:flex; gap:8px; margin:0 0 10px; padding-bottom:8px; border-bottom:1px solid #ddd; break-inside:avoid; }
  .print-ficha-num { margin:0; min-width:22px; font-weight:700; }
  .print-ficha-q, .print-ficha-a { margin:0 0 4px; font-size:11pt; line-height:1.4; }
  .print-ficha-a { color:#1e4d7b; }
  .print-ficha-label { font-weight:700; font-size:8.5pt; color:#555; }
</style></head>
<body><article class="print-document">
  <header class="print-sheet-head">
    <h1 class="print-sheet-title">Fichas · ${esc(mazo.nombre)}</h1>
    <p class="print-sheet-sub">${esc(mazo.materiaNombre || "")}</p>
    <p class="print-sheet-meta">${fichas.length} ficha${fichas.length === 1 ? "" : "s"} · ${esc(date)}</p>
  </header>
  <ol class="print-fichas-list">${items}</ol>
</article></body></html>`;
}

const PDF_OPTS = {
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `<div style="width:100%;font-size:8px;color:#666;text-align:center;padding-top:3mm;">
    Pág. <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`,
  margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
};

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${url} → ${res.status} (no JSON)`);
  }
  if (!res.ok) throw new Error(`${url} → ${data.error || res.status}`);
  return data;
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    throw new Error(`No existe la carpeta raíz: ${ROOT}`);
  }

  const dirs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  if (!dirs.includes(FALLBACK_FOLDER)) {
    fs.mkdirSync(path.join(ROOT, FALLBACK_FOLDER), { recursive: true });
    dirs.push(FALLBACK_FOLDER);
  }

  console.log(`Raíz: ${ROOT}`);
  console.log(`Web:  ${ORIGIN}`);
  if (DRY) console.log("Modo: dry-run (no escribe PDFs)\n");

  const materias = await fetchJson(`${ORIGIN}/api/admin/materias`);
  if (!Array.isArray(materias)) throw new Error("No se pudo listar materias");

  const bancos = [];
  if (ONLY === "all" || ONLY === "tests") {
    for (const m of materias) {
      try {
        const bundle = await fetchJson(
          `${ORIGIN}/api/print/materia?materiaId=${encodeURIComponent(m.id)}`,
        );
        for (const s of bundle.sections ?? []) {
          const n = s.preguntas?.length ?? 0;
          if (!n || !s.bancoId) continue;
          bancos.push({
            id: s.bancoId,
            nombre: s.bancoNombre || "banco",
            materia_id: m.id,
          });
        }
      } catch (e) {
        console.warn(`  Sin tests en ${m.nombre}:`, e instanceof Error ? e.message : e);
      }
    }
  }

  let mazos = [];
  if (ONLY === "all" || ONLY === "fichas") {
    try {
      const raw = await fetchJson(`${ORIGIN}/api/admin/fichas`);
      mazos = Array.isArray(raw) ? raw : [];
    } catch (e) {
      console.warn("Mazos de fichas no disponibles:", e instanceof Error ? e.message : e);
    }
  }

  const folderByMateria = new Map();
  for (const m of materias) {
    folderByMateria.set(m.id, matchFolder(m.nombre, dirs));
  }

  console.log("Emparejado materias → carpetas:");
  for (const m of [...materias].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) {
    console.log(`  ${m.nombre.padEnd(36)} → ${folderByMateria.get(m.id)}`);
  }

  const usedByFolder = new Map();
  const jobs = [];

  if (ONLY === "all" || ONLY === "tests") {
    for (const b of bancos) {
      const folder = folderByMateria.get(b.materia_id) || FALLBACK_FOLDER;
      const folderPath = path.join(ROOT, folder);
      fs.mkdirSync(folderPath, { recursive: true });
      const used = usedByFolder.get(folder) ?? new Set();
      usedByFolder.set(folder, used);
      const dest = uniquePath(folderPath, pdfFilename(b.nombre), used);
      jobs.push({
        kind: "test",
        title: b.nombre,
        folder,
        dest,
        url: `${ORIGIN}/imprimir/banco/${b.id}`,
        exists: fs.existsSync(dest),
      });
    }
  }

  if (ONLY === "all" || ONLY === "fichas") {
    for (const mazo of mazos) {
      const materiaNombre = Array.isArray(mazo.materias)
        ? mazo.materias[0]?.nombre
        : mazo.materias?.nombre;
      const folder =
        folderByMateria.get(mazo.materia_id) || matchFolder(materiaNombre || "", dirs);
      const folderPath = path.join(ROOT, folder);
      fs.mkdirSync(folderPath, { recursive: true });
      const used = usedByFolder.get(folder) ?? new Set();
      usedByFolder.set(folder, used);
      const dest = uniquePath(folderPath, pdfFilename(`FICHAS ${mazo.nombre}`), used);
      jobs.push({
        kind: "ficha",
        title: mazo.nombre,
        folder,
        dest,
        mazoId: mazo.id,
        materiaNombre: materiaNombre || "",
        exists: fs.existsSync(dest),
      });
    }
  }

  const overwrite = jobs.filter((j) => j.exists).length;
  console.log(
    `\n${jobs.length} PDF(s) a generar (${jobs.filter((j) => j.kind === "test").length} tests, ${jobs.filter((j) => j.kind === "ficha").length} fichas). ${overwrite} ya existen y se sobrescribirán.`,
  );

  if (DRY) {
    for (const j of jobs.slice(0, 12)) {
      console.log(`  [${j.kind}] ${j.folder}\\${path.basename(j.dest)}${j.exists ? " (overwrite)" : ""}`);
    }
    if (jobs.length > 12) console.log(`  … y ${jobs.length - 12} más`);
    return;
  }

  const chrome = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!chrome) throw new Error("No se encontró Chrome. Define CHROME_PATH.");

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox"],
  });

  let ok = 0;
  let fail = 0;
  try {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const label = `${i + 1}/${jobs.length} ${job.folder}\\${path.basename(job.dest)}`;
      process.stdout.write(`${job.exists ? "overwrite" : "new     "} ${label} … `);
      const page = await browser.newPage();
      try {
        await page.emulateMediaType("print");
        if (job.kind === "test") {
          await page.goto(job.url, { waitUntil: "load", timeout: 90_000 });
          const body = await page.$eval("body", (el) => el.innerText.slice(0, 80));
          if (/not found|404/i.test(body) && body.length < 40) {
            throw new Error("Página de impresión vacía o 404");
          }
        } else {
          let fichas = [];
          let materiaNombre = job.materiaNombre;
          try {
            const data = await fetchJson(`${ORIGIN}/api/admin/fichas/${job.mazoId}`);
            fichas = data.fichas ?? [];
            materiaNombre = data.mazo?.materiaNombre || materiaNombre;
          } catch {
            await page.goto(`${ORIGIN}/imprimir/fichas/${job.mazoId}`, {
              waitUntil: "load",
              timeout: 90_000,
            });
            await page.pdf({ ...PDF_OPTS, path: job.dest });
            ok += 1;
            console.log("ok");
            continue;
          }
          if (!fichas.length) {
            console.log("sin fichas, omitido");
            continue;
          }
          await page.setContent(
            fichasHtml({ nombre: job.title, materiaNombre }, fichas),
            { waitUntil: "load", timeout: 60_000 },
          );
        }
        await page.pdf({ ...PDF_OPTS, path: job.dest });
        ok += 1;
        console.log("ok");
      } catch (e) {
        fail += 1;
        console.log("ERROR", e instanceof Error ? e.message : e);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nListo: ${ok} escritos, ${fail} errores. Carpeta: ${ROOT}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
