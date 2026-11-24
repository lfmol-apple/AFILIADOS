/**
 * Deterministic relevance classification for a Shopee keyword-search
 * result against the real demand term that produced it (General Market
 * Scanner V1 / Demand-Driven Discovery, 2026-09-08 — project brief
 * section 8: "RELEVANT / IRRELEVANT / UNCERTAIN... não usar LLM nesta
 * fase"). Confirmed necessary with a real, controlled test: searching
 * Shopee's productOfferV2 for "Galaxy A17" returned cases/screen
 * protectors, not the phone itself — a diagnostic finding from the prior
 * round (docs/DEMAND_DRIVEN_DISCOVERY.md).
 *
 * Pure, no network, no Prisma — same shape as lib/services/
 * product-variant-guard.ts.
 */
export type RelevanceStatus = "RELEVANT" | "IRRELEVANT" | "UNCERTAIN";

export interface RelevanceResult {
  status: RelevanceStatus;
  reason: string;
}

// Real accessory/replacement-part signal words observed in this project's
// own controlled Shopee test (capa, capinha, película for phone cases;
// puxador/alça/botão for appliance replacement parts) plus their common
// variants. Deliberately conservative and short — a false "accessory"
// classification only costs a missed RELEVANT candidate (acceptable,
// precision over coverage), never a wrong grouping (ProductMatcher's own
// variant guard is the real safety net either way).
const ACCESSORY_SIGNAL_WORDS = [
  "capa",
  "capinha",
  "case",
  "pelicula",
  "película",
  "protetor de tela",
  "skin",
  "adesivo",
  "suporte para",
  "cabo para",
  "carregador para",
  "puxador",
  "alça",
  "botao",
  "botão",
  "peça de reposição",
  "peca de reposicao",
  "reposição",
  "reposicao",
  "compatível com",
  "compativel com",
  "kit de limpeza",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function significantWords(term: string): string[] {
  return normalize(term)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/**
 * `term` is the real demand term that drove the search (e.g. "Samsung
 * Galaxy A17"); `resultTitle` is one real Shopee productOfferV2 result
 * for that search. Never fabricates a judgment when there isn't enough
 * signal — returns UNCERTAIN rather than guessing either direction.
 */
export function classifyRelevance(term: string, resultTitle: string): RelevanceResult {
  const normalizedTitle = normalize(resultTitle);
  const termWords = significantWords(term);
  const termIsItselfAccessory = ACCESSORY_SIGNAL_WORDS.some((w) => normalize(term).includes(w));

  const accessoryWordFound = ACCESSORY_SIGNAL_WORDS.find((w) => normalizedTitle.includes(w));
  if (accessoryWordFound && !termIsItselfAccessory) {
    return {
      status: "IRRELEVANT",
      reason: `título contém sinal de acessório/peça ("${accessoryWordFound}") mas o termo buscado não é um acessório`,
    };
  }

  const matchedWords = termWords.filter((w) => normalizedTitle.includes(w));
  const coverage = termWords.length > 0 ? matchedWords.length / termWords.length : 0;

  if (coverage >= 0.75) {
    return { status: "RELEVANT", reason: `${matchedWords.length}/${termWords.length} palavras do termo presentes no título` };
  }
  if (coverage === 0) {
    return { status: "IRRELEVANT", reason: "nenhuma palavra significativa do termo aparece no título" };
  }
  return {
    status: "UNCERTAIN",
    reason: `apenas ${matchedWords.length}/${termWords.length} palavras do termo presentes — sinal insuficiente para decidir`,
  };
}
