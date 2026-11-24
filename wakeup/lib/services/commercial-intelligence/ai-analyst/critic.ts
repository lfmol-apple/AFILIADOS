import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * IA Crítica — second-pass review (owner's authorization, 2026-11-22,
 * "Motor de Inteligência Comercial com IA", section 6: "antes de
 * recomendar os produtos de uma vitrine, o motor deverá realizar uma
 * segunda avaliação crítica... não quero dois modelos de IA concordando
 * automaticamente entre si").
 *
 * Deliberately DETERMINISTIC, not a second LLM call — owner's own
 * efficiency rule applies here too ("economicamente eficiente"; "não
 * desperdice tokens"). Every one of these checks is a real, auditable
 * computation over the SAME final selection the first pass already
 * produced — it never asks the model to grade itself, which would risk
 * exactly the "duas IAs concordando automaticamente" the owner warned
 * against. A narrative LLM synthesis of these findings is a reasonable
 * future increment, not built here.
 */
export interface CriticFinding {
  issue:
    | "concentracao_de_categoria"
    | "dependencia_excessiva_de_desconto"
    | "comissao_predominantemente_desatualizada"
    | "baixa_diversidade_de_evidencia"
    | "lacunas_de_dados_recorrentes";
  severity: "aviso" | "alerta";
  detail: string;
  affectedListingIds: string[];
}

const CATEGORY_CONCENTRATION_THRESHOLD = 3;
const DISCOUNT_DEPENDENCY_RATIO = 0.4;
const STALE_COMMISSION_RATIO = 0.6;
const MISSING_DATA_RATIO = 0.5;

/** Runs every check against the FINAL picked list — never the full pool
 * (a candidate that didn't make the cut is not this function's concern;
 * it reviews the decision actually about to be made). */
export function runCriticalReview(
  picked: readonly VitrineCandidate[],
  evaluations: ReadonlyMap<string, AnalystEvaluation>,
): CriticFinding[] {
  const findings: CriticFinding[] = [];
  if (picked.length === 0) return findings;

  // 1. "Estamos favorecendo categorias saturadas?"
  const byCategory = new Map<string, string[]>();
  for (const c of picked) {
    if (!c.categoryId) continue;
    byCategory.set(c.categoryId, [...(byCategory.get(c.categoryId) ?? []), c.merchantListingId]);
  }
  for (const [categoryId, ids] of byCategory) {
    if (ids.length > CATEGORY_CONCENTRATION_THRESHOLD) {
      findings.push({
        issue: "concentracao_de_categoria",
        severity: "alerta",
        detail: `${ids.length} de ${picked.length} produtos selecionados pertencem à mesma categoria real (${categoryId}) — risco de saturação, mesmo que cada um individualmente tenha pontuação real adequada.`,
        affectedListingIds: ids,
      });
    }
  }

  // 2. "Estamos dando importância excessiva a descontos?" — a candidate
  // whose ONLY real commercial signal is a price drop, with no sales/
  // commission evidence backing it, is a real risk this check surfaces
  // (never auto-removed — that would be the AI quietly overriding the
  // objective gate again).
  const discountOnly = picked.filter(
    (c) => c.priceCompetitiveness.hasConfirmedPriceDrop && c.commercialAudit.verdict !== "aprovado_para_teste",
  );
  if (picked.length > 0 && discountOnly.length / picked.length >= DISCOUNT_DEPENDENCY_RATIO) {
    findings.push({
      issue: "dependencia_excessiva_de_desconto",
      severity: "aviso",
      detail: `${discountOnly.length} de ${picked.length} produtos dependem de um desconto confirmado sem auditoria comercial plenamente aprovada.`,
      affectedListingIds: discountOnly.map((c) => c.merchantListingId),
    });
  }

  // 3. "Estamos promovendo produtos sem evidências comerciais [de
  // comissão vigente]?" — a real, auditable fraction of the final list
  // resting on stale commission data.
  const staleCommission = picked.filter((c) => c.commissionEvidence.stale);
  if (staleCommission.length / picked.length >= STALE_COMMISSION_RATIO) {
    findings.push({
      issue: "comissao_predominantemente_desatualizada",
      severity: "alerta",
      detail: `${staleCommission.length} de ${picked.length} produtos (${Math.round((staleCommission.length / picked.length) * 100)}%) têm comissão marcada como desatualizada (>45 dias) — o valor em reais usado na pontuação já é contado pela metade, mas a dependência coletiva é alta.`,
      affectedListingIds: staleCommission.map((c) => c.merchantListingId),
    });
  }

  // 4. Cross-check against the AI's OWN "missingData" across the final
  // list — a gap the first-pass evaluation itself already flagged,
  // surfaced here so it cannot be missed by only reading individual
  // evaluations one at a time.
  const realEvaluations = [...evaluations.values()].filter((e) => !e.isFallback && picked.some((c) => c.merchantListingId === e.merchantListingId));
  if (realEvaluations.length > 0) {
    const missingCounts = new Map<string, string[]>();
    for (const evaluation of realEvaluations) {
      for (const key of evaluation.missingData) {
        missingCounts.set(key, [...(missingCounts.get(key) ?? []), evaluation.merchantListingId]);
      }
    }
    for (const [key, ids] of missingCounts) {
      if (ids.length / realEvaluations.length >= MISSING_DATA_RATIO) {
        findings.push({
          issue: "lacunas_de_dados_recorrentes",
          severity: "aviso",
          detail: `"${key}" está ausente em ${ids.length} de ${realEvaluations.length} avaliações reais da IA — uma lacuna sistêmica, não um caso isolado.`,
          affectedListingIds: ids,
        });
      }
    }
  }

  // 5. "Quero uma etapa de revisão... dois modelos de IA concordando
  // automaticamente entre si" — if every real AI evaluation leans on
  // the exact same single evidence key, the first pass itself may be
  // under-diversified in WHAT it actually checks, independent of which
  // products were picked.
  if (realEvaluations.length >= 3) {
    const allSameKey = realEvaluations.every((e) => e.evidenceUsed.length === 1 && e.evidenceUsed[0] === realEvaluations[0]!.evidenceUsed[0]);
    if (allSameKey) {
      findings.push({
        issue: "baixa_diversidade_de_evidencia",
        severity: "alerta",
        detail: `Todas as ${realEvaluations.length} avaliações reais da IA se apoiam exclusivamente na mesma única evidência ("${realEvaluations[0]!.evidenceUsed[0]}") — risco real de decisão pouco fundamentada mesmo quando cada recomendação individual parece razoável.`,
        affectedListingIds: realEvaluations.map((e) => e.merchantListingId),
      });
    }
  }

  return findings;
}
