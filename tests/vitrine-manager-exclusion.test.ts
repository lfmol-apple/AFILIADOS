import { describe, expect, it } from "vitest";
import { applyCrossVitrineExclusion } from "@/lib/services/vitrine-manager";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", section 9: "quando duas vitrines desejarem o mesmo
 * produto, o sistema deverá aplicar uma política determinística e
 * auditável"). Pure, DB-free tests of the exclusion+re-rank policy,
 * same fixture style as tests/vitrine-global-selection.test.ts.
 */
function fakeCandidate(overrides: Partial<VitrineCandidate> & { merchantListingId: string; canonicalProductId: string; rankingScore: number }): VitrineCandidate {
  return {
    title: "Produto Teste",
    score: overrides.rankingScore,
    group: "recorrente",
    reason: "Pontuação multifatorial calculada.",
    scoreBreakdown: { score: overrides.rankingScore, confidence: 1, rankingScore: overrides.rankingScore, components: {}, reasons: [], degradedDimensions: [] } as unknown as VitrineCandidate["scoreBreakdown"],
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

describe("applyCrossVitrineExclusion — deterministic, auditable cross-vitrine distribution", () => {
  it("excludes a candidate whose real canonicalProductId is already ACTIVE in another vitrine, reporting it as blocked", () => {
    const held = new Map([["canonical-A", "vitrine-other"]]);
    const contested = fakeCandidate({ merchantListingId: "listing-1", canonicalProductId: "canonical-A", rankingScore: 90 });
    const free = fakeCandidate({ merchantListingId: "listing-2", canonicalProductId: "canonical-B", rankingScore: 50 });

    const result = applyCrossVitrineExclusion([contested, free], held, 30);

    expect(result.eligible.map((c) => c.merchantListingId)).toEqual(["listing-2"]);
    expect(result.blockedByOtherVitrine).toHaveLength(1);
    expect(result.blockedByOtherVitrine[0]!.candidate.merchantListingId).toBe("listing-1");
    expect(result.blockedByOtherVitrine[0]!.heldByVitrineId).toBe("vitrine-other");
  });

  it("exclusion is keyed on canonicalProductId, not merchantListingId — two DIFFERENT listings of the SAME real product are both blocked", () => {
    const held = new Map([["canonical-shared", "vitrine-other"]]);
    const listingOne = fakeCandidate({ merchantListingId: "listing-seller-a", canonicalProductId: "canonical-shared", rankingScore: 80 });
    const listingTwo = fakeCandidate({ merchantListingId: "listing-seller-b", canonicalProductId: "canonical-shared", rankingScore: 70 });

    const result = applyCrossVitrineExclusion([listingOne, listingTwo], held, 30);

    expect(result.eligible).toHaveLength(0);
    expect(result.blockedByOtherVitrine).toHaveLength(2);
  });

  it("never blocks a candidate when nothing else holds its canonical product — the common, unexclusive case", () => {
    const held = new Map<string, string>();
    const candidate = fakeCandidate({ merchantListingId: "listing-1", canonicalProductId: "canonical-A", rankingScore: 50 });
    const result = applyCrossVitrineExclusion([candidate], held, 30);
    expect(result.eligible).toEqual([candidate]);
    expect(result.blockedByOtherVitrine).toHaveLength(0);
  });

  it("re-ranks the FREE pool by the same real rankingScore after exclusion — never just the original order with gaps removed", () => {
    const held = new Map([["canonical-top", "vitrine-other"]]);
    const blockedTop = fakeCandidate({ merchantListingId: "blocked", canonicalProductId: "canonical-top", rankingScore: 99 });
    const weak = fakeCandidate({ merchantListingId: "weak", canonicalProductId: "canonical-weak", rankingScore: 10 });
    const strong = fakeCandidate({ merchantListingId: "strong", canonicalProductId: "canonical-strong", rankingScore: 60 });

    const result = applyCrossVitrineExclusion([blockedTop, weak, strong], held, 30);

    expect(result.eligible.map((c) => c.merchantListingId)).toEqual(["strong", "weak"]);
  });

  it("never exceeds the requested limit, even with many free candidates", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      fakeCandidate({ merchantListingId: `c${i}`, canonicalProductId: `canonical-${i}`, rankingScore: 100 - i }),
    );
    const result = applyCrossVitrineExclusion(candidates, new Map(), 3);
    expect(result.eligible).toHaveLength(3);
    expect(result.eligible.map((c) => c.merchantListingId)).toEqual(["c0", "c1", "c2"]);
  });
});
