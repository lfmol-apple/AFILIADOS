import { describe, expect, it } from "vitest";
import { classifySufficiency, commercialProfile, readyForAdInvestment } from "@/lib/services/commercial-intelligence/evidence-sufficiency";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import { officialRankEvidence } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import { evaluatePriceCompetitiveness } from "@/lib/services/commercial-intelligence/price-competitiveness";

describe("classifySufficiency — owner's correction, 2026-11-19, section 6", () => {
  it("a product with only one real dimension (the emergente case found live) is insufficient, even with score 100", () => {
    const result = calculateVitrineScore({
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
    expect(result.score).toBe(100); // the real bug being classified, not fixed
    expect(classifySufficiency(result)).toBe("insufficient");
    expect(readyForAdInvestment(result)).toBe(false);
  });

  it("owner's correction, 2026-11-19 (Ordem de Execução, seção 4): a product whose ONLY real dimension is a stale (>45d) commission observation is insufficient — the exact 'campeão recorrente by a September commission' bug", () => {
    const old = new Date(Date.now() - 90 * 86_400_000);
    const result = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.3, individualCapturedAt: old, mlCategoryId: null, currentPrice: 500 }),
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(classifySufficiency(result)).toBe("insufficient");
    expect(readyForAdInvestment(result)).toBe(false);
  });

  it("a product that would clear 'adequate' (4 real dimensions) with a FRESH commission drops to merely 'partial' when that same commission is stale — the degraded dimension never counts toward the total", () => {
    const base = {
      salesEvidence: officialRankEvidence(2),
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [{ price: 150, condition: "new" as const, sellerReputationLevel: "5_green" as const, mlCategoryId: null }],
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: { value: 80, quality: "OBSERVED" as const, detail: "q" },
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    };
    const withFreshCommission = calculateVitrineScore({
      ...base,
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 }),
    });
    const withStaleCommission = calculateVitrineScore({
      ...base,
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(Date.now() - 90 * 86_400_000), mlCategoryId: null, currentPrice: 100 }),
    });
    expect(classifySufficiency(withFreshCommission)).toBe("adequate");
    expect(classifySufficiency(withStaleCommission)).toBe("partial");
  });

  it("a product with 4+ real dimensions is adequate", () => {
    const result = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 }),
      priceCompetitiveness: evaluatePriceCompetitiveness({
        merchantListingId: "x",
        siblingOffers: [{ price: 150, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null }],
        thisPrice: 100,
        priceHistory: [],
      }),
      qualitySignal: { value: 80, quality: "OBSERVED", detail: "q" },
      seasonalEvent: null,
      trendDirection: "rising",
      vitrineClickCount: 0,
    });
    expect(classifySufficiency(result)).toBe("adequate");
    expect(readyForAdInvestment(result)).toBe(true);
  });

  it("2-3 real dimensions is partial, not adequate, not insufficient", () => {
    const result = calculateVitrineScore({
      salesEvidence: officialRankEvidence(5),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 }),
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(classifySufficiency(result)).toBe("partial");
  });
});

describe("commercialProfile — owner's requirement, section 3", () => {
  it("labels a strong seasonal + commission product without collapsing it to one score", () => {
    const result = calculateVitrineScore({
      salesEvidence: officialRankEvidence(3),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.3, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 200 }),
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: {
        event: { id: "natal", name: "Natal", eventType: "tematico", peakDate: () => new Date(), categoryIds: [], keywords: [] },
        stage: "crescimento",
        daysUntilPeak: 10,
      } as never,
      trendDirection: "rising",
      vitrineClickCount: 0,
    });
    const labels = commercialProfile(result);
    expect(labels).toContain("muito_vendido");
    expect(labels).toContain("comissao_atrativa");
    expect(labels).toContain("vendas_em_crescimento");
    expect(labels).not.toContain("informacao_insuficiente");
  });

  it("falls back to informacao_insuficiente when no dimension clears any threshold", () => {
    const result = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(commercialProfile(result)).toEqual(["informacao_insuficiente"]);
  });
});
