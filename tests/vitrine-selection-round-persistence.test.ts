import { describe, expect, it } from "vitest";
import { buildRoundCandidateRows } from "@/lib/services/vitrine-selection-round-persistence";
import type { DiscardedCandidate, VitrineCandidate } from "@/lib/services/vitrine-selection";

function fakeCandidate(overrides: Partial<VitrineCandidate> & { merchantListingId: string; group: VitrineCandidate["group"] }): VitrineCandidate {
  return {
    canonicalProductId: "canonical-1",
    title: "Produto Teste",
    score: 70,
    rankingScore: 70,
    reason: "Pontuação multifatorial calculada.",
    scoreBreakdown: {
      score: 70,
      confidence: 1,
      rankingScore: 70,
      components: {
        salesEvidence: { value: 88, weight: 0.2, detail: "" },
        commissionValue: { value: 50, weight: 0.2, detail: "" },
        priceCompetitiveness: { value: 50, weight: 0.15, detail: "" },
        quality: { value: 50, weight: 0.15, detail: "" },
        seasonality: { value: 0, weight: 0.15, detail: "" },
        trend: { value: null, weight: 0.1, detail: "" },
        adPerformance: { value: 0, weight: 0.05, detail: "" },
      },
      reasons: [],
      degradedDimensions: [],
    } as unknown as VitrineCandidate["scoreBreakdown"],
    matchedEventName: null,
    matchedKeyword: null,
    commissionEvidence: { type: "historical", rate: 0.1, estimatedValueBrl: 10, stale: true },
    priceCompetitiveness: { score: null, siblingOfferCount: 0, hasConfirmedPriceDrop: false },
    adPotentialHypothesis: { impulseFit: "moderado", impulseFitReason: "", offerClarity: "clara", offerClarityReason: "", hasVisibleDiscountHook: false, note: "" },
    categoryId: null,
    commercialAudit: { verdict: "aprovado", reasons: [] } as unknown as VitrineCandidate["commercialAudit"],
    salesEvidenceType: "official_rank",
    ...overrides,
  };
}

describe("buildRoundCandidateRows — pure, DB-free row-building for round persistence", () => {
  it("marks a candidate in selectedIds as SELECTED, preserving real commission/sales-evidence fields", () => {
    const candidate = fakeCandidate({ merchantListingId: "listing-a", group: "recorrente" });
    const rows = buildRoundCandidateRows({
      allScored: [candidate],
      discarded: [],
      selectedIds: new Set(["listing-a"]),
      reserveIds: new Set(),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.finalDecision).toBe("SELECTED");
    expect(rows[0]!.commissionType).toBe("historical");
    expect(rows[0]!.commissionFresh).toBe(false); // stale: true -> commissionFresh: false
    expect(rows[0]!.salesEvidenceType).toBe("official_rank");
    expect(rows[0]!.demandScore).toBe(88);
    expect(rows[0]!.eligible).toBe(true);
  });

  it("marks a candidate in reserveIds as RESERVE, and everything else scored as DISCARDED_BY_QUOTA", () => {
    const reserveCandidate = fakeCandidate({ merchantListingId: "listing-b", group: "recorrente" });
    const cutCandidate = fakeCandidate({ merchantListingId: "listing-c", group: "recorrente" });
    const rows = buildRoundCandidateRows({
      allScored: [reserveCandidate, cutCandidate],
      discarded: [],
      selectedIds: new Set(),
      reserveIds: new Set(["listing-b"]),
    });
    expect(rows.find((r) => r.merchantListingId === "listing-b")!.finalDecision).toBe("RESERVE");
    expect(rows.find((r) => r.merchantListingId === "listing-c")!.finalDecision).toBe("DISCARDED_BY_QUOTA");
  });

  it("assigns rankInGroup per group, in the order allScored already provides (never re-sorts)", () => {
    const a = fakeCandidate({ merchantListingId: "a", group: "recorrente" });
    const b = fakeCandidate({ merchantListingId: "b", group: "recorrente" });
    const c = fakeCandidate({ merchantListingId: "c", group: "sazonal" });
    const rows = buildRoundCandidateRows({ allScored: [a, b, c], discarded: [], selectedIds: new Set(), reserveIds: new Set() });
    expect(rows.find((r) => r.merchantListingId === "a")!.rankInGroup).toBe(1);
    expect(rows.find((r) => r.merchantListingId === "b")!.rankInGroup).toBe(2);
    expect(rows.find((r) => r.merchantListingId === "c")!.rankInGroup).toBe(1); // separate group, own ranking
  });

  it("represents a discarded (pre-scoring) candidate with eligible: false and no score/commission data", () => {
    const discarded: DiscardedCandidate[] = [
      { merchantListingId: "listing-d", title: "Produto Invalido", reason: "sem_preco_confirmado", detail: "Sem oferta com preço confirmado." },
    ];
    const rows = buildRoundCandidateRows({ allScored: [], discarded, selectedIds: new Set(), reserveIds: new Set() });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.finalDecision).toBe("DISCARDED");
    expect(rows[0]!.eligible).toBe(false);
    expect(rows[0]!.score).toBeNull();
    expect(rows[0]!.discardReason).toBe("sem_preco_confirmado");
  });

  it("skips a discarded entry with no merchantListingId (the rare family-level dedup case) rather than inventing one", () => {
    const discarded: DiscardedCandidate[] = [
      { merchantListingId: null, title: "Produto X", reason: "duplicado_familia", detail: "Mesmo produto canônico já selecionado." },
    ];
    const rows = buildRoundCandidateRows({ allScored: [], discarded, selectedIds: new Set(), reserveIds: new Set() });
    expect(rows).toHaveLength(0);
  });

  it("never produces two rows for the same merchantListingId within one round — defensive dedup even if allScored and discarded ever overlapped upstream", () => {
    const scored = fakeCandidate({ merchantListingId: "shared-id", group: "recorrente" });
    const alsoDiscarded: DiscardedCandidate[] = [
      { merchantListingId: "shared-id", title: "Produto Teste", reason: "evidencia_insuficiente", detail: "Hipotético — upstream nunca produz isto hoje (verified in vitrine-selection.ts), teste defensivo." },
    ];
    const rows = buildRoundCandidateRows({ allScored: [scored], discarded: alsoDiscarded, selectedIds: new Set(["shared-id"]), reserveIds: new Set() });
    expect(rows).toHaveLength(1); // the richer, scored row wins; the discard is dropped as a duplicate
    expect(rows[0]!.finalDecision).toBe("SELECTED");
  });

  it("is a pure function — calling it twice with the same inputs yields identical output, never accumulating state across calls (restart-safety at this layer)", () => {
    const candidate = fakeCandidate({ merchantListingId: "listing-x", group: "recorrente" });
    const input = { allScored: [candidate], discarded: [] as DiscardedCandidate[], selectedIds: new Set(["listing-x"]), reserveIds: new Set<string>() };
    const first = buildRoundCandidateRows(input);
    const second = buildRoundCandidateRows(input);
    expect(second).toEqual(first);
    expect(first).toHaveLength(1);
  });
});
