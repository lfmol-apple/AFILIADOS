import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import type { AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial
 * com IA"). Real integration tests against the local dev DB, with the
 * OpenAI endpoint mocked (vi.stubGlobal("fetch", ...)) — mirrors the
 * exact pattern tests/quality-control-classification.test.ts already
 * uses for the creative factory's own OpenAI call. NEVER a real paid
 * call, consistent with the owner's explicit prohibition this session.
 */
const baseInput: AnalystEvidenceInput = {
  merchantListingId: `ml-analyst-test-${Date.now()}`,
  title: "Furadeira Parafusadeira Sem Fio 12V",
  brand: "The Black Tools",
  categoryId: "MLB263532",
  currentPriceBrl: 199.9,
  salesEvidence: { type: "official_rank", demandScore: 70 },
  commissionEvidence: { type: "confirmed_individual", rate: 0.12, estimatedValueBrl: 23.99, ageDays: 3, stale: false },
  priceCompetitiveness: { competitivenessScore: 95, siblingOfferCount: 4, hasConfirmedPriceDrop: true },
  qualitySignal: 85,
  trendDirection: "rising",
  matchedEventName: null,
  corroborationSourceCount: 2,
  discoverySource: "general_market_scan",
};

function mockOpenAiResponse(body: Record<string, unknown>, promptTokens = 120, completionTokens = 60) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(body) } }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
    }),
    text: async () => "",
  }));
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  await prisma.commercialAnalystEvaluation.deleteMany({ where: { merchantListingId: baseInput.merchantListingId } });
  await prisma.commercialAnalystSpend.deleteMany({ where: { note: { contains: baseInput.title.slice(0, 30) } } });
});

describe("analyzeCandidate — real orchestration (mocked OpenAI, local dev DB)", () => {
  it("falls back honestly (never 'priorizar') when OPENAI_API_KEY is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { analyzeCandidate } = await import("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate");
    const result = await analyzeCandidate(baseInput);
    expect(result.isFallback).toBe(true);
    expect(result.recommendation).toBe("observar");
    expect(result.cached).toBe(false);
  });

  it("falls back and never calls the API once the real daily budget is exceeded", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    vi.stubEnv("VITRINE_ANALYST_DAILY_BUDGET_USD", "0.0001");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { recordAnalystSpend } = await import("@/lib/services/commercial-intelligence/ai-analyst/budget");
    await recordAnalystSpend({ amountUsd: 0.0001, note: baseInput.title.slice(0, 30) });
    const { analyzeCandidate } = await import("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate");
    const result = await analyzeCandidate({ ...baseInput, merchantListingId: `${baseInput.merchantListingId}-budget` });
    expect(result.isFallback).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    await prisma.commercialAnalystEvaluation.deleteMany({ where: { merchantListingId: `${baseInput.merchantListingId}-budget` } });
  });

  it("persists a real evaluation and records real metered spend on a successful, verifiable response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    vi.stubGlobal(
      "fetch",
      mockOpenAiResponse({
        recommendation: "priorizar",
        commercialScore: 82,
        confidence: 0.75,
        favorableArguments: ["Posição real no ranking oficial da categoria.", "Queda de preço confirmada frente a 4 ofertas reais."],
        risks: ["Comissão pode variar — avaliação recente, mas não garantida no futuro."],
        evidenceUsed: ["sales_official_rank", "price_drop_confirmed", "price_competitiveness_scored"],
        missingData: [],
      }),
    );
    const { analyzeCandidate } = await import("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate");
    const result = await analyzeCandidate(baseInput);

    expect(result.isFallback).toBe(false);
    expect(result.recommendation).toBe("priorizar");
    expect(result.cached).toBe(false);
    expect(result.costUsd).toBeGreaterThan(0);

    const spend = await prisma.commercialAnalystSpend.findFirst({ where: { note: { contains: baseInput.title.slice(0, 30) } } });
    expect(spend).not.toBeNull();

    const persisted = await prisma.commercialAnalystEvaluation.findFirst({ where: { merchantListingId: baseInput.merchantListingId } });
    expect(persisted?.recommendation).toBe("priorizar");
  });

  it("returns a cached result on a second call with the SAME real evidence — never calls the API twice", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    const fetchSpy = mockOpenAiResponse({
      recommendation: "observar",
      commercialScore: 50,
      confidence: 0.5,
      favorableArguments: ["Evidência parcial."],
      risks: [],
      evidenceUsed: ["sales_official_rank"],
      missingData: ["commission_unknown"],
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { analyzeCandidate } = await import("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate");

    const first = await analyzeCandidate(baseInput);
    expect(first.cached).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await analyzeCandidate(baseInput);
    expect(second.cached).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no second real call for unchanged evidence
    expect(second.recommendation).toBe(first.recommendation);
  });

  it("falls back when the model's response fails the hallucination guard — never persists a fabricated evaluation", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    vi.stubGlobal(
      "fetch",
      mockOpenAiResponse({
        recommendation: "priorizar",
        commercialScore: 99,
        confidence: 0.99,
        favorableArguments: ["Tendência de queda confirmada."],
        risks: [],
        // "trend_falling" is fabricated — baseInput.trendDirection is "rising".
        evidenceUsed: ["trend_falling"],
        missingData: [],
      }),
    );
    const { analyzeCandidate } = await import("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate");
    const result = await analyzeCandidate(baseInput);
    expect(result.isFallback).toBe(true);
    expect(result.recommendation).toBe("observar");

    const persisted = await prisma.commercialAnalystEvaluation.findFirst({ where: { merchantListingId: baseInput.merchantListingId } });
    expect(persisted).toBeNull();
  });
});
