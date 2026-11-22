import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { buildAnalystSystemPrompt, buildAnalystUserPrompt } from "@/lib/services/commercial-intelligence/ai-analyst/prompt-builder";
import type { AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";
import { validateAndSanitizeResponse, type RawAnalystResponse, type SanitizedAnalystResponse } from "@/lib/services/commercial-intelligence/ai-analyst/hallucination-guard";

export const ANALYST_MODEL = "gpt-4o-mini";

export class OpenAiAnalystNotConfiguredError extends Error {}

export interface AnalystCallResult {
  sanitized: SanitizedAnalystResponse;
  rawResponseText: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
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
 * Returns null (never throws) when the response fails the structural
 * hallucination guard — the caller must treat that as "no usable
 * evaluation this time", recording a fallback, never retrying silently
 * (retrying a non-deterministic call to "fix" a bad answer would just
 * mean spending money until one happens to pass, which is never the
 * intent of a safety gate).
 */
export async function callAnalyst(input: AnalystEvidenceInput): Promise<AnalystCallResult | null> {
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
    const body = await response.text().catch(() => "");
    logger.error("ai_analyst.call_failed", { status: response.status, body: body.slice(0, 300) });
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    logger.error("ai_analyst.empty_response", { merchantListingId: input.merchantListingId });
    return null;
  }

  let raw: RawAnalystResponse;
  try {
    raw = JSON.parse(content) as RawAnalystResponse;
  } catch {
    logger.error("ai_analyst.invalid_json", { merchantListingId: input.merchantListingId });
    return null;
  }

  const sanitized = validateAndSanitizeResponse(raw, input);
  if (!sanitized) {
    logger.warn("ai_analyst.response_rejected_by_hallucination_guard", { merchantListingId: input.merchantListingId });
    return null;
  }

  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;
  const costUsd = Math.round((promptTokens * 0.15e-6 + completionTokens * 0.6e-6) * 1e6) / 1e6;

  return { sanitized, rawResponseText: content, promptTokens, completionTokens, costUsd };
}
