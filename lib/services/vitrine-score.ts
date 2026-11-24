import type { MonetizationScoreComponents } from "@/types/monetization";
import { VITRINE_SCORE_WEIGHTS } from "@/lib/config/vitrine-score-weights";
import {
  seasonalWeight,
  type ActiveCommercialEvent,
} from "@/lib/services/commercial-calendar-engine";
import type { TrendDirection } from "@/lib/services/listing-trend";
import type { SalesEvidence } from "@/lib/services/commercial-intelligence/sales-evidence";
import type { CommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import type { PriceCompetitivenessEvidence } from "@/lib/services/commercial-intelligence/price-competitiveness";
import { COMMISSION_CONFIDENCE_TIER } from "@/lib/services/commercial-intelligence/commission-evidence-labels";

/**
 * Vitrine Inteligente score v3 (owner's authorization, 2026-11-19,
 * section 8 — "reconstrua a metodologia... não quero simplesmente
 * substituir fórmulas antigas por outras igualmente arbitrárias").
 * Replaces v2 (frozen at lib/services/commercial-intelligence/legacy/
 * vitrine-score-v2-frozen.ts for the Commercial Intelligence Lab's
 * comparison), which had two confirmed, evidenced bugs:
 *   1. "Demand" was scored from a keyword-search RESULT POSITION
 *      (always 1-5) via bestsellerRankToScore — a function meant for a
 *      real bestseller-rank position. That conflated search relevance
 *      with sales evidence; every discovered item showed demand 97-100
 *      regardless of actual popularity. Fixed: this version only ever
 *      receives pre-classified SalesEvidence (sales-evidence.ts), which
 *      explicitly types search-relevance-only evidence as
 *      demandScore: null — it can never contribute to this score.
 *   2. commissionToScore(rate) saturated at 100 for ANY rate ≥25%,
 *      collapsing a 25% and a 52% real commission to the same number.
 *      Fixed: commission is now scored from its ESTIMATED VALUE IN REAIS
 *      (price × rate — owner's explicit priority, section 4), via
 *      commission-evidence.ts, with a gentler log curve.
 *
 * Never fabricates a missing dimension: a component with no real
 * evidence is excluded entirely (not defaulted to 0 or an assumed
 * average) and the remaining weights are renormalized, with `confidence`
 * reporting how much of the total possible weight was actually backed by
 * evidence. `rankingScore = score × confidence` (kept from v2 — this part
 * was already correct) so a product backed by few signals can't out-rank
 * one backed by more just because its few numbers happen to be high.
 */

export interface VitrineScoreComponent {
  /** 0..100, or null when there's no real evidence for this dimension yet. */
  value: number | null;
  weight: number;
  detail: string;
}

export interface VitrineScoreResult {
  score: number;
  confidence: number;
  rankingScore: number;
  components: Record<
    "salesEvidence" | "commissionValue" | "priceCompetitiveness" | "quality" | "seasonality" | "trend" | "adPerformance",
    VitrineScoreComponent
  >;
  reasons: string[];
  /** Component names whose value exists but rests on degraded evidence
   * (today: only a stale/historical commission observation — owner's
   * repeated requirement, "não classifique um produto como campeão
   * recorrente apenas porque possuía comissão elevada em setembro"). A
   * degraded dimension still shows up with a discounted value (never
   * null'd out — the evidence is real, just old), but
   * evidence-sufficiency.ts does not let it count toward "we have enough
   * real signal to recommend this." */
  degradedDimensions: string[];
}

function trendToScore(direction: TrendDirection): number | null {
  switch (direction) {
    case "rising":
      return 80;
    case "stable":
      return 50;
    case "falling":
      return 20;
    case "new":
      return null; // owner's correction: being new is not trend evidence
    case "unknown":
      return null;
  }
}

/** rate*100*4-style saturation replaced with a log curve over the REAIS
 * value (owner's priority, section 4) — never saturates below a few
 * hundred reais, and a R$500@10% (R$50) product scores higher than a
 * R$50@30% (R$15) one, as explicitly required. */
function commissionValueToScore(brl: number): number {
  return Math.min(100, Math.round(Math.log10(brl + 1) * 35));
}

export interface VitrineScoreInput {
  salesEvidence: SalesEvidence | null;
  commissionEvidence: CommissionEvidence | null;
  priceCompetitiveness: PriceCompetitivenessEvidence | null;
  /** Reused as-is from MonetizationScoreComponents.offerQuality — rating,
   * review count and seller reputation remain the one dimension v2 never
   * got wrong; not rebuilt here. */
  qualitySignal: MonetizationScoreComponents["offerQuality"] | null;
  seasonalEvent: ActiveCommercialEvent | null;
  trendDirection: TrendDirection | null;
  vitrineClickCount: number;
}

export function calculateVitrineScore(input: VitrineScoreInput): VitrineScoreResult {
  // Owner's authorization, 2026-11-19 ("Ordem de Execução", section 4,
  // repeated after the first review), refined 2026-11-23 ("corrigir o
  // tratamento da comissão histórica"): a commission observation older
  // than evaluateCommissionEvidence's 45-day freshness window (type
  // "historical") is still real data — never hidden — but must never
  // carry the SAME weight as a confirmed-current one. The multiplier now
  // comes from the single shared COMMISSION_CONFIDENCE_TIER table (one
  // of 4 explicit tiers: confirmed_individual/promotional_temporary/
  // historical/category_tier — see that table's own doc comment for why
  // category_tier sits below historical rather than sharing its 0.5),
  // instead of a binary stale-or-not cut. `degradedDimensions`
  // classification (what counts toward evidence-sufficiency) is
  // DELIBERATELY left keyed on `stale` alone, unchanged — this only
  // makes the SCORE more finely graded; it never newly excludes a
  // promotional_temporary candidate from "we have enough real signal"
  // (owner's explicit rule: "não elimine automaticamente produtos
  // promissores só porque a comissão está desatualizada").
  const commissionStale = input.commissionEvidence?.stale ?? false;
  const commissionMultiplier = input.commissionEvidence
    ? COMMISSION_CONFIDENCE_TIER[input.commissionEvidence.type].scoreMultiplier
    : 1;
  const degradedDimensions: string[] = [];
  if (commissionStale && input.commissionEvidence?.estimatedValueBrl != null) degradedDimensions.push("commissionValue");

  const components: VitrineScoreResult["components"] = {
    salesEvidence: {
      value: input.salesEvidence?.demandScore ?? null,
      weight: VITRINE_SCORE_WEIGHTS.salesEvidence,
      detail: input.salesEvidence?.detail ?? "Sem evidência de vendas/ranking ainda.",
    },
    commissionValue: {
      value:
        input.commissionEvidence?.estimatedValueBrl != null
          ? Math.round(commissionValueToScore(input.commissionEvidence.estimatedValueBrl) * commissionMultiplier)
          : null,
      weight: VITRINE_SCORE_WEIGHTS.commissionValue,
      detail: input.commissionEvidence?.source ?? "Sem evidência de comissão.",
    },
    priceCompetitiveness: {
      value: input.priceCompetitiveness?.competitivenessScore ?? null,
      weight: VITRINE_SCORE_WEIGHTS.priceCompetitiveness,
      detail: input.priceCompetitiveness?.detail ?? "Sem outras ofertas reais para comparar preço.",
    },
    quality: {
      value: input.qualitySignal?.value ?? null,
      weight: VITRINE_SCORE_WEIGHTS.quality,
      detail: input.qualitySignal?.detail ?? "Sem avaliação/reputação observada ainda.",
    },
    seasonality: {
      value: input.seasonalEvent ? Math.round(seasonalWeight(input.seasonalEvent) * 100) : null,
      weight: VITRINE_SCORE_WEIGHTS.seasonality,
      detail: input.seasonalEvent
        ? `${input.seasonalEvent.event.name} — ${input.seasonalEvent.stage}, pico em ${input.seasonalEvent.daysUntilPeak}d.`
        : "Nenhum evento sazonal genuinamente relevante agora.",
    },
    trend: {
      value: input.trendDirection ? trendToScore(input.trendDirection) : null,
      weight: VITRINE_SCORE_WEIGHTS.trend,
      detail: input.trendDirection
        ? `Tendência de ranking: ${input.trendDirection}.`
        : "Sem histórico de ranking suficiente ainda.",
    },
    adPerformance: {
      value: input.vitrineClickCount > 0 ? Math.min(100, input.vitrineClickCount * 10) : null,
      weight: VITRINE_SCORE_WEIGHTS.adPerformance,
      detail:
        input.vitrineClickCount > 0
          ? `${input.vitrineClickCount} cliques reais via campanha vitrine_dinamica.`
          : "Sem cliques da Vitrine ainda.",
    },
  };

  let weightedSum = 0;
  let weightPresent = 0;
  let weightTotal = 0;
  for (const component of Object.values(components)) {
    weightTotal += component.weight;
    if (component.value === null) continue;
    weightedSum += component.value * component.weight;
    weightPresent += component.weight;
  }
  const reasons: string[] = [];
  for (const [name, component] of Object.entries(components)) {
    if (component.value !== null) reasons.push(`${name}: ${component.detail}`);
  }
  if (components.commissionValue.value === null) {
    reasons.push(
      "comissão: SEM EVIDÊNCIA — a API de descoberta do Mercado Livre não divulga comissão (confirmado: GET /items/{id} retorna 403 para itens de outros vendedores). Reduz a confiança, nunca escondido.",
    );
  }
  if (input.commissionEvidence?.type === "historical") {
    reasons.push(`comissão: evidência DESATUALIZADA (>45 dias) — valor contado a ${Math.round(commissionMultiplier * 100)}% no score, nunca tratada como vigente.`);
  } else if (input.commissionEvidence?.type === "category_tier") {
    reasons.push(`comissão: ESTIMATIVA POR CATEGORIA (nunca confirmada individualmente) — valor contado a ${Math.round(commissionMultiplier * 100)}% no score, menos confiável que uma observação individual antiga.`);
  } else if (input.commissionEvidence?.type === "promotional_temporary") {
    reasons.push(`comissão: CAMPANHA PROMOCIONAL TEMPORÁRIA — real e individual, mas pode expirar sem aviso; valor contado a ${Math.round(commissionMultiplier * 100)}% no score.`);
  }

  const score = weightPresent > 0 ? Math.round(weightedSum / weightPresent) : 0;
  const confidence = weightTotal > 0 ? Math.round((weightPresent / weightTotal) * 100) / 100 : 0;
  const rankingScore = Math.round(score * confidence);

  return { score, confidence, rankingScore, components, reasons, degradedDimensions };
}
