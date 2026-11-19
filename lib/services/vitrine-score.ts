import type { MonetizationScoreComponents } from "@/types/monetization";
import { VITRINE_SCORE_WEIGHTS } from "@/lib/config/vitrine-score-weights";
import {
  seasonalWeight,
  type ActiveCommercialEvent,
} from "@/lib/services/commercial-calendar-engine";
import type { TrendDirection } from "@/lib/services/listing-trend";

/**
 * Vitrine Inteligente score v2 (project brief sections 5 and 7) — the
 * owner's explicit instruction, 2026-11-19: reusing the existing
 * MonetizationScore is NOT the conclusion of the commercial intelligence,
 * only a foundation. This combines it with two NEW real dimensions
 * (seasonality from the commercial calendar, rank trend from
 * MerchantListingTrend) plus a real-ad-performance dimension once clicks
 * exist, under configurable weights (lib/config/vitrine-score-weights.ts)
 * — never a single hardcoded formula.
 *
 * Never fabricates a missing dimension: a component with no real evidence
 * is excluded entirely (not defaulted to 0 or to some assumed average) and
 * the remaining weights are renormalized, with `confidence` reporting how
 * much of the total possible weight was actually backed by evidence.
 */

export interface VitrineScoreComponent {
  /** 0..100, or null when there's no real evidence for this dimension yet. */
  value: number | null;
  weight: number;
  detail: string;
}

export interface VitrineScoreResult {
  score: number;
  /** 0..1 — share of total configured weight actually backed by a real
   * component this round; low confidence means the score rests on few
   * signals, not that the product is bad. */
  confidence: number;
  components: Record<
    "demand" | "seasonality" | "trend" | "competitiveness" | "quality" | "monetization" | "adPerformance",
    VitrineScoreComponent
  >;
  reasons: string[];
}

function trendToScore(direction: TrendDirection): number | null {
  switch (direction) {
    case "rising":
      return 80;
    case "stable":
      return 50;
    case "falling":
      return 20;
    // A brand-new listing with no 90d/30d/7d comparison yet — mild
    // optimism (worth a look), never claimed as a confirmed upward trend.
    case "new":
      return 55;
    case "unknown":
      return null;
  }
}

export interface VitrineScoreInput {
  /** The listing's existing MonetizationScore components, already
   * computed by the real ML/Shopee discovery jobs — reused, never
   * recalculated here. Null when the listing has no score yet. */
  monetization: MonetizationScoreComponents | null;
  /** The strongest active commercial-calendar event for this listing's
   * category right now, if any (commercial-calendar-engine.ts). Null when
   * no event is currently in its watch window for this category. */
  seasonalEvent: ActiveCommercialEvent | null;
  /** MerchantListingTrend.direction for this listing, or null when the
   * trend rollup hasn't run for it yet. */
  trendDirection: TrendDirection | null;
  /** Real AffiliateClick count with campaign="vitrine_dinamica" for this
   * listing — 0 until the Meta campaign is live and generating clicks. */
  vitrineClickCount: number;
}

export function calculateVitrineScore(input: VitrineScoreInput): VitrineScoreResult {
  const components: VitrineScoreResult["components"] = {
    demand: {
      value: input.monetization?.demand.value ?? null,
      weight: VITRINE_SCORE_WEIGHTS.demand,
      detail: input.monetization?.demand.detail ?? "sem sinal de demanda observado ainda",
    },
    monetization: {
      value: input.monetization?.commission.value ?? null,
      weight: VITRINE_SCORE_WEIGHTS.monetization,
      detail: input.monetization?.commission.detail ?? "sem comissão observada ainda",
    },
    quality: {
      value: input.monetization?.offerQuality.value ?? null,
      weight: VITRINE_SCORE_WEIGHTS.quality,
      detail: input.monetization?.offerQuality.detail ?? "sem avaliação/reputação observada ainda",
    },
    // Known gap (same audit that found this module's starting point): no
    // ML/Shopee equivalent of Amazon's PriceStats (historical price
    // position) exists yet. Never approximated with a guess — reported as
    // missing so `confidence` reflects it honestly.
    competitiveness: {
      value: null,
      weight: VITRINE_SCORE_WEIGHTS.competitiveness,
      detail: "sem histórico de posição de preço para ML/Shopee ainda (gap conhecido, ver docs)",
    },
    seasonality: {
      value: input.seasonalEvent ? Math.round(seasonalWeight(input.seasonalEvent) * 100) : null,
      weight: VITRINE_SCORE_WEIGHTS.seasonality,
      detail: input.seasonalEvent
        ? `${input.seasonalEvent.event.name} — ${input.seasonalEvent.stage}, pico em ${input.seasonalEvent.peakDate.toISOString().slice(0, 10)}`
        : "nenhum evento sazonal ativo para esta categoria agora",
    },
    trend: {
      value: input.trendDirection ? trendToScore(input.trendDirection) : null,
      weight: VITRINE_SCORE_WEIGHTS.trend,
      detail: input.trendDirection
        ? `tendência de ranking: ${input.trendDirection}`
        : "sem histórico de ranking suficiente ainda",
    },
    adPerformance: {
      value: input.vitrineClickCount > 0 ? Math.min(100, input.vitrineClickCount * 10) : null,
      weight: VITRINE_SCORE_WEIGHTS.adPerformance,
      detail:
        input.vitrineClickCount > 0
          ? `${input.vitrineClickCount} cliques reais via campanha vitrine_dinamica`
          : "sem cliques da Vitrine ainda",
    },
  };

  let weightedSum = 0;
  let weightPresent = 0;
  let weightTotal = 0;
  const reasons: string[] = [];
  for (const component of Object.values(components)) {
    weightTotal += component.weight;
    if (component.value === null) continue;
    weightedSum += component.value * component.weight;
    weightPresent += component.weight;
  }
  for (const [name, component] of Object.entries(components)) {
    if (component.value !== null) reasons.push(`${name}: ${component.detail}`);
  }

  const score = weightPresent > 0 ? Math.round(weightedSum / weightPresent) : 0;
  const confidence = weightTotal > 0 ? Math.round((weightPresent / weightTotal) * 100) / 100 : 0;

  return { score, confidence, components, reasons };
}
