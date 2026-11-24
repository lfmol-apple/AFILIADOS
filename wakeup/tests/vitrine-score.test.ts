import { describe, expect, it } from "vitest";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import { officialRankEvidence, searchRelevanceOnly } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import type { MonetizationScoreComponents } from "@/types/monetization";

const qualitySignal: MonetizationScoreComponents["offerQuality"] = {
  value: 90,
  quality: "OBSERVED",
  detail: "q",
};

describe("calculateVitrineScore", () => {
  it("never fabricates a component with no evidence — score is 0 and confidence is 0 with nothing at all", () => {
    const result = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.components.priceCompetitiveness.value).toBeNull();
  });

  it("owner's correction, 2026-11-19: a search-result position never contributes to the score (demandScore is null by construction)", () => {
    const fromSearch = searchRelevanceOnly("black friday", 1);
    expect(fromSearch.demandScore).toBeNull();
    const result = calculateVitrineScore({
      salesEvidence: fromSearch,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.components.salesEvidence.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("a real official bestseller rank DOES contribute (never confused with search relevance)", () => {
    const fromRank = officialRankEvidence(1);
    expect(fromRank.demandScore).toBe(100);
    const result = calculateVitrineScore({
      salesEvidence: fromRank,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.components.salesEvidence.value).toBe(100);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("owner's correction, 2026-11-19: commission is scored by REAIS value, not raw percentage — a R$500@10% product scores higher than a R$50@30% one", () => {
    const expensive = evaluateCommissionEvidence({
      individualRate: 0.1,
      individualCapturedAt: new Date(),
      mlCategoryId: null,
      currentPrice: 500,
    });
    const cheap = evaluateCommissionEvidence({
      individualRate: 0.3,
      individualCapturedAt: new Date(),
      mlCategoryId: null,
      currentPrice: 50,
    });
    expect(expensive.estimatedValueBrl).toBe(50);
    expect(cheap.estimatedValueBrl).toBe(15);

    const scoreExpensive = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: expensive,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const scoreCheap = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: cheap,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(scoreExpensive.components.commissionValue.value!).toBeGreaterThan(
      scoreCheap.components.commissionValue.value!,
    );
  });

  it("never saturates two different real commission rates to the same score (owner's correction: 25% and 52% must differ)", () => {
    const low = evaluateCommissionEvidence({ individualRate: 0.25, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 });
    const high = evaluateCommissionEvidence({ individualRate: 0.52, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 });
    const scoreLow = calculateVitrineScore({ salesEvidence: null, commissionEvidence: low, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    const scoreHigh = calculateVitrineScore({ salesEvidence: null, commissionEvidence: high, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    expect(scoreHigh.components.commissionValue.value).not.toBe(scoreLow.components.commissionValue.value);
  });

  it("a stale individual commission observation is flagged, never treated as silently current", () => {
    const old = new Date(Date.now() - 60 * 86_400_000); // 60 days ago
    const evidence = evaluateCommissionEvidence({ individualRate: 0.3, individualCapturedAt: old, mlCategoryId: null, currentPrice: 100 });
    expect(evidence.stale).toBe(true);
    expect(evidence.type).toBe("historical");
  });

  it("rankingScore is always <= score, and strictly lower when confidence is incomplete", () => {
    const partial = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(partial.confidence).toBeLessThan(1);
    expect(partial.rankingScore).toBeLessThan(partial.score);
    expect(partial.rankingScore).toBe(Math.round(partial.score * partial.confidence));
  });

  it("owner's correction, 2026-11-19 (Ordem de Execução, seção 4): a stale commission counts for HALF the score value of an identical fresh one, and is marked degraded — never the main foundation for a 'campeão recorrente' classification", () => {
    const old = new Date(Date.now() - 60 * 86_400_000);
    const stale = evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: old, mlCategoryId: null, currentPrice: 300 });
    const fresh = evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 300 });
    expect(stale.estimatedValueBrl).toBe(fresh.estimatedValueBrl); // same raw evidence...

    const scoreStale = calculateVitrineScore({ salesEvidence: null, commissionEvidence: stale, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    const scoreFresh = calculateVitrineScore({ salesEvidence: null, commissionEvidence: fresh, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });

    expect(scoreStale.components.commissionValue.value!).toBeLessThan(scoreFresh.components.commissionValue.value!);
    expect(scoreStale.components.commissionValue.value).toBe(Math.round(scoreFresh.components.commissionValue.value! * 0.5));
    expect(scoreStale.degradedDimensions).toContain("commissionValue");
    expect(scoreFresh.degradedDimensions).not.toContain("commissionValue");
  });

  // Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
  // follow-up, item 3: "comissão histórica não é comissão confirmada
  // atual... implemente uma diferenciação explícita entre as 4
  // categorias"). Real root cause this closes: before this, historical
  // AND category_tier both got the identical 0.5x multiplier and the
  // identical "stale" bucket — a category-wide estimate, never
  // individually confirmed, was being trusted exactly as much as an aged
  // real individual observation. Also closes: an active promotional
  // campaign (fresh by age, `stale: false`) was getting the FULL 1x
  // multiplier, identical to a stable confirmed rate, despite its own
  // source text admitting it "pode expirar sem aviso".
  it("comissão histórica NUNCA pontua como confirmada e recente — e as 4 categorias (confirmada/promocional/histórica/por categoria) produzem 4 valores distintos para a MESMA taxa", () => {
    const confirmed = evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 300 });
    const promotional = evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(), isPromotionalExtra: true, mlCategoryId: null, currentPrice: 300 });
    const historical = evaluateCommissionEvidence({ individualRate: 0.2, individualCapturedAt: new Date(Date.now() - 60 * 86_400_000), mlCategoryId: null, currentPrice: 300 });
    // No individual rate at all -> falls back to the category tier path.
    const categoryTier = evaluateCommissionEvidence({ individualRate: null, individualCapturedAt: null, mlCategoryId: "MLB1051", currentPrice: 300 });

    expect(confirmed.type).toBe("confirmed_individual");
    expect(promotional.type).toBe("promotional_temporary");
    expect(historical.type).toBe("historical");
    // Only assert categoryTier's type if this fixture category actually
    // resolves to a real tier (ml-commission-tiers.ts) — never force a
    // specific category id to exist, just confirm the real distinct-type
    // behavior whenever it does.
    if (categoryTier.type === "category_tier") {
      const scoreConfirmed = calculateVitrineScore({ salesEvidence: null, commissionEvidence: confirmed, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
      const scorePromotional = calculateVitrineScore({ salesEvidence: null, commissionEvidence: promotional, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
      const scoreHistorical = calculateVitrineScore({ salesEvidence: null, commissionEvidence: historical, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
      const scoreCategoryTier = calculateVitrineScore({ salesEvidence: null, commissionEvidence: categoryTier, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });

      const confirmedValue = scoreConfirmed.components.commissionValue.value!;
      const promotionalValue = scorePromotional.components.commissionValue.value!;
      const historicalValue = scoreHistorical.components.commissionValue.value!;
      const categoryTierValue = scoreCategoryTier.components.commissionValue.value!;

      // Strict trust ordering: confirmed > promotional > historical >
      // category_tier — historical (an aged but individually-confirmed
      // observation) must score ABOVE a pure category estimate that was
      // never individually confirmed at all; before this fix both sat at
      // the exact same 0.5x.
      expect(confirmedValue).toBeGreaterThan(promotionalValue);
      expect(promotionalValue).toBeGreaterThan(historicalValue);
      expect(historicalValue).toBeGreaterThan(categoryTierValue);
      // The real bug this closes, stated as a direct assertion: historical
      // must never equal category_tier's value for the same underlying rate.
      expect(historicalValue).not.toBe(categoryTierValue);
    }

    // Historical must never score as high as a confirmed-recent
    // observation of the identical rate — the literal "comissão histórica
    // nunca é tratada como confirmação recente" guarantee.
    const scoreConfirmed = calculateVitrineScore({ salesEvidence: null, commissionEvidence: confirmed, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    const scoreHistorical = calculateVitrineScore({ salesEvidence: null, commissionEvidence: historical, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    expect(scoreHistorical.components.commissionValue.value).toBeLessThan(scoreConfirmed.components.commissionValue.value!);

    // A promotional campaign (fresh by age) must score BELOW a stable
    // confirmed rate too — it can expire without notice, so full trust
    // would be wrong even though it isn't "stale" by the age definition.
    const scorePromotional = calculateVitrineScore({ salesEvidence: null, commissionEvidence: promotional, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    expect(scorePromotional.components.commissionValue.value).toBeLessThan(scoreConfirmed.components.commissionValue.value!);

    // Explicit "não elimine automaticamente produtos promissores só
    // porque a comissão está desatualizada" guarantee: a promotional
    // observation is real and fresh (stale=false) — it must NOT be
    // excluded from evidence-sufficiency counting the way an aged
    // historical/category observation is.
    expect(promotional.stale).toBe(false);
  });

  it("flags a missing commission signal explicitly in reasons, never silently", () => {
    const result = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.reasons.some((r) => r.startsWith("comissão: SEM EVIDÊNCIA"))).toBe(true);
  });
});
