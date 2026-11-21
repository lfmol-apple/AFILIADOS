import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { pruneOldSelectionRounds } from "@/jobs/vitrine-selection-round-cleanup";

/**
 * Owner's directive, 2026-11-21 ("Histórico de candidatos — aprovado"):
 * "Implemente e teste a rotina de limpeza, mas deixe sua execução
 * automática desativada até autorização específica." This tests the
 * real retention logic (pruneOldSelectionRounds) against the local dev
 * database — never production — and separately confirms the job's own
 * entrypoint stays disabled by default (see the structural check below).
 */

async function makeRound(createdAt: Date) {
  const round = await prisma.vitrineSelectionRound.create({
    data: { foundInDatabase: 1, afterDedup: 1, discardedNoPrice: 0, discardedIneligible: 0, evaluated: 1, selected: 0 },
  });
  // createdAt has a DB-level default(now()) — backdate it explicitly for the test.
  await prisma.vitrineSelectionRound.update({ where: { id: round.id }, data: { createdAt } });
  return round.id;
}

describe("pruneOldSelectionRounds — real retention logic against the local dev DB", () => {
  afterEach(async () => {
    await prisma.vitrineSelectionRound.deleteMany({ where: { foundInDatabase: 1, afterDedup: 1, evaluated: 1 } });
  });

  it("deletes only rounds older than the retention window, keeps recent ones", async () => {
    const now = new Date("2026-11-21T12:00:00Z");
    const oldId = await makeRound(new Date("2026-09-01T00:00:00Z")); // well past 60 days
    const recentId = await makeRound(new Date("2026-11-20T00:00:00Z")); // 1 day old

    const { deletedRounds } = await pruneOldSelectionRounds(60, now);
    expect(deletedRounds).toBeGreaterThanOrEqual(1);

    const oldStillThere = await prisma.vitrineSelectionRound.findUnique({ where: { id: oldId } });
    const recentStillThere = await prisma.vitrineSelectionRound.findUnique({ where: { id: recentId } });
    expect(oldStillThere).toBeNull();
    expect(recentStillThere).not.toBeNull();
  });

  it("cascades to delete the round's candidate rows too (no orphans left behind)", async () => {
    const now = new Date("2026-11-21T12:00:00Z");
    const roundId = await makeRound(new Date("2026-01-01T00:00:00Z"));
    await prisma.vitrineSelectionRoundCandidate.create({
      data: { roundId, merchantListingId: "fake-cleanup-test", eligible: true, finalDecision: "SELECTED", justification: "teste" },
    });

    await pruneOldSelectionRounds(60, now);

    const orphan = await prisma.vitrineSelectionRoundCandidate.findFirst({ where: { merchantListingId: "fake-cleanup-test" } });
    expect(orphan).toBeNull();
  });

  it("deletes nothing when every round is within the retention window", async () => {
    const now = new Date("2026-11-21T12:00:00Z");
    await makeRound(new Date("2026-11-20T00:00:00Z"));
    const { deletedRounds } = await pruneOldSelectionRounds(60, now);
    expect(deletedRounds).toBe(0);
  });
});

describe("structural guard — the cleanup job is never auto-wired", () => {
  it("is not referenced by the real production orchestrator (jobs/run-ml-shopee-cycle.ts)", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../jobs/run-ml-shopee-cycle.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/vitrine-selection-round-cleanup|VITRINE_SELECTION_ROUND_CLEANUP/);
  });

  it("the job's own CLI entrypoint requires an explicit opt-in env flag before it does anything", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../jobs/vitrine-selection-round-cleanup.ts", import.meta.url), "utf8");
    expect(source).toMatch(/VITRINE_SELECTION_ROUND_CLEANUP_ENABLED/);
  });
});
