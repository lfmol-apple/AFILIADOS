import type { PanelPick } from "@/lib/config/ml-panel-picks";

/** Criteria a panel product must clear to enter the "generate link" queue. */
export const QUEUE_RULES = {
  /** Below this the payout is not worth a link slot. */
  minRate: 0.1,
  /** Quality gate: the site already refuses weak-rated items elsewhere. A
   * product with no rating shown is excluded, never assumed good. */
  minRating: 4.5,
  /** "+N vendidos" floor: real proof people buy it. */
  minSold: 500,
  /** Heuristic, tunable: an expensive item converts far less per click, so
   * price only counts up to this cap when estimating value. The owner's own
   * panel (16 clicks, 4 orders, R$ 18,75) points at cheap items converting. */
  priceCap: 300,
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

function demandWeight(sold: number): number {
  if (sold >= 100000) return 1;
  if (sold >= 10000) return 0.8;
  if (sold >= 5000) return 0.65;
  if (sold >= 1000) return 0.5;
  return 0.4;
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
  if (pick.rate < QUEUE_RULES.minRate)
    return {
      status: "skip",
      reason: `comissão ${Math.round(pick.rate * 100)}% abaixo de 10%`,
    };
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
    pick.rate *
    demandWeight(pick.sold) *
    Math.min(pick.price, QUEUE_RULES.priceCap);
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
