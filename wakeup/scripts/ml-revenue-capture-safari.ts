import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  MlRevenueQueueFile,
  MlRevenueQueueItem,
} from "@/lib/services/ml-revenue-queue";

const QUEUE_PATH = path.join(process.cwd(), "data", "ml-revenue-queue.json");

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim() || fallback;
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1]?.trim() || fallback;
  return fallback;
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function safariJson(script: string): string {
  return execFileSync("osascript", [
    "-e",
    `tell application "Safari" to do JavaScript ${JSON.stringify(script)} in current tab of front window`,
  ], { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 });
}

function loadQueue(): MlRevenueQueueFile {
  try {
    return JSON.parse(readFileSync(QUEUE_PATH, "utf8")) as MlRevenueQueueFile;
  } catch {
    return { version: 1, updatedAt: null, items: [] };
  }
}

function saveQueue(queue: MlRevenueQueueFile) {
  mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
}

const extractScript = String.raw`
(() => {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const simplify = (s) => norm(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ");
  const soldFrom = (text) => {
    const m = text.match(/Mais de ([0-9.]+)\s*(mil|milh[aã]o|milhões)? produtos vendidos/i) || text.match(/\+([0-9.]+)\s*(mil|milh[aã]o|milhões)? vendidos/i);
    if (!m) return null;
    let n = Number(m[1].replace(/\./g, ""));
    const unit = (m[2] || "").toLowerCase();
    if (unit.startsWith("milh")) n *= 1000000;
    else if (unit === "mil") n *= 1000;
    return n;
  };
  const priceFrom = (text) => {
    const matches = [...text.matchAll(/R\$\s*([0-9.]+)(?:\s*,\s*(\d{2}))?/g)].map((m) => Number(m[1].replace(/\./g, "") + "." + (m[2] || "00")));
    return matches.length ? matches[matches.length - 1] : null;
  };
  const anchors = [...document.querySelectorAll('a[href*="sid=affiliates"], a[href*="polycard_client=affiliates"]')];
  const items = anchors.map((a, index) => {
    const card = a.closest("li.poly-card") || a.closest("li") || a.parentElement;
    const text = norm((card && card.innerText) || a.textContent || "");
    const title = norm(a.innerText || a.textContent || "");
    const ratingRaw = (text.match(/Classificação ([0-9][,.][0-9]) de 5/i) || text.match(/\b([0-9][,.][0-9]) \|/i) || [])[1];
    const rating = ratingRaw ? Number(ratingRaw.replace(",", ".")) : null;
    const commissionRate = Number(((text.match(/GANHOS(?: EXTRAS)? ([0-9]+)%/i) || [])[1] || 0)) / 100 || null;
    const price = priceFrom(text);
    const itemId = (a.href.match(/(?:item_id%3A|item_id=|wid=)(MLB\d+)/i) || a.href.match(/\b(MLB\d+)\b/i) || [])[1] || null;
    const badges = ["MAIS BUSCADO", "MAIS VENDIDO", "OFERTA IMPERDÍVEL", "GANHOS EXTRAS"].filter((badge) => text.toUpperCase().includes(badge));
    const hrefText = simplify(decodeURIComponent(a.href));
    const titleWords = title.split(/\s+/).slice(0, 4).filter((word) => word.length > 2);
    return {
      sourcePageTitle: document.title,
      sourceUrl: location.href,
      sourcePosition: index + 1,
      title,
      url: a.href,
      itemId,
      rating,
      sold: soldFrom(text),
      commissionRate,
      price,
      estimatedCommission: price && commissionRate ? Number((price * commissionRate).toFixed(2)) : null,
      badges,
      linkMatchesTitle: titleWords.every((word) => hrefText.includes(simplify(word).trim())),
    };
  }).filter((item) => item.title && item.url);
  return JSON.stringify(items);
})()
`;

const category = argValue("category", "sem categoria");
const scrolls = Number(argValue("scrolls", "0"));
const stopWhenStale = process.argv.includes("--stop-when-stale");
const delayMs = Number(argValue("delay-ms", "4500"));
const now = new Date().toISOString();
const queue = loadQueue();
const byUrl = new Map(queue.items.map((item) => [item.url, item]));

let captured = 0;
let stalePasses = 0;
for (let pass = 0; pass <= scrolls; pass += 1) {
  const beforePass = captured;
  const rows = JSON.parse(safariJson(extractScript)) as Omit<
    MlRevenueQueueItem,
    "id" | "capturedAt" | "sourceCategory"
  >[];
  for (const row of rows) {
    if (byUrl.has(row.url)) continue;
    const item: MlRevenueQueueItem = {
      id: crypto
        .createHash("sha1")
        .update(`${category}:${row.url}`)
        .digest("hex")
        .slice(0, 16),
      capturedAt: now,
      sourceCategory: category,
      ...row,
    };
    byUrl.set(item.url, item);
    captured += 1;
  }
  if (captured === beforePass) stalePasses += 1;
  else stalePasses = 0;
  queue.items = [...byUrl.values()];
  queue.updatedAt = now;
  saveQueue(queue);
  if (stopWhenStale && stalePasses >= 4) break;
  if (pass < scrolls) {
    const scrollResult = JSON.parse(
      safariJson("(() => { const before = Math.round(window.scrollY); window.scrollBy({ top: Math.round(window.innerHeight * 0.82), behavior: 'smooth' }); return JSON.stringify({ before, max: Math.round(document.documentElement.scrollHeight - window.innerHeight) }); })()"),
    ) as { before: number; max: number };
    if (stopWhenStale && scrollResult.before >= scrollResult.max - 4) break;
    sleep(delayMs);
  }
}

queue.items = [...byUrl.values()];
queue.updatedAt = now;
saveQueue(queue);
console.log(
  `capturados ${captured} novo(s); total ${queue.items.length}; categoria: ${category}`,
);
