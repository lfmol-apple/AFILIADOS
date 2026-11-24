import { describe, expect, it } from "vitest";
import { auditCandidate } from "@/lib/services/commercial-intelligence/commercial-audit";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import { officialRankEvidence } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import { evaluatePriceCompetitiveness } from "@/lib/services/commercial-intelligence/price-competitiveness";
import type { ActiveCommercialEvent } from "@/lib/services/commercial-calendar-engine";

const NATAL_EVENT = {
  event: { id: "natal", name: "Natal", eventType: "tematico", peakDate: () => new Date(), categoryIds: [], keywords: [] },
  stage: "antecipacao",
  daysUntilPeak: 35,
} as unknown as ActiveCommercialEvent;

describe("auditCandidate — owner's requirement, 2026-11-20 (Auditoria Contínua, section 7): never reuses the score as proof", () => {
  it("never reads .score or .rankingScore — a high-scoring but single-signal, single-competitor case is still flagged", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: null,
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [{ price: 50, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null }],
        thisPrice: 30,
        priceHistory: [],
      }),
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(breakdown.score).toBe(100); // the exact "emergente score 100 off nothing" bug from the earlier review
    const result = auditCandidate({
      breakdown,
      group: "emergente",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 1,
      hasConfirmedPriceDrop: false,
      commissionType: "unknown",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).not.toBe("aprovado_para_teste");
    expect(result.risks.some((r) => r.includes("apenas 1 concorrente"))).toBe(true);
  });

  it("rejects outright a product whose evidence wasn't recomputed this cycle, no matter how good the frozen numbers look", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 200 }),
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [
          { price: 150, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
          { price: 160, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
        ],
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: { value: 90, quality: "OBSERVED", detail: "q" },
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "recorrente",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 2,
      hasConfirmedPriceDrop: false,
      commissionType: "confirmed_individual",
      staleNotRecomputedThisCycle: true,
    });
    expect(result.verdict).toBe("reprovado");
  });

  it("rejects a foreign-language title outright, regardless of how strong the rest of the evidence is", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 200 }),
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [
          { price: 150, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
          { price: 160, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
        ],
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: { value: 90, quality: "OBSERVED", detail: "q" },
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "recorrente",
      descriptionQuality: "inadequada",
      priceCompetitivenessSampleSize: 2,
      hasConfirmedPriceDrop: false,
      commissionType: "confirmed_individual",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("reprovado");
  });

  it("owner's finding, 2026-11-20: never crashes on a legacy breakdown stored before degradedDimensions existed (undefined, not an empty array)", () => {
    const legacyBreakdown = {
      score: 84,
      confidence: 0.5,
      rankingScore: 42,
      reasons: ["commissionValue: ..."],
      components: {
        commissionValue: { value: 73, weight: 0.2, detail: "x" },
        quality: { value: 96, weight: 0.15, detail: "x" },
      },
      // degradedDimensions intentionally absent — the real legacy shape.
    } as unknown as import("@/lib/services/vitrine-score").VitrineScoreResult;
    expect(() =>
      auditCandidate({
        breakdown: legacyBreakdown,
        group: "recorrente",
        descriptionQuality: "adequada",
        priceCompetitivenessSampleSize: 0,
        hasConfirmedPriceDrop: false,
        commissionType: "unknown",
        staleNotRecomputedThisCycle: true,
      }),
    ).not.toThrow();
  });

  it("owner's recalibration, 2026-11-20 ('Auditoria dos 29 produtos'): 2 solid non-commission dimensions (price position + quality) approve the candidate even when the ONLY commission known is stale — never treating it as zero, never letting it override independent evidence", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.25, individualCapturedAt: new Date(Date.now() - 55 * 86_400_000), mlCategoryId: null, currentPrice: 300 }),
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: Array.from({ length: 26 }, (_, i) => ({ price: 100 + i, condition: "new" as const, sellerReputationLevel: "5_green" as const, mlCategoryId: null })),
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: { value: 96, quality: "OBSERVED", detail: "q" },
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "recorrente",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 26,
      hasConfirmedPriceDrop: false,
      commissionType: "historical",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("aprovado_para_teste");
    // disclosed, never hidden, even on approval
    expect(result.risks.some((r) => r.includes("histórica"))).toBe(true);
  });

  it("owner's recalibration: unknown commission is disclosed as an informational gap, never as a blocker, when 2 other SOLID real dimensions hold up (official rank + a multi-competitor price check)", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: officialRankEvidence(5),
      commissionEvidence: null,
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [
          { price: 150, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
          { price: 160, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
        ],
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "recorrente",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 2,
      hasConfirmedPriceDrop: false,
      commissionType: "unknown",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("aprovado_para_teste");
    expect(result.risks.some((r) => r.includes("Incerteza informacional") && r.includes("comissão desconhecida"))).toBe(true);
  });

  it("owner's recalibration: exactly ONE solid non-commission dimension (seasonality alone, no price data at all) is still only 'revisão necessária' — never enough on its own", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.3, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 500 }),
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: NATAL_EVENT,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "sazonal",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 0,
      hasConfirmedPriceDrop: false,
      commissionType: "confirmed_individual",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("revisao_necessaria");
  });

  it("owner's finding, 2026-11-20 ('Primeiro teste real da Vitrine'): the real R$474,05 'Guirlanda Natal' pattern — a price backed by exactly 1 sibling with NO confirmed discount, plus a bare seasonal-keyword match and nothing else — is REPROVADO, not approved. Neither dimension was actually solid on its own.", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: null, // search-relevance-only, never real demand evidence
      commissionEvidence: null,
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [{ price: 499.01, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null }],
        thisPrice: 474.05,
        priceHistory: [],
      }),
      qualitySignal: null,
      seasonalEvent: NATAL_EVENT,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "sazonal",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 1,
      hasConfirmedPriceDrop: false,
      commissionType: "unknown",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("reprovado");
  });

  it("the SAME price-only-one-sibling case is approved once there's a real, confirmed discount backing it — a thin sample is not disqualifying when independently corroborated", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: null,
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [{ price: 499.01, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null }],
        thisPrice: 474.05,
        priceHistory: [],
      }),
      qualitySignal: null,
      seasonalEvent: NATAL_EVENT,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "sazonal",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 1,
      hasConfirmedPriceDrop: true,
      commissionType: "unknown",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("aprovado_para_teste");
  });

  it("owner's recalibration: zero non-commission dimensions is still outright REPROVADO even with a confirmed, fresh, high commission — the exact original 'campeão recorrente só por comissão' bug", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.4, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 1000 }),
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "recorrente",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 0,
      hasConfirmedPriceDrop: false,
      commissionType: "confirmed_individual",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("reprovado");
  });

  it("approves a genuinely well-supported candidate: 4 real dimensions, multi-competitor price check, fresh commission, no risks", () => {
    const breakdown = calculateVitrineScore({
      salesEvidence: officialRankEvidence(2),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 200 }),
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [
          { price: 150, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
          { price: 160, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
          { price: 170, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
        ],
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: { value: 90, quality: "OBSERVED", detail: "q" },
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const result = auditCandidate({
      breakdown,
      group: "recorrente",
      descriptionQuality: "adequada",
      priceCompetitivenessSampleSize: 3,
      hasConfirmedPriceDrop: false,
      commissionType: "confirmed_individual",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("aprovado_para_teste");
  });
});
