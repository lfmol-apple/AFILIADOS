/**
 * Owner's requirement, 2026-11-20 ("Auditoria Contínua", section 7):
 * "Quero dois mecanismos separados: Motor de seleção... Auditoria
 * comercial... Evite que o algoritmo seja simultaneamente o candidato e
 * o juiz de sua própria qualidade." This module NEVER reads
 * VitrineScoreResult.score or .rankingScore as evidence — it re-derives
 * its verdict from the same raw components, but under its OWN criteria.
 *
 * Recalibrated, 2026-11-20 ("Auditoria dos 29 produtos"): the first
 * version triple-penalized commission uncertainty — once in the score
 * (already correct: a stale commission scores at half value), a second
 * time by stripping it out of "effective dimension count", and a THIRD
 * time via a blanket `risks.length === 0` requirement for approval that
 * re-flagged the exact same stale/unknown commission (and a thin price
 * sample) as an automatic blocker. Investigated against the real
 * current 30 products: 29 of 30 "revisão necessária" turned out to
 * share one pattern — 2-3 solid, INDEPENDENT real dimensions (official
 * rank, price position vs. real siblings, quality/rating, seasonality)
 * plus ONE commission figure that's either stale or unknown. Under the
 * owner's own explicit framing (section 2 of "Auditoria dos 29
 * produtos"): "não trate comissão desconhecida como zero nem comissão
 * histórica como vigente" — the fix is not to pretend the commission
 * uncertainty doesn't exist (it's still disclosed below), but to stop
 * letting it override otherwise-solid, INDEPENDENT commercial evidence.
 *
 * coreDimensions always excludes commissionValue, by construction, in
 * every case — never just when it happens to be degraded. Approval now
 * turns on how many genuinely independent, non-commission signals
 * support the pick; commission freshness and a thin competitor sample
 * become disclosed caveats (never hidden) rather than automatic
 * blockers. This is NOT lowered rigor: the original emergente bug this
 * whole audit exists to catch — a product backed by a SINGLE weak
 * signal and nothing else — still never clears "aprovado" (coreDimensions
 * must be >= 2), and a product with ZERO independent commercial signal
 * besides a commission guess is still outright reprovado.
 */
import type { VitrineScoreResult } from "@/lib/services/vitrine-score";
import type { VitrineGroupType } from "@/lib/services/vitrine-selection";

export type AuditVerdict = "aprovado_para_teste" | "revisao_necessaria" | "reprovado";

export interface AuditResult {
  verdict: AuditVerdict;
  reasons: string[];
  /** Always populated when something is worth disclosing, on EVERY
   * verdict including aprovado_para_teste — "transparência sobre
   * incertezas" is required regardless of whether the caveat ends up
   * blocking approval. */
  risks: string[];
}

export interface AuditInput {
  breakdown: VitrineScoreResult;
  group: VitrineGroupType;
  descriptionQuality: "adequada" | "inadequada";
  priceCompetitivenessSampleSize: number;
  /** Owner's finding, 2026-11-20 ("Primeiro teste real da Vitrine"):
   * a price checked against exactly 1 real sibling, with no
   * independently-confirmed discount either, is not solid evidence —
   * it's a single, uncorroborated number. Investigated live: the
   * R$474,05 "Guirlanda Natal G" cleared the previous calibration only
   * because priceCompetitiveness(1 sibling) + seasonality(bare keyword
   * match) counted as "2 independent dimensions" — neither one was
   * actually solid on its own, and the ad-potential hypothesis module
   * independently flagged it as a poor fit for cold social traffic.
   * Required so a thin price sample can still count as real evidence
   * when it DOES carry independent confirmation (a genuine discount). */
  hasConfirmedPriceDrop: boolean;
  commissionType: "confirmed_individual" | "category_tier" | "promotional_temporary" | "historical" | "unknown";
  /** True when this product's score/evidence was NOT recomputed this
   * cycle (held over by the minimum-observation/rotation-budget
   * protection) — see jobs/vitrine-renew.ts. Still a hard block: unlike
   * commission/price caveats, this means we genuinely don't know if
   * TODAY's numbers are even right. */
  staleNotRecomputedThisCycle: boolean;
}

const NON_COMMISSION_COMPONENT_KEYS = [
  "salesEvidence",
  "priceCompetitiveness",
  "quality",
  "seasonality",
  "trend",
  "adPerformance",
] as const;

export function auditCandidate(input: AuditInput): AuditResult {
  const reasons: string[] = [];
  const risks: string[] = [];

  if (input.staleNotRecomputedThisCycle || input.descriptionQuality === "inadequada") {
    return {
      verdict: "reprovado",
      reasons: ["Dados não atuais ou descrição inadequada — não recomendável para teste publicitário nesta rodada."],
      risks: input.staleNotRecomputedThisCycle
        ? ["Atualidade dos dados: evidência NÃO recalculada nesta rodada — o que está exibido pode já estar desatualizado."]
        : ["Coerência comercial: título com marcadores fortes de idioma não compatível com o mercado brasileiro."],
    };
  }

  // Owner's correction: measured WITHOUT commissionValue, always — never
  // "real minus degraded", which silently double-counted the exact same
  // uncertainty disclosed below as a risk. Optional-chained: a legacy
  // breakdown predating one of these component keys is read as "not
  // present" rather than crashing (see the legacy-shape test below).
  const priceIsSolid = input.priceCompetitivenessSampleSize >= 2 || input.hasConfirmedPriceDrop;
  const priceWeakButPresent = input.breakdown.components.priceCompetitiveness?.value != null && !priceIsSolid;
  const solidDimensions = NON_COMMISSION_COMPONENT_KEYS.filter((k) => {
    if (input.breakdown.components[k]?.value == null) return false;
    // A price checked against exactly one real sibling, with no
    // independently-confirmed discount, is a single uncorroborated
    // number — real data, but not solid enough to count as an
    // independent dimension on its own (still disclosed as a risk below).
    if (k === "priceCompetitiveness" && !priceIsSolid) return false;
    return true;
  });
  const coreDimensions = solidDimensions.length;

  // Disclosed on every verdict, never hidden on approval — "risco
  // comercial relevante" (comissão desatualizada) and "incerteza
  // informacional" (comissão desconhecida) are reported with different
  // wording per the owner's own split, but neither alone blocks
  // approval anymore when independent evidence already clears the bar.
  if (input.commissionType === "historical") {
    risks.push("Risco comercial relevante: comissão conhecida é histórica (fora da janela de 45 dias) — não presumir vigente.");
  } else if (input.commissionType === "unknown") {
    risks.push("Incerteza informacional: comissão desconhecida — a API de descoberta do Mercado Livre não a divulga para itens de terceiros. Ausência de dado, não evidência de problema.");
  } else if (input.commissionType === "promotional_temporary") {
    risks.push("Risco comercial relevante: comissão é uma campanha temporária de ganhos extras — pode expirar sem aviso durante a campanha publicitária.");
  }
  if (input.priceCompetitivenessSampleSize === 1) {
    risks.push("Incerteza informacional: competitividade de preço comparada a apenas 1 concorrente real — amostra pequena, nunca tratada como prova forte isolada.");
  } else if (input.priceCompetitivenessSampleSize === 0) {
    risks.push("Incerteza informacional: nenhuma oferta real de comparação de preço disponível.");
  }

  if (coreDimensions === 0) {
    reasons.push("Nenhuma evidência comercial independente da comissão sustenta este produto — exatamente o padrão que não deve ser aprovado, mesmo com comissão alta.");
    return { verdict: "reprovado", reasons, risks };
  }

  // Owner's finding, 2026-11-20 ("Primeiro teste real da Vitrine"):
  // confirmed live — the real R$474,05 "Guirlanda Natal G" cleared
  // approval with exactly this shape: a specific, unconfirmed price
  // number (1 sibling, no discount) propping up a bare thematic-
  // keyword seasonality match, with nothing else. Seasonality alone
  // measures the EVENT's timing, never the product — when it's the
  // only thing left standing precisely because a concrete, possibly
  // wrong price had to be discounted out, that's a real risk (a
  // specific number that may display wrong), not just "thin data" (the
  // benign case: seasonality alone with NO price claim at all stays
  // "revisão", see the test suite). Quality and official-rank evidence
  // are genuine product-level signals and are never demoted by this —
  // only the bare-keyword-seasonality-propped-by-a-doubtful-price
  // combination is.
  if (coreDimensions === 1 && priceWeakButPresent && solidDimensions[0] === "seasonality") {
    reasons.push(
      "Única evidência restante (sazonalidade) mede apenas o calendário do evento, nunca o produto — e só sobrou sozinha porque o preço exibido depende de uma única oferta real, sem desconto confirmado. Risco concreto de preço exibido incorreto, não apenas dado insuficiente.",
    );
    return { verdict: "reprovado", reasons, risks };
  }

  if (coreDimensions >= 2) {
    reasons.push(
      `${coreDimensions} dimensão(ões) comercial(is) independente(s) da comissão (ranking/preço/qualidade/sazonalidade/tendência) sustentam a seleção${risks.length > 0 ? `, com ${risks.length} ressalva(s) divulgada(s) abaixo — nenhuma delas isolada ou dominante` : ", sem ressalvas"}.`,
    );
    return { verdict: "aprovado_para_teste", reasons, risks };
  }

  reasons.push("Só 1 dimensão comercial independente da comissão — sozinha, não é base suficiente; recomenda-se checagem humana pontual antes de investir mídia paga.");
  return { verdict: "revisao_necessaria", reasons, risks };
}
