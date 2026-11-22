import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { computeEvidenceFingerprint } from "@/lib/services/commercial-intelligence/ai-analyst/evidence-fingerprint";
import { callAnalyst, ANALYST_MODEL, OpenAiAnalystNotConfiguredError } from "@/lib/services/commercial-intelligence/ai-analyst/openai-analyst-client";
import { checkAnalystBudget, recordAnalystSpend } from "@/lib/services/commercial-intelligence/ai-analyst/budget";
import type { AnalystEvaluation, AnalystEvidenceInput, EvidenceKey, MissingDataKey } from "@/lib/services/commercial-intelligence/ai-analyst/types";

function fallback(merchantListingId: string, reason: string): AnalystEvaluation {
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
    costUsd: null,
    cached: false,
  };
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

  let callResult;
  try {
    callResult = await callAnalyst(input);
  } catch (err) {
    if (err instanceof OpenAiAnalystNotConfiguredError) {
      return fallback(input.merchantListingId, "OPENAI_API_KEY não configurada — avaliação de IA não executada.");
    }
    throw err;
  }
  if (!callResult) {
    return fallback(input.merchantListingId, "Resposta do modelo rejeitada (JSON inválido, vazio, ou evidência não verificável).");
  }

  await recordAnalystSpend({
    amountUsd: callResult.costUsd,
    note: `Avaliação comercial — ${input.title.slice(0, 60)}`,
  });

  await prisma.commercialAnalystEvaluation.create({
    data: {
      merchantListingId: input.merchantListingId,
      evidenceFingerprint,
      evidenceSnapshot: input as object,
      recommendation: callResult.sanitized.recommendation,
      commercialScore: callResult.sanitized.commercialScore,
      confidence: callResult.sanitized.confidence,
      favorableArguments: callResult.sanitized.favorableArguments,
      risks: callResult.sanitized.risks,
      evidenceUsed: callResult.sanitized.evidenceUsed,
      missingData: callResult.sanitized.missingData,
      rawResponseText: callResult.rawResponseText,
      model: ANALYST_MODEL,
      promptTokens: callResult.promptTokens,
      completionTokens: callResult.completionTokens,
      costUsd: callResult.costUsd,
      isFallback: false,
    },
  });

  return {
    merchantListingId: input.merchantListingId,
    recommendation: callResult.sanitized.recommendation,
    commercialScore: callResult.sanitized.commercialScore,
    confidence: callResult.sanitized.confidence,
    favorableArguments: callResult.sanitized.favorableArguments,
    risks: callResult.sanitized.risks,
    evidenceUsed: callResult.sanitized.evidenceUsed,
    missingData: callResult.sanitized.missingData,
    isFallback: false,
    fallbackReason: null,
    model: ANALYST_MODEL,
    costUsd: callResult.costUsd,
    cached: false,
  };
}

/** Bounded batch wrapper — owner's requirement, section 6:
 * "VITRINE_ANALYST_MAX_CANDIDATES_PER_RUN" caps a single run's worst-case
 * spend independent of the dollar budget (belt-and-suspenders: the
 * dollar ceiling alone could still be reached mid-run on a day nothing
 * else has spent anything yet). Candidates are evaluated strictly in the
 * order given — callers should pass already-rank-ordered candidates
 * (strongest objective score first) so a truncated run still evaluates
 * the most commercially relevant ones. */
export async function analyzeCandidates(inputs: AnalystEvidenceInput[]): Promise<AnalystEvaluation[]> {
  const bounded = inputs.slice(0, env.VITRINE_ANALYST_MAX_CANDIDATES_PER_RUN);
  const results: AnalystEvaluation[] = [];
  for (const input of bounded) {
    results.push(await analyzeCandidate(input));
  }
  return results;
}
