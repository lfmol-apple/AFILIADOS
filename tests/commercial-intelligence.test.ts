import { describe, expect, it } from "vitest";
import { evaluateCommercialEligibility } from "@/lib/services/commercial-intelligence/eligibility";
import { checkAdEligibility } from "@/lib/config/vitrine-ineligible-keywords";
import { bucketedSoldQuantityEvidence, exactSoldQuantityEvidence } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluatePriceCompetitiveness } from "@/lib/services/commercial-intelligence/price-competitiveness";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import { VITRINE_SCORE_WEIGHTS } from "@/lib/config/vitrine-score-weights";
import { officialRankEvidence } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import { titleHasRequiredAnchor } from "@/jobs/vitrine-discovery";

describe("checkAdEligibility — found live, 2026-11-19", () => {
  it("blocks the real tactical/militaria items that were previously selected", () => {
    expect(checkAdEligibility("Mochila Tática Masculina Militar 50L Impermeável Reforçada Grande Molle Viagem Camping Trilha Airsoft Pesca Caça Forpak").eligible).toBe(false);
    expect(checkAdEligibility("Lanterna Tática Mais Forte Do Mundo 2km LED Power Bank Recarregável USB-C Sabre De Luz Militar Longo Alcance").eligible).toBe(false);
  });

  it("does not block an ordinary product", () => {
    expect(checkAdEligibility("Creme Hidratante Facial Corporal Pele Seca 3 Ceramidas CeraVe 50g").eligible).toBe(true);
  });
});

describe("evaluateCommercialEligibility", () => {
  it("blocks a seller without yellow/green reputation", () => {
    const result = evaluateCommercialEligibility({
      title: "Produto normal",
      sellerReputationLevel: "1_red",
      condition: "new",
      hasConfirmedPrice: true,
    });
    expect(result.eligible).toBe(false);
  });

  it("blocks a used product (ML affiliate program only pays for new/refurbished)", () => {
    const result = evaluateCommercialEligibility({
      title: "Produto normal",
      sellerReputationLevel: "5_green",
      condition: "used",
      hasConfirmedPrice: true,
    });
    expect(result.eligible).toBe(false);
  });

  it("treats unknown reputation/condition as unknown, not automatically favorable, but still passes with no OTHER blocker (owner's rule: unknown != favorable, but also != negative evidence)", () => {
    const result = evaluateCommercialEligibility({
      title: "Produto normal",
      sellerReputationLevel: null,
      condition: null,
      hasConfirmedPrice: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.unknownFacts.length).toBe(2);
  });

  it("passes a genuinely eligible product", () => {
    const result = evaluateCommercialEligibility({
      title: "Produto normal",
      sellerReputationLevel: "5_green",
      condition: "new",
      hasConfirmedPrice: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.blockedReasons).toHaveLength(0);
  });
});

describe("bucketedSoldQuantityEvidence — owner's correction, 2026-11-19", () => {
  it("gives the exact same score to any two products in the same real bucket (never invents a difference)", () => {
    const a = bucketedSoldQuantityEvidence(10_000);
    const b = bucketedSoldQuantityEvidence(10_000);
    expect(a.demandScore).toBe(b.demandScore);
  });

  it("a higher bucket scores higher than a lower one", () => {
    const low = bucketedSoldQuantityEvidence(50);
    const high = bucketedSoldQuantityEvidence(10_000);
    expect(high.demandScore!).toBeGreaterThan(low.demandScore!);
  });
});

describe("exactSoldQuantityEvidence — gentler curve than the old formula", () => {
  it("does not saturate at the old ~10k ceiling", () => {
    const at10k = exactSoldQuantityEvidence(10_000);
    const at500k = exactSoldQuantityEvidence(500_000);
    expect(at500k.demandScore!).toBeGreaterThan(at10k.demandScore!);
  });
});

describe("evaluatePriceCompetitiveness", () => {
  it("scores the cheapest real offer as most competitive", () => {
    const result = evaluatePriceCompetitiveness({
      merchantListingId: "x",
      siblingOffers: [
        { price: 100, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
        { price: 120, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null },
      ],
      thisPrice: 90,
      priceHistory: [],
    });
    expect(result.competitivenessScore).toBe(100);
  });

  it("never fabricates a score with fewer than 1 real sibling offer", () => {
    const result = evaluatePriceCompetitiveness({
      merchantListingId: "x",
      siblingOffers: [],
      thisPrice: 90,
      priceHistory: [],
    });
    expect(result.competitivenessScore).toBeNull();
  });
});

describe("titleHasRequiredAnchor — found live in homologation, 2026-11-19", () => {
  const RÉVEILLON_ANCHORS = ["réveillon", "reveillon", "ano novo", "virada"];

  it("rejects the real false match: laundry detergent matched via 'roupa branca'", () => {
    expect(titleHasRequiredAnchor("Lava Roupa Branca Colorida Enzimas Mon Bijou 3l", RÉVEILLON_ANCHORS)).toBe(false);
  });

  it("rejects the real false match: religious white clothing matched via 'roupa branca'", () => {
    expect(
      titleHasRequiredAnchor("Roupa Branca Conjunto Masculino Umbanda Candomblé 2 Peças Cor Branco", RÉVEILLON_ANCHORS),
    ).toBe(false);
  });

  it("accepts a genuine match (accent-insensitive)", () => {
    expect(titleHasRequiredAnchor("Vestido Branco Longo Reveillon Ano Novo Luxo", RÉVEILLON_ANCHORS)).toBe(true);
  });

  it("accepts a genuine match found live that an overly-strict 'virada do ano' anchor had wrongly rejected", () => {
    expect(titleHasRequiredAnchor("Body Ano Bebê Mini Look Branco Da Virada Cor Modelo 07 Tamanho G", RÉVEILLON_ANCHORS)).toBe(
      true,
    );
  });

  it("passes through unchanged when the event declares no anchor terms", () => {
    expect(titleHasRequiredAnchor("Árvore De Natal Nevada 1,8m", undefined)).toBe(true);
    expect(titleHasRequiredAnchor("Árvore De Natal Nevada 1,8m", [])).toBe(true);
  });
});

describe("sensitivity — weight perturbation (owner's requirement, section 8)", () => {
  it("a ±20% perturbation of one weight does not flip a clear winner's rank against a clear loser", () => {
    const strong = {
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: 0.3, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 200 }),
      priceCompetitiveness: evaluatePriceCompetitiveness({ merchantListingId: "a", siblingOffers: [{ price: 150, condition: "new", sellerReputationLevel: "5_green", mlCategoryId: null }], thisPrice: 100, priceHistory: [] }),
      qualitySignal: { value: 90, quality: "OBSERVED" as const, detail: "q" },
      seasonalEvent: null,
      trendDirection: "rising" as const,
      vitrineClickCount: 10,
    };
    const weak = {
      salesEvidence: officialRankEvidence(45),
      commissionEvidence: evaluateCommissionEvidence({ individualRate: null, individualCapturedAt: null, mlCategoryId: null, currentPrice: null }),
      priceCompetitiveness: evaluatePriceCompetitiveness({ merchantListingId: "b", siblingOffers: [], thisPrice: null, priceHistory: [] }),
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    };

    const baseStrong = calculateVitrineScore(strong).rankingScore;
    const baseWeak = calculateVitrineScore(weak).rankingScore;
    expect(baseStrong).toBeGreaterThan(baseWeak);

    // Perturb every weight ±20% one at a time — the strong candidate
    // must keep outranking the weak one regardless (a real multi-
    // dimension gap should be robust to small weight changes; if a
    // single ±20% tweak flips it, the model is on a knife-edge).
    for (const key of Object.keys(VITRINE_SCORE_WEIGHTS) as Array<keyof typeof VITRINE_SCORE_WEIGHTS>) {
      for (const factor of [0.8, 1.2]) {
        // calculateVitrineScore reads VITRINE_SCORE_WEIGHTS directly, so
        // this test mutates the shared config in place and restores it —
        // acceptable within a single synchronous test, never left mutated.
        const original = VITRINE_SCORE_WEIGHTS[key];
        (VITRINE_SCORE_WEIGHTS as Record<string, number>)[key] = original * factor;
        const strongScore = calculateVitrineScore(strong).rankingScore;
        const weakScore = calculateVitrineScore(weak).rankingScore;
        (VITRINE_SCORE_WEIGHTS as Record<string, number>)[key] = original;
        expect(strongScore).toBeGreaterThan(weakScore);
      }
    }
  });
});
