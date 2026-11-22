import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import type { PooledCandidate, VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial
 * com IA", section 4/8). Proves the F methodology end to end: real
 * (mocked) AI call, real elimination, real backfill from the extended
 * pool — never a fabricated price/evidence (the bug this test would
 * have caught: an earlier version synthesized `currentPrice: 0`).
 */
function pooled(merchantListingId: string, currentPrice: number): PooledCandidate {
  return {
    merchantListingId,
    canonicalProductId: `cp-${merchantListingId}`,
    title: `Produto ${merchantListingId}`,
    currentPrice,
    discoverySource: "general_market_scan",
    salesEvidence: { type: "official_rank", demandScore: 70, detail: "" },
    commissionEvidence: { type: "confirmed_individual", rate: 0.1, capturedAt: new Date(), ageDays: 2, stale: false, estimatedValueBrl: currentPrice * 0.1, source: "fixture" },
    priceCompetitiveness: { competitivenessScore: 90, siblingOfferCount: 3, cheapestPrice: currentPrice, thisPrice: currentPrice, hasConfirmedPriceDrop: false, priceDropHeadline: null, detail: "" },
    qualitySignal: null,
    monetizationComponents: null,
    matchedEvent: null,
    matchedKeyword: null,
    trendDirection: null,
    vitrineClickCount: 0,
    corroboration: { sources: ["official_rank"], count: 1 },
    categoryId: "MLB5726",
  };
}

function vitrineCandidate(merchantListingId: string, rankingScore: number): VitrineCandidate {
  return {
    merchantListingId,
    canonicalProductId: `cp-${merchantListingId}`,
    title: `Produto ${merchantListingId}`,
    score: rankingScore,
    rankingScore,
    group: "recorrente",
    reason: "fixture",
    scoreBreakdown: {} as VitrineCandidate["scoreBreakdown"],
    matchedEventName: null,
    matchedKeyword: null,
    commissionEvidence: { type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 10, stale: false },
    priceCompetitiveness: { score: 90, siblingOfferCount: 3, hasConfirmedPriceDrop: false },
    adPotentialHypothesis: {} as VitrineCandidate["adPotentialHypothesis"],
    categoryId: "MLB5726",
    commercialAudit: { verdict: "aprovado_para_teste" } as VitrineCandidate["commercialAudit"],
    salesEvidenceType: "official_rank",
  };
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  await prisma.commercialAnalystEvaluation.deleteMany({ where: { merchantListingId: { startsWith: "lab-ai-" } } });
  await prisma.commercialAnalystSpend.deleteMany({ where: { note: { contains: "Produto lab-ai-" } } });
});

describe("rankByAiAssisted — real evidence, never fabricated", () => {
  it("sends the REAL price/evidence from the pool (never a placeholder) and removes the AI-rejected candidate", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    const fetchSpy = vi.fn(async (_url: string, opts: { body: string }) => {
      const body = JSON.parse(opts.body) as { messages: Array<{ content: string }> };
      const userMsg = body.messages[1]!.content;
      const sent = JSON.parse(userMsg.slice(userMsg.indexOf("\n") + 1)) as { precoAtualBrl: number };
      const rejectIt = sent.precoAtualBrl === 50; // the weak/cheap one gets rejected
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  recommendation: rejectIt ? "rejeitar" : "observar",
                  commercialScore: rejectIt ? 10 : 60,
                  confidence: 0.6,
                  favorableArguments: [],
                  risks: rejectIt ? ["Evidência de vendas fraca para este preço."] : [],
                  evidenceUsed: ["sales_official_rank"],
                  missingData: [],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 40 },
        }),
        text: async () => "",
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const pool = [pooled("lab-ai-a", 199.9), pooled("lab-ai-b", 50), pooled("lab-ai-c", 149.9)];
    const extendedRankedPool = [vitrineCandidate("lab-ai-a", 90), vitrineCandidate("lab-ai-b", 80), vitrineCandidate("lab-ai-c", 70)];

    const { rankByAiAssisted } = await import("@/lib/services/commercial-intelligence/lab/methodologies");
    const result = await rankByAiAssisted(extendedRankedPool, pool, 2);

    // Real prices were sent — never a fabricated 0.
    const sentPrices = fetchSpy.mock.calls.map((call) => {
      const body = JSON.parse((call[1] as { body: string }).body) as { messages: Array<{ content: string }> };
      const content = body.messages[1]!.content;
      return (JSON.parse(content.slice(content.indexOf("\n") + 1)) as { precoAtualBrl: number }).precoAtualBrl;
    });
    expect(sentPrices.sort((a, b) => a - b)).toEqual([50, 149.9, 199.9]);

    // "b" (R$50) was rejected by the AI; "c" backfilled into the final 2 slots.
    expect(result.items.map((i) => i.merchantListingId)).toEqual(["lab-ai-a", "lab-ai-c"]);
  });
});
