import "server-only";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const DEV_CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean) as string[];

async function launchBrowser() {
  const { existsSync } = await import("fs");
  const localChrome = DEV_CHROME_PATHS.find((p) => existsSync(p));
  if (localChrome) {
    return puppeteer.launch({ executablePath: localChrome, headless: true });
  }

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

const PDF_FOOTER = `<div style="width:100%;font-size:8px;color:#666;text-align:center;padding-top:3mm;">
  Pág. <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>`;

const PDF_OPTS = {
  format: "A4" as const,
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: PDF_FOOTER,
  margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
};

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    const pdf = await page.pdf(PDF_OPTS);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function urlToPdf(url: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    const pdf = await page.pdf(PDF_OPTS);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function pdfFilename(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "test"}.pdf`;
}

export function pdfResponse(pdf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return new URL(req.url).origin;
  return `${proto}://${host}`;
}
