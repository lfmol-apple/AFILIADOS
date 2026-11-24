import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { buildAnalystSystemPrompt, buildAnalystUserPrompt } from "@/lib/services/commercial-intelligence/ai-analyst/prompt-builder";
import type { AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";
import { validateAndSanitizeResponseDetailed, type RawAnalystResponse, type SanitizedAnalystResponse } from "@/lib/services/commercial-intelligence/ai-analyst/hallucination-guard";

export const ANALYST_MODEL = "gpt-4o-mini";

export class OpenAiAnalystNotConfiguredError extends Error {}

/** Every real attempt, accepted or not — owner's authorization,
 * 2026-11-22 ("Operação Cérebro Comercial", Fase A, requirement 1):
 * "contabilize o consumo de todas as chamadas, inclusive respostas
 * rejeitadas, inválidas e tentativas com resposta faturável." `billable`
 * is true whenever OpenAI actually reported token usage (it generated
 * and billed a completion) — independent of whether that completion
 * passed the hallucination guard. A request that failed before OpenAI
 * produced any completion (HTTP error) is never billable. */
export interface AnalystCallAttempt {
  billable: boolean;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  /** The real content returned by the model, when any was returned —
   * the caller only persists this durably for an ACCEPTED response
   * (analyze-candidate.ts). For a rejected one, this function has
   * already logged a short preview (first 500 chars) for diagnosis —
   * requirement 5: "retenção temporária... evitando armazenamento
   * desnecessário" — the caller never needs to store it again. */
  rawResponseText: string | null;
  outcome: { accepted: true; sanitized: SanitizedAnalystResponse } | { accepted: false; reason: string };
}

/**
 * Real call to OpenAI's chat/completions — same client shape as
 * lib/services/ai-creative-factory/quality-control.ts's own vision
 * check, same cheap text model (gpt-4o-mini: $0.15/M input, $0.60/M
 * output tokens — real, documented rates, never assumed free). Owner's
 * authorization, 2026-11-22, section 6: "modelos de texto econômicos
 * para análise." Every call is a FEW hundred tokens (one small JSON
 * object in, one small JSON object out) — the opposite cost profile of
 * the image-generation pipeline.
 *
 * Never returns null — always a real AnalystCallAttempt describing
 * exactly what happened (owner's authorization, 2026-11-22, "Operação
 * Cérebro Comercial", Fase A: every billable attempt must be
 * accounted for, accepted or not). The caller (analyze-candidate.ts)
 * decides what a rejected-but-billable attempt means for the budget
 * ledger and the returned AnalystEvaluation — this function's only job
 * is to report the real outcome and the real cost, honestly. Never
 * retries silently on a rejected response (retrying a non-deterministic
 * call to "fix" a bad answer would just mean spending money until one
 * happens to pass, which is never the intent of a safety gate). */
export async function callAnalyst(input: AnalystEvidenceInput): Promise<AnalystCallAttempt> {
  if (!env.OPENAI_API_KEY) {
    throw new OpenAiAnalystNotConfiguredError("callAnalyst requires OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ANALYST_MODEL,
      messages: [
        { role: "system", content: buildAnalystSystemPrompt() },
        { role: "user", content: buildAnalystUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!response.ok) {
    // OpenAI never reports token usage for a request that failed before
    // producing a completion — nothing was billed, so this is the one
    // real "not billable" case.
    const body = await response.text().catch(() => "");
    logger.error("ai_analyst.call_failed", { status: response.status, body: body.slice(0, 300) });
    return { billable: false, promptTokens: 0, completionTokens: 0, costUsd: 0, rawResponseText: null, outcome: { accepted: false, reason: `api_error_${response.status}` } };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;
  const costUsd = Math.round((promptTokens * 0.15e-6 + completionTokens * 0.6e-6) * 1e6) / 1e6;
  const billable = promptTokens > 0 || completionTokens > 0;

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    logger.error("ai_analyst.empty_response", { merchantListingId: input.merchantListingId });
    return { billable, promptTokens, completionTokens, costUsd, rawResponseText: null, outcome: { accepted: false, reason: "empty_response" } };
  }

  let raw: RawAnalystResponse;
  try {
    raw = JSON.parse(content) as RawAnalystResponse;
  } catch {
    logger.error("ai_analyst.invalid_json", { merchantListingId: input.merchantListingId, rawResponseTextPreview: content.slice(0, 500) });
    return { billable, promptTokens, completionTokens, costUsd, rawResponseText: content, outcome: { accepted: false, reason: "invalid_json" } };
  }

  const validated = validateAndSanitizeResponseDetailed(raw, input);
  if (!validated.ok) {
    // Requirement 5 ("retenção temporária... protegida"): only a short
    // preview reaches the (already short-retention) structured log —
    // never a new durable store, never the full text.
    logger.warn("ai_analyst.response_rejected_by_hallucination_guard", {
      merchantListingId: input.merchantListingId,
      reason: validated.reason,
      rawResponseTextPreview: content.slice(0, 500),
    });
    return { billable, promptTokens, completionTokens, costUsd, rawResponseText: content, outcome: { accepted: false, reason: `hallucination_guard:${validated.reason}` } };
  }

  return { billable, promptTokens, completionTokens, costUsd, rawResponseText: content, outcome: { accepted: true, sanitized: validated.value } };
}
