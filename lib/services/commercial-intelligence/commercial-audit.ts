/**
 * Owner's requirement, 2026-11-20 ("Auditoria Contínua", section 7):
 * "Quero dois mecanismos separados: Motor de seleção... Auditoria
 * comercial... Evite que o algoritmo seja simultaneamente o candidato e
 * o juiz de sua própria qualidade." This module NEVER reads
 * VitrineScoreResult.score or .rankingScore as evidence — it re-derives
 * its verdict from the same raw components, but under its OWN, more
 * conservative criteria, explicitly named in section 7:
 *   - Consistência das evidências
 *   - Atualidade dos dados
 *   - Confiabilidade das fontes
 *   - Coerência comercial
 *   - Adequação à publicidade paga
 *   - Riscos de informação incorreta
 * ("Qualidade das alternativas rejeitadas" is handled separately, by
 * comparing against the discarded pool — see jobs/commercial-lab-*.)
 */
import type { VitrineScoreResult } from "@/lib/services/vitrine-score";
import type { VitrineGroupType } from "@/lib/services/vitrine-selection";

export type AuditVerdict = "aprovado_para_teste" | "revisao_necessaria" | "reprovado";

export interface AuditResult {
  verdict: AuditVerdict;
  reasons: string[];
  risks: string[];
}

export interface AuditInput {
  breakdown: VitrineScoreResult;
  group: VitrineGroupType;
  descriptionQuality: "adequada" | "inadequada";
  priceCompetitivenessSampleSize: number;
  commissionType: "confirmed_individual" | "category_tier" | "promotional_temporary" | "historical" | "unknown";
  /** True when this product's score/evidence was NOT recomputed this
   * cycle (held over by the minimum-observation/rotation-budget
   * protection) — see jobs/vitrine-renew.ts. The audit treats this as a
   * real "atualidade dos dados" risk on its own, regardless of how good
   * the frozen numbers look. */
  staleNotRecomputedThisCycle: boolean;
}

export function auditCandidate(input: AuditInput): AuditResult {
  const reasons: string[] = [];
  const risks: string[] = [];

  // Owner's finding, 2026-11-20 ("Auditoria Contínua"): a row whose
  // evidence hasn't been recomputed since before `degradedDimensions`
  // existed (any VitrineSelection written before today's stale-
  // commission fix) stores a scoreBreakdown with no such field at all —
  // real legacy data, read via an `unknown` cast for the
  // staleNotRecomputedThisCycle path, never assume the newer shape.
  const realDimensions = Object.values(input.breakdown.components).filter((c) => c.value !== null).length;
  const effectiveDimensions = realDimensions - (input.breakdown.degradedDimensions ?? []).length;

  if (input.staleNotRecomputedThisCycle) {
    risks.push("Atualidade dos dados: evidência NÃO recalculada nesta rodada — protegida contra retirada, mas o que está exibido pode já estar desatualizado.");
  }

  if (input.descriptionQuality === "inadequada") {
    risks.push("Coerência comercial: título com marcadores fortes de idioma não compatível com o mercado brasileiro.");
  }

  if (input.priceCompetitivenessSampleSize === 1) {
    risks.push("Confiabilidade das fontes: competitividade de preço comparada a apenas 1 concorrente — amostra pequena para confiança alta.");
  } else if (input.priceCompetitivenessSampleSize === 0) {
    risks.push("Confiabilidade das fontes: nenhuma oferta real de comparação de preço disponível.");
  }

  if (input.commissionType === "historical") {
    risks.push("Atualidade dos dados: comissão conhecida é histórica (fora da janela de 45 dias) — não presumir vigente.");
  } else if (input.commissionType === "unknown") {
    risks.push("Confiabilidade das fontes: comissão desconhecida — a API de descoberta do Mercado Livre não a divulga.");
  } else if (input.commissionType === "promotional_temporary") {
    risks.push("Adequação à publicidade paga: comissão é uma campanha temporária de ganhos extras — pode expirar sem aviso durante a campanha publicitária.");
  }

  // Consistência das evidências: quantos pilares reais e NÃO degradados
  // sustentam esta escolha — nunca o score final, que já pondera tudo
  // junto e pode esconder que só um ou dois pilares estão realmente de
  // pé.
  if (input.staleNotRecomputedThisCycle || input.descriptionQuality === "inadequada") {
    return { verdict: "reprovado", reasons: ["Dados não atuais ou descrição inadequada — não recomendável para teste publicitário nesta rodada."], risks };
  }

  if (effectiveDimensions >= 3 && input.priceCompetitivenessSampleSize !== 1 && risks.length === 0) {
    reasons.push(`${effectiveDimensions} dimensões reais e não degradadas sustentam a seleção, sem riscos identificados.`);
    return { verdict: "aprovado_para_teste", reasons, risks };
  }

  reasons.push(
    `${effectiveDimensions} dimensão(ões) real(is) não degradada(s)${risks.length > 0 ? ", com " + risks.length + " risco(s) identificado(s)" : ""} — defensável, mas não livre de ressalvas.`,
  );
  return { verdict: "revisao_necessaria", reasons, risks };
}
