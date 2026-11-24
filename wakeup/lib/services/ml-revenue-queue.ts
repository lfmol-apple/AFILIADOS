import { readFile } from "node:fs/promises";
import path from "node:path";

const QUEUE_PATH = path.join(process.cwd(), "data", "ml-revenue-queue.json");

export interface MlRevenueQueueItem {
  id: string;
  capturedAt: string;
  sourceCategory: string;
  sourcePageTitle: string;
  sourceUrl: string;
  sourcePosition: number;
  title: string;
  url: string;
  itemId: string | null;
  rating: number | null;
  sold: number | null;
  commissionRate: number | null;
  price: number | null;
  estimatedCommission: number | null;
  badges: string[];
  linkMatchesTitle: boolean;
}

export interface MlRevenueQueueFile {
  version: number;
  updatedAt: string | null;
  items: MlRevenueQueueItem[];
}

export interface MlRevenueQueueRow extends MlRevenueQueueItem {
  reviewStatus: "ready" | "suspect" | "weak";
  reviewNotes: string[];
  score: number;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function demandWeight(sold: number | null): number {
  if (!sold) return 0.2;
  if (sold >= 100000) return 1;
  if (sold >= 10000) return 0.85;
  if (sold >= 5000) return 0.7;
  if (sold >= 1000) return 0.55;
  if (sold >= 500) return 0.45;
  return 0.25;
}

export function formatMoney(value: number | null): string {
  return value === null ? "pendente" : brl.format(value);
}

export function formatRate(value: number | null): string {
  return value === null ? "pendente" : `${Math.round(value * 100)}%`;
}

export function formatSold(value: number | null): string {
  if (value === null) return "pendente";
  if (value >= 1000000) return `+${Math.round(value / 1000000)} mi`;
  if (value >= 1000) return `+${Math.round(value / 1000)} mil`;
  return `+${value}`;
}

export function evaluateRevenueItem(
  item: MlRevenueQueueItem,
): MlRevenueQueueRow {
  const notes: string[] = [];
  if (!item.itemId) notes.push("sem itemId claro");
  if (!item.linkMatchesTitle) notes.push("titulo e link precisam conferencia");
  if (item.rating === null) notes.push("avaliacao ausente");
  if (item.sold === null) notes.push("vendas ausentes");
  if (item.estimatedCommission === null) notes.push("comissao em reais ausente");
  if (item.rating !== null && item.rating < 4.5) notes.push("avaliacao abaixo de 4,5");
  if (item.sold !== null && item.sold < 500) notes.push("menos de 500 vendidos");

  const suspect =
    !item.itemId ||
    !item.linkMatchesTitle ||
    item.rating === null ||
    item.sold === null ||
    item.estimatedCommission === null;
  const weak =
    !suspect &&
    ((item.rating !== null && item.rating < 4.5) ||
      (item.sold !== null && item.sold < 500));

  const score =
    (item.estimatedCommission ?? 0) *
    demandWeight(item.sold) *
    (item.rating ? item.rating / 5 : 0.7) *
    (item.badges.includes("GANHOS EXTRAS") ? 1.12 : 1) *
    (item.badges.includes("MAIS VENDIDO") || item.badges.includes("MAIS BUSCADO")
      ? 1.08
      : 1);

  return {
    ...item,
    reviewStatus: suspect ? "suspect" : weak ? "weak" : "ready",
    reviewNotes: notes,
    score,
  };
}

export async function loadMlRevenueQueue(): Promise<{
  updatedAt: string | null;
  rows: MlRevenueQueueRow[];
  summary: {
    total: number;
    ready: number;
    suspect: number;
    weak: number;
    categories: number;
  };
}> {
  let parsed: MlRevenueQueueFile;
  try {
    parsed = JSON.parse(await readFile(QUEUE_PATH, "utf8")) as MlRevenueQueueFile;
  } catch {
    parsed = { version: 1, updatedAt: null, items: [] };
  }

  const rows = parsed.items
    .map(evaluateRevenueItem)
    .sort(
      (a, b) =>
        Number(b.reviewStatus === "ready") - Number(a.reviewStatus === "ready") ||
        b.score - a.score ||
        (b.estimatedCommission ?? 0) - (a.estimatedCommission ?? 0),
    );
  const categories = new Set(rows.map((row) => row.sourceCategory));

  return {
    updatedAt: parsed.updatedAt,
    rows,
    summary: {
      total: rows.length,
      ready: rows.filter((row) => row.reviewStatus === "ready").length,
      suspect: rows.filter((row) => row.reviewStatus === "suspect").length,
      weak: rows.filter((row) => row.reviewStatus === "weak").length,
      categories: categories.size,
    },
  };
}
