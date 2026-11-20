import { describe, expect, it } from "vitest";
import { auditCandidate } from "@/lib/services/commercial-intelligence/commercial-audit";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import { officialRankEvidence } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import { evaluatePriceCompetitiveness } from "@/lib/services/commercial-intelligence/price-competitiveness";

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
        commissionType: "unknown",
        staleNotRecomputedThisCycle: true,
      }),
    ).not.toThrow();
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
      commissionType: "confirmed_individual",
      staleNotRecomputedThisCycle: false,
    });
    expect(result.verdict).toBe("aprovado_para_teste");
  });
});
