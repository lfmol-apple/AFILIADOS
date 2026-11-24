import type { VitrineScoreResult } from "@/lib/services/vitrine-score";

/**
 * Owner's authorization, 2026-11-19 ("Aprovação condicionada", section 6):
 * "um produto com apenas uma dimensão conhecida não deverá ser apresentado
 * como uma oportunidade nota 100" + "não recomende investimento financeiro
 * quando as informações disponíveis forem insuficientes para fundamentar
 * a decisão." This never changes `calculateVitrineScore`'s own math (no
 * new formula, as explicitly requested) — it classifies the SAME result
 * by how many of its 7 dimensions actually carry real evidence, which
 * `rankingScore` already discounts numerically but never labels.
 *
 * Thresholds are a real, reviewable count, not hidden: 0-1 real
 * dimensions = insufficient (never recommend ad spend on this alone),
 * 2-3 = partial, 4+ = adequate.
 */
export type EvidenceSufficiency = "insufficient" | "partial" | "adequate";

export function classifySufficiency(result: VitrineScoreResult): EvidenceSufficiency {
  // Owner's authorization, 2026-11-19 ("Ordem de Execução", section 4):
  // a degraded dimension (today: a stale/historical commission — see
  // vitrine-score.ts) still has a non-null value, but never gets to count
  // toward "we have enough real signal" — otherwise a product with only
  // an old commission figure and nothing else could still clear the
  // "partial" bar on that single degraded number.
  const realDimensions =
    Object.values(result.components).filter((c) => c.value !== null).length - result.degradedDimensions.length;
  if (realDimensions <= 1) return "insufficient";
  if (realDimensions <= 3) return "partial";
  return "adequate";
}

/**
 * Owner's authorization, section 3: "diferencie produtos muito vendidos,
 * com vendas em crescimento, com interesse crescente, com preços
 * competitivos, com comissões atrativas, com potencial sazonal, com
 * informações insuficientes." Each label fires only when that SPECIFIC
 * dimension has real evidence above a real, documented threshold — never
 * a new composite score, purely a presentation layer over the existing
 * components so a product is never reduced to one number.
 */
export type CommercialProfileLabel =
  | "muito_vendido"
  | "vendas_em_crescimento"
  | "interesse_crescente"
  | "preco_competitivo"
  | "comissao_atrativa"
  | "potencial_sazonal"
  | "informacao_insuficiente";

export function commercialProfile(result: VitrineScoreResult): CommercialProfileLabel[] {
  const labels: CommercialProfileLabel[] = [];
  const c = result.components;

  if (c.salesEvidence.value !== null && c.salesEvidence.value >= 70) labels.push("muito_vendido");
  if (c.trend.value !== null && c.trend.value >= 70) labels.push("vendas_em_crescimento");
  if (c.trend.value !== null && c.trend.value >= 50 && c.trend.value < 70) labels.push("interesse_crescente");
  if (c.priceCompetitiveness.value !== null && c.priceCompetitiveness.value >= 80) labels.push("preco_competitivo");
  if (c.commissionValue.value !== null && c.commissionValue.value >= 60) labels.push("comissao_atrativa");
  if (c.seasonality.value !== null && c.seasonality.value >= 50) labels.push("potencial_sazonal");

  if (labels.length === 0 || classifySufficiency(result) === "insufficient") {
    labels.push("informacao_insuficiente");
  }
  return labels;
}

/** Owner's explicit rule, section 6: never recommend ad spend when
 * evidence is insufficient — a pure gate, read by the UI/selection layer,
 * never silencing the underlying score. */
export function readyForAdInvestment(result: VitrineScoreResult): boolean {
  return classifySufficiency(result) !== "insufficient";
}
