import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { computeEvidenceFingerprint } from "@/lib/services/commercial-intelligence/ai-analyst/evidence-fingerprint";
import { callAnalyst, ANALYST_MODEL, OpenAiAnalystNotConfiguredError } from "@/lib/services/commercial-intelligence/ai-analyst/openai-analyst-client";
import { checkAnalystBudget, recordAnalystSpend } from "@/lib/services/commercial-intelligence/ai-analyst/budget";
import type { AnalystEvaluation, AnalystEvidenceInput, EvidenceKey, MissingDataKey } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/** `costUsd` is non-null here only when a REAL billable attempt happened
 * but was rejected — never a value for the three cases where no API
 * call was made at all (key missing, budget exceeded, caching). This
 * is what makes it possible to answer "quanto custaram as rejeições?"
 * directly from AnalystEvaluation rows without a separate ledger. */
function fallback(merchantListingId: string, reason: string, costUsd: number | null = null): AnalystEvaluation {
  return {
    merchantListingId,
    recommendation: "observar",
    commercialScore: 0,
    confidence: 0,
    favorableArguments: [],
    risks: [],
    evidenceUsed: [],
    missingData: [],
    isFallback: true,
    fallbackReason: reason,
    model: null,
    costUsd,
    cached: false,
  };
}

/** Human-readable, owner-facing text for an attempt's specific rejection
 * reason (hallucination-guard.ts's RejectionReason, or callAnalyst's own
 * api_error_NNN / empty_response / invalid_json) — never a single
 * generic message (requirement 3, Fase A). */
function describeRejectionReason(reason: string): string {
  if (reason.startsWith("api_error_")) return `Chamada à API falhou (${reason}) — nenhuma cobrança, resposta não gerada.`;
  if (reason === "empty_response") return "Resposta do modelo veio vazia (sem conteúdo) — chamada faturável, mas sem avaliação usável.";
  if (reason === "invalid_json") return "Resposta do modelo não é um JSON válido — chamada faturável, mas sem avaliação usável.";
  if (reason === "hallucination_guard:zero_verified_evidence") {
    return "Todas as evidências citadas pelo modelo foram rejeitadas por não corresponderem aos dados reais — recomendação ficaria sem nenhuma evidência verificada.";
  }
  if (reason.startsWith("hallucination_guard:invalid_")) {
    return `Formato da resposta do modelo inválido (${reason.slice("hallucination_guard:invalid_".length)}) — chamada faturável, mas sem avaliação usável.`;
  }
  return `Resposta do modelo rejeitada (${reason}).`;
}

/**
 * Orchestrates one candidate's AI evaluation — owner's authorization,
 * 2026-11-22, section 6: cache-first, budget-gated, never a silent
 * paid call. A fallback evaluation ALWAYS recommends "observar" (never
 * "priorizar" — the one thing this layer must never do without a real,
 * validated model response is actively endorse a candidate) and is
 * always marked `isFallback: true`, so a caller can never mistake it
 * for a real evaluation.
 */
export async function analyzeCandidate(input: AnalystEvidenceInput): Promise<AnalystEvaluation> {
  const evidenceFingerprint = computeEvidenceFingerprint(input);

  const cached = await prisma.commercialAnalystEvaluation.findUnique({
    where: { merchantListingId_evidenceFingerprint: { merchantListingId: input.merchantListingId, evidenceFingerprint } },
  });
  if (cached) {
    return {
      merchantListingId: input.merchantListingId,
      recommendation: cached.recommendation as AnalystEvaluation["recommendation"],
      commercialScore: cached.commercialScore,
      confidence: cached.confidence,
      favorableArguments: cached.favorableArguments as string[],
      risks: cached.risks as string[],
      evidenceUsed: cached.evidenceUsed as EvidenceKey[],
      missingData: cached.missingData as MissingDataKey[],
      isFallback: cached.isFallback,
      fallbackReason: null,
      model: cached.model,
      costUsd: cached.costUsd?.toNumber() ?? null,
      cached: true,
    };
  }

  const budget = await checkAnalystBudget();
  if (!budget.allowed) {
    return fallback(input.merchantListingId, budget.reason);
  }

  let attempt;
  try {
    attempt = await callAnalyst(input);
  } catch (err) {
    if (err instanceof OpenAiAnalystNotConfiguredError) {
      return fallback(input.merchantListingId, "OPENAI_API_KEY não configurada — avaliação de IA não executada.");
    }
    throw err;
  }

  // Requirement 1 (Fase A): toda chamada FATURÁVEL é contabilizada no
  // orçamento real, aceita ou não — o problema original era que uma
  // rejeição nunca chegava a esta linha.
  if (attempt.billable && attempt.costUsd > 0) {
    await recordAnalystSpend({
      amountUsd: attempt.costUsd,
      note: `Avaliação comercial${attempt.outcome.accepted ? "" : " [REJEITADA]"} — ${input.title.slice(0, 60)}`,
    });
  }

  if (!attempt.outcome.accepted) {
    return fallback(input.merchantListingId, describeRejectionReason(attempt.outcome.reason), attempt.billable ? attempt.costUsd : null);
  }

  const sanitized = attempt.outcome.sanitized;
  await prisma.commercialAnalystEvaluation.create({
    data: {
      merchantListingId: input.merchantListingId,
      evidenceFingerprint,
      evidenceSnapshot: input as object,
      recommendation: sanitized.recommendation,
      commercialScore: sanitized.commercialScore,
      confidence: sanitized.confidence,
      favorableArguments: sanitized.favorableArguments,
      risks: sanitized.risks,
      evidenceUsed: sanitized.evidenceUsed,
      missingData: sanitized.missingData,
      rawResponseText: attempt.rawResponseText,
      model: ANALYST_MODEL,
      promptTokens: attempt.promptTokens,
      completionTokens: attempt.completionTokens,
      costUsd: attempt.costUsd,
      isFallback: false,
    },
  });

  return {
    merchantListingId: input.merchantListingId,
    recommendation: sanitized.recommendation,
    commercialScore: sanitized.commercialScore,
    confidence: sanitized.confidence,
    favorableArguments: sanitized.favorableArguments,
    risks: sanitized.risks,
    evidenceUsed: sanitized.evidenceUsed,
    missingData: sanitized.missingData,
    isFallback: false,
    fallbackReason: null,
    model: ANALYST_MODEL,
    costUsd: attempt.costUsd,
    cached: false,
  };
}

/** Conservative per-call ceiling used ONLY to decide, before a call is
 * ever made, whether the run-level cost cap (maxTotalCostUsd) could be
 * exceeded — real documented gpt-4o-mini pricing puts an actual call at
 * a few hundredths of a cent (see openai-analyst-client.ts), so this is
 * already several times that worst case, deliberately pessimistic. */
const ESTIMATED_MAX_COST_PER_CALL_USD = 0.002;

/** Bounded batch wrapper — owner's requirement, section 6:
 * "VITRINE_ANALYST_MAX_CANDIDATES_PER_RUN" caps a single run's worst-case
 * spend independent of the dollar budget (belt-and-suspenders: the
 * dollar ceiling alone could still be reached mid-run on a day nothing
 * else has spent anything yet). Candidates are evaluated strictly in the
 * order given — callers should pass already-rank-ordered candidates
 * (strongest objective score first) so a truncated run still evaluates
 * the most commercially relevant ones.
 *
 * `options.maxTotalCostUsd` — owner's authorization, 2026-11-22
 * ("Operação Cérebro Comercial", Fase A, requirement 2 / seção 13): a
 * hard ceiling for THIS run specifically, independent of and in
 * addition to the daily/monthly ledger in budget.ts. Checked BEFORE
 * every call with a deliberately pessimistic per-call estimate (never
 * starts a call that COULD push the run over the ceiling) and AFTER
 * every call with the real recorded cost (halts immediately if the
 * real total ever exceeds it anyway) — the same two-sided guarantee
 * proven in the one-off controlled-test script this replaces, now part
 * of the real pipeline instead of a throwaway script.
 */
export async function analyzeCandidates(inputs: AnalystEvidenceInput[], options?: { maxTotalCostUsd?: number }): Promise<AnalystEvaluation[]> {
  const bounded = inputs.slice(0, env.VITRINE_ANALYST_MAX_CANDIDATES_PER_RUN);
  const results: AnalystEvaluation[] = [];
  let runCostUsd = 0;

  for (const input of bounded) {
    if (options?.maxTotalCostUsd !== undefined && runCostUsd + ESTIMATED_MAX_COST_PER_CALL_USD > options.maxTotalCostUsd) {
      results.push(
        fallback(
          input.merchantListingId,
          `Teto de custo desta execução (US$ ${options.maxTotalCostUsd.toFixed(4)}) seria arriscado de ultrapassar — avaliação pulada ANTES de chamar a API (gasto real já acumulado: US$ ${runCostUsd.toFixed(4)}).`,
        ),
      );
      continue;
    }

    const evaluation = await analyzeCandidate(input);
    runCostUsd += evaluation.costUsd ?? 0;
    results.push(evaluation);

    if (options?.maxTotalCostUsd !== undefined && runCostUsd > options.maxTotalCostUsd) {
      // Belt-and-suspenders: should never trigger given the pessimistic
      // pre-check above, but halts immediately rather than trusting it.
      break;
    }
  }

  return results;
}
