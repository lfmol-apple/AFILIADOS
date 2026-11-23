import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
 * follow-up, items 4 and 6). Real integration test against the local
 * dev DB proving the full chain rankByAiAssisted -> CommercialSelectionSnapshot
 * -> validated-ai-selection actually carries the ADJUSTED order all the
 * way through persistence and back — the exact regression item 6 names:
 * "O ajuste seja calculado, mas descartado antes da persistência" and "O
 * snapshot persista uma ordem diferente da ordem aprovada."
 *
 * Mocks the whole vitrine-selection module (buildCommercialCandidatePool/
 * selectVitrineCandidates/pickGlobalVitrineSelection) with real-shaped
 * VitrineCandidate fixtures — the commercial-audit/scoring LOGIC is
 * already covered elsewhere (tests/commercial-audit.test.ts,
 * tests/vitrine-score.test.ts); this test's own job is narrower and real
 * on its own terms: does runCommercialIntelligenceLab() actually persist
 * what rankByAiAssisted computed, and does loadValidatedAiSelection() read
 * that same order back. Mocks analyzeCandidates directly (no network, no
 * paid call) to force one real, evidenced "priorizar".
 */
const TEST_PREFIX = "teste-lab-persist-";

function fakeCandidate(id: string, rankingScore: number, auditVerdict: "aprovado_para_teste" | "revisao_necessaria" = "aprovado_para_teste"): VitrineCandidate {
  return {
    merchantListingId: id,
    canonicalProductId: `${TEST_PREFIX}cp-${id}`,
    title: `Produto fixture ${id}`,
    score: rankingScore,
    rankingScore,
    group: "recorrente",
    reason: "fixture de teste de persistência",
    scoreBreakdown: {} as VitrineCandidate["scoreBreakdown"],
    matchedEventName: null,
    matchedKeyword: null,
    commissionEvidence: { type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 10, stale: false },
    priceCompetitiveness: { score: 90, siblingOfferCount: 3, hasConfirmedPriceDrop: false },
    adPotentialHypothesis: {} as VitrineCandidate["adPotentialHypothesis"],
    categoryId: null,
    commercialAudit: { verdict: auditVerdict, reasons: [], risks: [] } as VitrineCandidate["commercialAudit"],
    salesEvidenceType: "official_rank",
  } as VitrineCandidate;
}

/** runCommercialIntelligenceLab() always creates ONE CommercialSelectionSnapshot
 * PER METHODOLOGY (7 total), most with fixed, test-prefix-free `notes` —
 * cleaning up by matching `notes` text would silently leave 5-6 of those
 * 7 rows behind every run, exactly the kind of leak that corrupted
 * tests/vitrine-ai-snapshot-validation.test.ts's "most recent snapshot"
 * assumption the first time this file ran inside the full suite. Delete
 * by the EXACT snapshot ids this test itself created instead. */
let snapshotIdsToClean: string[] = [];

afterEach(async () => {
  if (snapshotIdsToClean.length > 0) {
    await prisma.commercialSelectionCheckpoint.deleteMany({ where: { snapshotId: { in: snapshotIdsToClean } } });
    await prisma.commercialSelectionItem.deleteMany({ where: { snapshotId: { in: snapshotIdsToClean } } });
    await prisma.commercialSelectionSnapshot.deleteMany({ where: { id: { in: snapshotIdsToClean } } });
    snapshotIdsToClean = [];
  }
  vi.doUnmock("@/lib/services/vitrine-selection");
  vi.doUnmock("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate");
  vi.resetModules();
});

describe("runCommercialIntelligenceLab -> loadValidatedAiSelection — a ordem ajustada sobrevive à persistência real", () => {
  it("o snapshot ai_assisted_v1 persistido e relido reflete a ordem PÓS-ajuste, nunca a pré-ajuste", async () => {
    const weak = fakeCandidate(`${TEST_PREFIX}weak`, 50);
    const mid = fakeCandidate(`${TEST_PREFIX}mid`, 70);
    const strong = fakeCandidate(`${TEST_PREFIX}strong`, 90);
    // Ordem determinística: strong > mid > weak.
    const extendedPool = [strong, mid, weak];

    vi.doMock("@/lib/services/vitrine-selection", async () => {
      const actual = await vi.importActual<typeof import("@/lib/services/vitrine-selection")>(
        "@/lib/services/vitrine-selection",
      );
      return {
        ...actual,
        buildCommercialCandidatePool: vi.fn().mockResolvedValue({ pool: [], discarded: [], funnel: { foundInDatabase: 3, afterDedup: 3, discardedNoPrice: 0, discardedIneligible: 0, evaluated: 3 }, activeEvents: [] }),
        selectVitrineCandidates: vi.fn().mockResolvedValue({
          candidates: extendedPool,
          allScored: extendedPool,
          discarded: [],
          funnel: { foundInDatabase: 3, afterDedup: 3, discardedNoPrice: 0, discardedIneligible: 0, evaluated: 3 },
          activeEvents: [],
          groupReport: [],
        }),
        pickGlobalVitrineSelection: vi.fn().mockReturnValue({ picked: extendedPool, groupReport: [] }),
      };
    });

    // "weak" gets a confident, evidenced "priorizar" — forces a real
    // priority adjustment with no network/paid call.
    vi.doMock("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate", () => ({
      analyzeCandidates: vi.fn().mockResolvedValue([
        {
          merchantListingId: `${TEST_PREFIX}weak`,
          recommendation: "priorizar",
          commercialScore: 90,
          confidence: 0.95,
          favorableArguments: ["fixture"],
          risks: [],
          evidenceUsed: ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed"],
          missingData: [],
          isFallback: false,
          fallbackReason: null,
          model: "gpt-4o-mini",
          costUsd: 0,
          cached: false,
        } satisfies AnalystEvaluation,
      ]),
    }));

    vi.resetModules();
    const { runCommercialIntelligenceLab } = await import("@/lib/services/commercial-intelligence/lab/run-comparison");
    const { loadValidatedAiSelection } = await import("@/lib/services/commercial-intelligence/validated-ai-selection");

    const summary = await runCommercialIntelligenceLab();
    snapshotIdsToClean.push(...summary.snapshots.map((s) => s.snapshotId));
    const aiSnapshotMeta = summary.snapshots.find((s) => s.methodology === "ai_assisted_v1")!;
    expect(aiSnapshotMeta).toBeDefined();

    // Read back exactly what loadValidatedAiSelection() (the function the
    // real engine, vitrine-renewal-decision.ts, actually calls) sees —
    // never re-deriving the order from summary itself.
    const validated = await loadValidatedAiSelection();
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.snapshotId).toBe(aiSnapshotMeta.snapshotId);

    // "weak" rose to the top on its confident "priorizar" — the
    // persisted+reloaded order is NOT the pre-adjustment
    // strong/mid/weak order.
    expect(validated.orderedListingIds[0]).toBe(`${TEST_PREFIX}weak`);
    expect(validated.orderedListingIds).not.toEqual([
      `${TEST_PREFIX}strong`,
      `${TEST_PREFIX}mid`,
      `${TEST_PREFIX}weak`,
    ]);

    // Direct DB read, bypassing every helper, as the final, most literal
    // proof: the persisted rows themselves are in the adjusted order.
    const rows = await prisma.commercialSelectionItem.findMany({
      where: { snapshotId: aiSnapshotMeta.snapshotId },
      orderBy: { rank: "asc" },
      select: { merchantListingId: true, rank: true },
    });
    expect(rows[0]!.merchantListingId).toBe(`${TEST_PREFIX}weak`);
    expect(rows[0]!.rank).toBe(1);
  });

  it("um snapshot com um candidato revisao_necessaria nunca o promove, e isso é visível no registro persistido", async () => {
    const pendente = fakeCandidate(`${TEST_PREFIX}pendente`, 50, "revisao_necessaria");
    const aprovado = fakeCandidate(`${TEST_PREFIX}aprovado`, 70, "aprovado_para_teste");
    const extendedPool = [aprovado, pendente];

    vi.doMock("@/lib/services/vitrine-selection", async () => {
      const actual = await vi.importActual<typeof import("@/lib/services/vitrine-selection")>(
        "@/lib/services/vitrine-selection",
      );
      return {
        ...actual,
        buildCommercialCandidatePool: vi.fn().mockResolvedValue({ pool: [], discarded: [], funnel: { foundInDatabase: 2, afterDedup: 2, discardedNoPrice: 0, discardedIneligible: 0, evaluated: 2 }, activeEvents: [] }),
        selectVitrineCandidates: vi.fn().mockResolvedValue({
          candidates: extendedPool,
          allScored: extendedPool,
          discarded: [],
          funnel: { foundInDatabase: 2, afterDedup: 2, discardedNoPrice: 0, discardedIneligible: 0, evaluated: 2 },
          activeEvents: [],
          groupReport: [],
        }),
        pickGlobalVitrineSelection: vi.fn().mockReturnValue({ picked: extendedPool, groupReport: [] }),
      };
    });

    vi.doMock("@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate", () => ({
      analyzeCandidates: vi.fn().mockResolvedValue([
        {
          merchantListingId: `${TEST_PREFIX}pendente`,
          recommendation: "priorizar",
          commercialScore: 99,
          confidence: 1,
          favorableArguments: ["fixture"],
          risks: [],
          evidenceUsed: ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed"],
          missingData: [],
          isFallback: false,
          fallbackReason: null,
          model: "gpt-4o-mini",
          costUsd: 0,
          cached: false,
        } satisfies AnalystEvaluation,
      ]),
    }));

    vi.resetModules();
    const { runCommercialIntelligenceLab } = await import("@/lib/services/commercial-intelligence/lab/run-comparison");
    const summary = await runCommercialIntelligenceLab();
    snapshotIdsToClean.push(...summary.snapshots.map((s) => s.snapshotId));
    const aiSnapshotMeta = summary.snapshots.find((s) => s.methodology === "ai_assisted_v1")!;

    const rows = await prisma.commercialSelectionItem.findMany({
      where: { snapshotId: aiSnapshotMeta.snapshotId },
      orderBy: { rank: "asc" },
      select: { merchantListingId: true, rank: true, evidenceSnapshot: true },
    });
    expect(rows[0]!.merchantListingId).toBe(`${TEST_PREFIX}aprovado`); // never displaced by the pendente's priorizar
    const pendenteRow = rows.find((r) => r.merchantListingId === `${TEST_PREFIX}pendente`)!;
    expect((pendenteRow.evidenceSnapshot as { commercialAuditVerdict: string }).commercialAuditVerdict).toBe("revisao_necessaria");
  });
});
