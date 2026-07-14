import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url =
  "https://web-iota-drab-20.vercel.app/imprimir/banco/16bda5e8-b5f3-43a7-9cd6-bc0feacee4c4";
const out = path.join(__dirname, "..", "IGUALDAD_ENCADENADO_1.pdf");
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chrome,
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle0" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
});
await browser.close();
console.log(out);
