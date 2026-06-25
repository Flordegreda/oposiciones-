import fs from "fs";
import mammoth from "mammoth";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const files = process.argv.slice(2);

async function extractPdf(path) {
  const { PDFParse } = await import("pdf-parse");
  const buf = fs.readFileSync(path);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  return result.text;
}

async function extractDocx(path) {
  const result = await mammoth.extractRawText({ path });
  return result.value;
}

async function extractOdt(path) {
  const buf = fs.readFileSync(path);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("content.xml")?.async("string");
  if (!xml) return "";
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const doc = parser.parse(xml);
  const texts = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.t) {
      const t = node.t;
      if (typeof t === "string") texts.push(t);
      else if (Array.isArray(t)) texts.push(...t.filter((x) => typeof x === "string"));
      else if (typeof t === "object" && t["#text"]) texts.push(t["#text"]);
    }
    for (const k of Object.keys(node)) {
      if (k === "t") continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === "object") walk(v);
    }
  }
  walk(doc);
  return texts.join(" ").replace(/\s+/g, " ").trim();
}

for (const f of files) {
  console.log("\n" + "=".repeat(80));
  console.log("FILE:", f);
  console.log("=".repeat(80));
  let text = "";
  const lower = f.toLowerCase();
  if (lower.endsWith(".pdf")) text = await extractPdf(f);
  else if (lower.endsWith(".docx")) text = await extractDocx(f);
  else if (lower.endsWith(".odt")) text = await extractOdt(f);
  else console.log("Unsupported format");
  console.log(text);
}
