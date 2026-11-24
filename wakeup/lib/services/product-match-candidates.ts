import { isValidGtin, normalizeGtin } from "./gtin";
import type { MatchableListing } from "@/types/product-match";

/**
 * Conservative candidate-pair generation for ProductMatcher Shadow Mode
 * (2026-09-08) — project brief section 6: "NÃO comparar cada listing com
 * todos os outros indiscriminadamente... nunca executar comparação
 * textual global N×N". Pure, deterministic, no Prisma/network — takes
 * the same MatchableListing shape matchListings() already accepts, plus
 * one grouping tag used only to decide which tiers may pair within a
 * group vs. only across groups.
 *
 * Priority cascade (project brief section 6, verbatim order):
 *  1. same (validated) GTIN — cheap O(n) grouping, allowed within or
 *     across merchant groups (a real identifier is trustworthy either way).
 *  2. same manufacturerId — same pattern (no source populates this today
 *     — see product-match-input.ts — so this tier is structurally a
 *     no-op against current real data, kept for when a source eventually
 *     does).
 *  3. normalized brand+model — CROSS-GROUP ONLY (project brief section 7:
 *     "não gastar processamento provando que 15 anúncios quase idênticos
 *     do mesmo merchant são o mesmo produto" — that's already handled by
 *     canonicalProductId for Mercado Livre, so this tier only exists to
 *     find matches ACROSS merchants).
 *  4. textual candidates — CROSS-GROUP ONLY, and only within a
 *     "restricted universe": two listings are only even considered if
 *     they share at least one significant title token (a lightweight
 *     inverted-index / blocking technique) — never a blind pairwise scan
 *     of every listing against every other.
 *
 * Every strategy only PROPOSES a pair — matchListings() (unchanged) still
 * makes the actual confidence/status decision per pair, exactly once
 * (pairs are deduplicated across strategies before that call).
 */
export interface MatchCandidateInput extends MatchableListing {
  /** Coarse grouping (e.g. a merchant code) used only to decide which
   * tiers may pair listings within the same group — never passed to
   * matchListings() itself. */
  group: string;
}

export interface CandidatePair {
  a: MatchCandidateInput;
  b: MatchCandidateInput;
}

// A short, deliberately conservative Portuguese/English stopword list for
// the textual-candidate blocking index — excludes near-universal
// connector words that would otherwise make almost every pair of listings
// "share a token" and defeat the point of blocking. Never excludes a
// brand/model/number token.
const STOPWORDS = new Set([
  "para",
  "com",
  "sem",
  "com o",
  "dual",
  "novo",
  "nova",
  "original",
  "premium",
  "universal",
  "compativel",
  "compatible",
  "with",
  "and",
  "the",
  "for",
]);

function significantTokens(title: string): Set<string> {
  const tokens = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !/^\d+$/.test(t) && !STOPWORDS.has(t));
  return new Set(tokens);
}

function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join("|");
}

function addWithinGroups(
  groups: Iterable<MatchCandidateInput[]>,
  crossGroupOnly: boolean,
  addPair: (a: MatchCandidateInput, b: MatchCandidateInput) => void,
) {
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        if (crossGroupOnly && a.group === b.group) continue;
        addPair(a, b);
      }
    }
  }
}

export function generateCandidatePairs(listings: MatchCandidateInput[]): CandidatePair[] {
  const pairs = new Map<string, CandidatePair>();
  const addPair = (a: MatchCandidateInput, b: MatchCandidateInput) => {
    if (a.id === b.id) return;
    const key = pairKey(a.id, b.id);
    if (!pairs.has(key)) pairs.set(key, { a, b });
  };

  // Tier 1: GTIN (validated) — cheap grouping, intra- or cross-group.
  const gtinGroups = new Map<string, MatchCandidateInput[]>();
  for (const l of listings) {
    if (!isValidGtin(l.gtin)) continue;
    const key = normalizeGtin(l.gtin)!;
    (gtinGroups.get(key) ?? gtinGroups.set(key, []).get(key)!).push(l);
  }
  addWithinGroups(gtinGroups.values(), false, addPair);

  // Tier 2: manufacturerId — same pattern (no-op today, no source sets it).
  const mfgGroups = new Map<string, MatchCandidateInput[]>();
  for (const l of listings) {
    const key = l.manufacturerId?.trim().toLowerCase();
    if (!key) continue;
    (mfgGroups.get(key) ?? mfgGroups.set(key, []).get(key)!).push(l);
  }
  addWithinGroups(mfgGroups.values(), false, addPair);

  // Tier 3: normalized brand+model — cross-group only.
  const bmGroups = new Map<string, MatchCandidateInput[]>();
  for (const l of listings) {
    const brand = l.brand?.trim().toLowerCase();
    const model = l.model?.trim().toLowerCase();
    if (!brand || !model) continue;
    const key = `${brand}::${model}`;
    (bmGroups.get(key) ?? bmGroups.set(key, []).get(key)!).push(l);
  }
  addWithinGroups(bmGroups.values(), true, addPair);

  // Tier 4: textual — cross-group only, blocked by shared significant token.
  const tokenIndex = new Map<string, MatchCandidateInput[]>();
  for (const l of listings) {
    for (const token of significantTokens(l.title)) {
      (tokenIndex.get(token) ?? tokenIndex.set(token, []).get(token)!).push(l);
    }
  }
  addWithinGroups(tokenIndex.values(), true, addPair);

  return [...pairs.values()];
}
