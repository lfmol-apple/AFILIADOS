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

  // Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
  // follow-up, item 6): "crie testes de integração que falhem caso
  // applyPriorityAdjustment() deixe de ser chamado." This is the real
  // regression this closes: Fase E built and unit-tested that function,
  // but rankByAiAssisted never called it until this fix — every prior
  // ai_assisted_v1 run was, in practice, identical to multifactor_v3.
  // This test goes through the REAL rankByAiAssisted end-to-end (not a
  // unit test of applyPriorityAdjustment in isolation) with a genuine
  // "priorizar" AI response, so it fails the instant that wiring is
  // removed or short-circuited.
  it("a confident, evidence-backed 'priorizar' recommendation actually re-orders the FINAL items — proves applyPriorityAdjustment is wired in, not just tested in isolation", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    const fetchSpy = vi.fn(async (_url: string, opts: { body: string }) => {
      const body = JSON.parse(opts.body) as { messages: Array<{ content: string }> };
      const userMsg = body.messages[1]!.content;
      const sent = JSON.parse(userMsg.slice(userMsg.indexOf("\n") + 1)) as { precoAtualBrl: number };
      // The weakest-ranked candidate (lowest price here, used only as a
      // fixture discriminator) gets the confident "priorizar" — everyone
      // else gets a neutral "observar".
      const priorizar = sent.precoAtualBrl === 50;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  recommendation: priorizar ? "priorizar" : "observar",
                  commercialScore: priorizar ? 90 : 60,
                  confidence: priorizar ? 0.95 : 0.5,
                  favorableArguments: priorizar ? ["Demanda real confirmada e preço competitivo."] : [],
                  risks: [],
                  evidenceUsed: priorizar ? ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed"] : [],
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

    const pool = [pooled("lab-ai-x", 199.9), pooled("lab-ai-y", 149.9), pooled("lab-ai-z", 50)];
    // All 3 start with the SAME commission tier (confirmed_individual —
    // see pooled()/vitrineCandidate() fixtures), so the commission-tier
    // ceiling never blocks this specific rise — isolates the effect
    // being tested.
    const extendedRankedPool = [vitrineCandidate("lab-ai-x", 90), vitrineCandidate("lab-ai-y", 80), vitrineCandidate("lab-ai-z", 70)];

    const { rankByAiAssisted } = await import("@/lib/services/commercial-intelligence/lab/methodologies");
    const result = await rankByAiAssisted(extendedRankedPool, pool, 3);

    // Pre-adjustment order (what the safety filter alone produces) is
    // still the deterministic x/y/z order — proves the test fixture
    // itself isn't the thing moving "z".
    expect(result.picked.map((c) => c.merchantListingId)).toEqual(["lab-ai-x", "lab-ai-y", "lab-ai-z"]);
    // Post-adjustment: "z" rose on its own confident, evidenced
    // "priorizar" — this is what fails if applyPriorityAdjustment is
    // ever un-wired from rankByAiAssisted again.
    expect(result.order.map((c) => c.merchantListingId)).not.toEqual(["lab-ai-x", "lab-ai-y", "lab-ai-z"]);
    expect(result.order[0]!.merchantListingId).toBe("lab-ai-z");
    expect(result.priorityAdjustments.length).toBeGreaterThan(0);
    // The persisted `items` (what actually gets written to
    // CommercialSelectionItem.rank) must reflect the ADJUSTED order,
    // never the pre-adjustment one.
    expect(result.items.map((i) => i.merchantListingId)).toEqual(result.order.map((c) => c.merchantListingId));
    const zItem = result.items.find((i) => i.merchantListingId === "lab-ai-z")!;
    expect((zItem.evidenceSnapshot as { priorityAdjustment: { rankDelta: number } | null }).priorityAdjustment?.rankDelta).toBeGreaterThan(0);
  });

  it("a revisao_necessaria candidate's confident 'priorizar' is NEVER applied — the real audit verdict (not just a unit-test fixture) blocks the rise end-to-end", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendation: "priorizar",
                commercialScore: 95,
                confidence: 1,
                favorableArguments: ["Argumento forte, mas o produto ainda não foi confirmado pela auditoria."],
                risks: [],
                evidenceUsed: ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed"],
                missingData: [],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 40 },
      }),
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const pool = [pooled("lab-ai-pendente", 199.9), pooled("lab-ai-aprovado", 149.9)];
    const pendente = vitrineCandidate("lab-ai-pendente", 70);
    pendente.commercialAudit = { verdict: "revisao_necessaria", reasons: [], risks: ["evidência limitada"] } as VitrineCandidate["commercialAudit"];
    const aprovado = vitrineCandidate("lab-ai-aprovado", 90);
    const extendedRankedPool = [aprovado, pendente];

    const { rankByAiAssisted } = await import("@/lib/services/commercial-intelligence/lab/methodologies");
    const result = await rankByAiAssisted(extendedRankedPool, pool, 2);

    expect(result.order.map((c) => c.merchantListingId)).toEqual(["lab-ai-aprovado", "lab-ai-pendente"]);
    expect(result.priorityAdjustments).toHaveLength(0);
    const pendenteItem = result.items.find((i) => i.merchantListingId === "lab-ai-pendente")!;
    expect((pendenteItem.evidenceSnapshot as { commercialAuditVerdict: string }).commercialAuditVerdict).toBe("revisao_necessaria");
  });
});
