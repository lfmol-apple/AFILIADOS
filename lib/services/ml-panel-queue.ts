import type { PanelPick } from "@/lib/config/ml-panel-picks";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";

/** Criteria a panel product must clear to enter the "generate link" queue. */
export const QUEUE_RULES = {
  /** Quality gate: the site already refuses weak-rated items elsewhere. A
   * product with no rating shown is excluded, never assumed good. */
  minRating: 4.5,
  /** "+N vendidos" floor: real proof people buy it. */
  minSold: 500,
} as const;

export type Verdict =
  | {
      status: "queue";
      score: number;
      earningPerSale: number;
      reasons: string[];
    }
  | { status: "skip"; reason: string };

export interface Evaluated {
  pick: PanelPick;
  verdict: Verdict;
}

/** Sales strength from the "+N vendidos" badge: how likely a click becomes a sale. */
function demandWeight(sold: number): number {
  if (sold >= 100000) return 1;
  if (sold >= 10000) return 0.8;
  if (sold >= 5000) return 0.65;
  if (sold >= 1000) return 0.5;
  return 0.4;
}

/** Reputation weight from the panel's own star rating — a continuous factor,
 * not a pass/fail gate, so a 4.6 genuinely outranks a 4.5 at the same money.
 * A missing rating is never assumed good: it scores below every known one. */
function ratingWeight(rating: number | null): number {
  if (rating === null) return 0.5;
  return Math.max(0, rating / 5);
}

const STOP = new Set([
  "de",
  "da",
  "do",
  "para",
  "com",
  "e",
  "em",
  "kit",
  "jogo",
  "pc",
  "pcs",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * True when the site already carries this product: every one of the panel
 * title's first five significant words shows up in one existing product slug.
 * Conservative on purpose — a false "already there" only delays a product,
 * a false "new" would ask the owner to link a duplicate.
 */
export function isAlreadyOnSite(
  title: string,
  siteSlugs: readonly string[],
): boolean {
  const need = tokens(title).slice(0, 5);
  if (need.length < 3) return false;
  return siteSlugs.some((slug) => {
    const have = new Set(slug.split("-"));
    return need.every((t) => have.has(t));
  });
}

export function evaluatePick(
  pick: PanelPick,
  siteSlugs: readonly string[] = [],
): Verdict {
  if (pick.rating === null)
    return { status: "skip", reason: "sem nota de avaliação" };
  if (pick.rating < QUEUE_RULES.minRating)
    return { status: "skip", reason: `nota ${pick.rating} abaixo de 4,5` };
  if (pick.sold < QUEUE_RULES.minSold)
    return { status: "skip", reason: `poucas vendas (+${pick.sold})` };
  if (pick.group === "saude-injetavel")
    return {
      status: "skip",
      reason: "injetável/saúde: aguarda decisão do dono",
    };
  if (isAlreadyOnSite(pick.title, siteSlugs))
    return { status: "skip", reason: "já está no site" };

  const earningPerSale = pick.rate * pick.price;
  const score =
    earningPerSale *
    demandWeight(pick.sold) *
    ratingWeight(pick.rating) *
    (pick.searched ? 1.15 : 1);
  const reasons: string[] = [];
  if (pick.extras)
    reasons.push("campanha temporária: confira a taxa ao gerar o link");
  if (pick.searched) reasons.push("mais buscado");
  if (pick.sponsored) reasons.push("patrocinado");
  return { status: "queue", score, earningPerSale, reasons };
}

export function buildQueue(
  picks: readonly PanelPick[],
  siteSlugs: readonly string[] = [],
) {
  const evaluated: Evaluated[] = picks.map((pick) => ({
    pick,
    verdict: evaluatePick(pick, siteSlugs),
  }));
  const queue = evaluated
    .filter(
      (
        e,
      ): e is Evaluated & { verdict: Extract<Verdict, { status: "queue" }> } =>
        e.verdict.status === "queue",
    )
    .sort((a, b) => b.verdict.score - a.verdict.score);
  const skipped = evaluated.filter((e) => e.verdict.status === "skip");
  return { queue, skipped };
}

export interface QueueEntry {
  pick: PanelPick;
  /** Passes every rule in QUEUE_RULES; the rest are still listed, lower. */
  recommended: boolean;
  score: number;
  earningPerSale: number;
  notes: string[];
}

/**
 * Every pasted product goes to the "generate link" list — nothing is dropped.
 * Ordered by most sold, then commission in reais, then best rated — never a
 * hard cutoff. `recommended` (rating
 * >= 4.5, sold >= 500) is kept as a note for the UI, not a sorting bucket. Products the site already has are
 * returned separately (no link needed). Sensitive injectable-health items
 * are kept but always score last, with a warning.
 */
export function rankAllForLinking(
  picks: readonly PanelPick[],
  siteSlugs: readonly string[] = [],
) {
  const onSite: PanelPick[] = [];
  const toLink: QueueEntry[] = [];
  for (const pick of picks) {
    if (isAlreadyOnSite(pick.title, siteSlugs)) {
      onSite.push(pick);
      continue;
    }
    const earningPerSale = pick.rate * pick.price;
    const rawScore =
      earningPerSale *
      demandWeight(pick.sold) *
      ratingWeight(pick.rating) *
      (pick.searched ? 1.15 : 1);
    const notes: string[] = [];
    const verdict = evaluatePick(pick, []);
    const recommended = verdict.status === "queue";
    if (verdict.status === "skip") notes.push(verdict.reason);
    if (pick.extras)
      notes.push("campanha temporária: confira a taxa ao gerar o link");
    if (pick.searched) notes.push("mais buscado");
    if (pick.sponsored) notes.push("patrocinado");
    if (pick.featured) notes.push("Top 20 de maior preço");
    const sensitive = pick.group === "saude-injetavel";
    toLink.push({
      pick,
      recommended: recommended && !sensitive,
      score: sensitive ? -1 : rawScore,
      earningPerSale,
      notes,
    });
  }
  // Featured rows (the owner's Top 20 by price, 2026-09-25) come first, by
  // commission in reais. The rest: most sold first ("+N vendidos"),
  // then biggest commission in reais within the same sales level, then best
  // rated (no rating last). Temporary campaigns are mixed in like any other
  // row (flagged in the notes). `score` is no longer the sort key — it stays
  // on the entry for callers that show it. Sensitive injectable-health items
  // (score -1) always go last.
  toLink.sort(
    (a, b) =>
      Number(a.score < 0) - Number(b.score < 0) ||
      Number(!!b.pick.featured) - Number(!!a.pick.featured) ||
      (a.pick.featured && b.pick.featured
        ? b.earningPerSale - a.earningPerSale || b.pick.sold - a.pick.sold
        : 0) ||
      b.pick.sold - a.pick.sold ||
      b.earningPerSale - a.earningPerSale ||
      (b.pick.rating ?? -1) - (a.pick.rating ?? -1),
  );
  return { toLink, onSite };
}

/**
 * Rows whose panel address carries the catalog product id (/p/MLB…) first, the
 * rest (user-product /up/ addresses and single listings) after, each group in
 * its own order. Measured on Beleza (2026-09-26): none of the 523 rows with a
 * catalog id repeats another, while every "same product already live" and
 * every "not a catalog product" dead end came from the 152 without one — so
 * the owner works the safe rows first and meets the risky ones last.
 */
export function catalogFirst<T extends { pick: { productUrl?: string } }>(
  entries: readonly T[],
): T[] {
  const has = (e: T) =>
    !!expectedIdsFromProductUrl(e.pick.productUrl).catalogId;
  return [...entries.filter(has), ...entries.filter((e) => !has(e))];
}
