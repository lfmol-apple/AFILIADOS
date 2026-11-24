import { describe, expect, it } from "vitest";
import { pickGlobalVitrineSelection } from "@/lib/services/vitrine-selection";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Owner's authorization, 2026-11-22 ("Corrigir a competição comercial —
 * substitua as cotas rígidas por uma classificação global"). Real root
 * cause confirmed live the same day, against the real production
 * candidate pool: with the old per-group quota (12 sazonal / 12
 * recorrente / 6 emergente, each filled independently), "recorrente" had
 * 439 real eligible candidates for only 12 slots while "sazonal" had 11
 * for 12 — so a sazonal candidate with rankingScore as low as 14-17
 * (e.g. a real Presépio/nativity set) held a GUARANTEED slot ahead of
 * real recorrente candidates scoring 34 (e.g. a real hair dryer, air
 * fryer, impact driver), because the two groups never competed directly.
 * These tests use fabricated scores at the SAME real magnitudes found
 * live (not the real product names/data) to prove the fix without
 * depending on a database.
 */

function fakeCandidate(overrides: Partial<VitrineCandidate> & { merchantListingId: string; group: VitrineCandidate["group"]; rankingScore: number }): VitrineCandidate {
  return {
    canonicalProductId: `canonical-${overrides.merchantListingId}`,
    title: "Produto Teste",
    score: overrides.rankingScore,
    reason: "Pontuação multifatorial calculada.",
    scoreBreakdown: {
      score: overrides.rankingScore,
      confidence: 1,
      rankingScore: overrides.rankingScore,
      components: {
        salesEvidence: { value: null, weight: 0.2, detail: "" },
        commissionValue: { value: null, weight: 0.2, detail: "" },
        priceCompetitiveness: { value: null, weight: 0.15, detail: "" },
        quality: { value: null, weight: 0.15, detail: "" },
        seasonality: { value: null, weight: 0.15, detail: "" },
        trend: { value: null, weight: 0.1, detail: "" },
        adPerformance: { value: null, weight: 0.05, detail: "" },
      },
      reasons: [],
      degradedDimensions: [],
    } as unknown as VitrineCandidate["scoreBreakdown"],
    matchedEventName: null,
    matchedKeyword: null,
    commissionEvidence: { type: "unknown", rate: null, estimatedValueBrl: null, stale: false },
    priceCompetitiveness: { score: null, siblingOfferCount: 0, hasConfirmedPriceDrop: false },
    adPotentialHypothesis: { impulseFit: "moderado", impulseFitReason: "", offerClarity: "clara", offerClarityReason: "", hasVisibleDiscountHook: false, note: "" },
    categoryId: null,
    commercialAudit: { verdict: "aprovado", reasons: [] } as unknown as VitrineCandidate["commercialAudit"],
    salesEvidenceType: "official_rank",
    ...overrides,
  };
}

describe("pickGlobalVitrineSelection — real root cause fix: global rank replaces rigid per-group quota", () => {
  it("a strong recorrente candidate beats a weak sazonal candidate for the same slot — no guaranteed sazonal floor", () => {
    const weakSeasonal = fakeCandidate({ merchantListingId: "sazonal-weak", group: "sazonal", rankingScore: 17, categoryId: "cat-decor" });
    const strongRecurring1 = fakeCandidate({ merchantListingId: "recorrente-1", group: "recorrente", rankingScore: 50, categoryId: "cat-a" });
    const strongRecurring2 = fakeCandidate({ merchantListingId: "recorrente-2", group: "recorrente", rankingScore: 40, categoryId: "cat-b" });
    const strongRecurring3 = fakeCandidate({ merchantListingId: "recorrente-3", group: "recorrente", rankingScore: 30, categoryId: "cat-c" });

    const { picked, groupReport } = pickGlobalVitrineSelection(
      [weakSeasonal, strongRecurring1, strongRecurring2, strongRecurring3],
      3,
      "Natal",
    );

    expect(picked.map((p) => p.merchantListingId).sort()).toEqual(["recorrente-1", "recorrente-2", "recorrente-3"]);
    expect(picked.find((p) => p.merchantListingId === "sazonal-weak")).toBeUndefined();

    const sazonalReport = groupReport.find((g) => g.group === "sazonal")!;
    expect(sazonalReport.eligible).toBe(1); // it WAS a real candidate
    expect(sazonalReport.selected).toBe(0); // but lost on real merit, not excluded by construction
  });

  it("a genuinely strong sazonal candidate DOES win a slot against weaker recorrente ones — the fix is not anti-seasonal, just anti-quota", () => {
    const strongSeasonal = fakeCandidate({ merchantListingId: "sazonal-strong", group: "sazonal", rankingScore: 80, categoryId: "cat-decor" });
    const weakRecurring1 = fakeCandidate({ merchantListingId: "recorrente-1", group: "recorrente", rankingScore: 20, categoryId: "cat-a" });
    const weakRecurring2 = fakeCandidate({ merchantListingId: "recorrente-2", group: "recorrente", rankingScore: 10, categoryId: "cat-b" });

    const { picked } = pickGlobalVitrineSelection([strongSeasonal, weakRecurring1, weakRecurring2], 2, "Natal");

    expect(picked.map((p) => p.merchantListingId)).toContain("sazonal-strong");
    expect(picked).toHaveLength(2);
  });

  it("never exceeds the requested limit even with far more eligible candidates than slots", () => {
    const candidates = Array.from({ length: 50 }, (_, i) =>
      fakeCandidate({ merchantListingId: `c${i}`, group: "recorrente", rankingScore: 50 - i, categoryId: `cat-${i}` }),
    );
    const { picked } = pickGlobalVitrineSelection(candidates, 30, "nenhum");
    expect(picked).toHaveLength(30);
    // The 30 picked must be exactly the top 30 by rankingScore (c0..c29) since every category is distinct (no concentration conflicts).
    expect(picked.map((p) => p.merchantListingId)).toEqual(candidates.slice(0, 30).map((c) => c.merchantListingId));
  });

  it("diversity (category concentration cap) still applies GLOBALLY, never per group — redundant near-duplicates from the same category don't all get in just because they rank high", () => {
    const sameCategory = Array.from({ length: 4 }, (_, i) =>
      fakeCandidate({ merchantListingId: `dup-${i}`, group: "recorrente", rankingScore: 90 - i, categoryId: "cat-whey" }),
    );
    const diverse = Array.from({ length: 3 }, (_, i) =>
      fakeCandidate({ merchantListingId: `div-${i}`, group: "recorrente", rankingScore: 50 - i, categoryId: `cat-other-${i}` }),
    );
    const { picked } = pickGlobalVitrineSelection([...sameCategory, ...diverse], 5, "nenhum");

    const dupPicked = picked.filter((p) => p.merchantListingId.startsWith("dup-"));
    expect(dupPicked).toHaveLength(2); // MAX_PER_CATEGORY = 2, even though all 4 outrank the diverse ones
    expect(picked).toHaveLength(5); // diversity never leaves a real slot empty — backfilled from the diverse ones
  });

  it("falls back to the matched keyword as the concentration key when categoryId is genuinely unknown (real seasonal-keyword-discovery gap)", () => {
    const sameKeyword = Array.from({ length: 3 }, (_, i) =>
      fakeCandidate({ merchantListingId: `kw-${i}`, group: "sazonal", rankingScore: 60 - i, categoryId: null, matchedKeyword: "decoração natalina" }),
    );
    // Enough diverse alternatives that the 3rd same-keyword candidate is
    // genuinely displaced, not backfilled for lack of anything better.
    const diverse = Array.from({ length: 2 }, (_, i) =>
      fakeCandidate({ merchantListingId: `div-${i}`, group: "recorrente", rankingScore: 55 - i, categoryId: `cat-${i}` }),
    );
    const { picked } = pickGlobalVitrineSelection([...sameKeyword, ...diverse], 4, "Natal");
    const sameKeywordPicked = picked.filter((p) => p.merchantListingId.startsWith("kw-"));
    expect(sameKeywordPicked).toHaveLength(2); // capped by the keyword fallback, not left uncapped just because categoryId is null
    expect(picked.map((p) => p.merchantListingId)).not.toContain("kw-2"); // the weakest of the three, correctly displaced by real diverse alternatives
  });

  it("groupReport reports eligible=0 with a real, honest reason when a group has no real candidates at all — never a silent omission", () => {
    const onlyRecurring = [fakeCandidate({ merchantListingId: "r1", group: "recorrente", rankingScore: 50, categoryId: "cat-a" })];
    const { groupReport } = pickGlobalVitrineSelection(onlyRecurring, 30, "Black Friday, Natal");

    const sazonal = groupReport.find((g) => g.group === "sazonal")!;
    const emergente = groupReport.find((g) => g.group === "emergente")!;
    expect(sazonal.eligible).toBe(0);
    expect(sazonal.selected).toBe(0);
    expect(sazonal.reason).toMatch(/Black Friday, Natal/);
    expect(emergente.reason).toMatch(/tendência de ranking real em alta/);
  });

  it("groupReport never reports a reason when a group has at least one real eligible candidate, even if none of them were selected", () => {
    const weakSeasonal = fakeCandidate({ merchantListingId: "sazonal-weak", group: "sazonal", rankingScore: 5, categoryId: "cat-decor" });
    const strongRecurring = fakeCandidate({ merchantListingId: "recorrente-1", group: "recorrente", rankingScore: 90, categoryId: "cat-a" });
    const { groupReport } = pickGlobalVitrineSelection([weakSeasonal, strongRecurring], 1, "Natal");

    const sazonal = groupReport.find((g) => g.group === "sazonal")!;
    expect(sazonal.eligible).toBe(1);
    expect(sazonal.selected).toBe(0);
    expect(sazonal.reason).toBeNull(); // it had a real shot, it just lost on merit — never mislabeled as "no candidates"
  });
});
