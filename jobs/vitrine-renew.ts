import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { selectVitrineCandidates } from "@/lib/services/vitrine-selection";
import { logger } from "@/lib/observability/logger";

/**
 * Daily renewal for the Vitrine Inteligente (project brief section 10):
 * re-selects up to VITRINE_CAPACITY listings, keeps winners that still
 * qualify, retires ones that fell off, promotes new ones found by the
 * regular ML discovery jobs — without replacing more than
 * VITRINE_MAX_DAILY_REPLACEMENTS per run (owner must never see the whole
 * showcase churn in one day). Uses runJob() for the same locking/
 * observability every other job in this project gets.
 */
const VITRINE_CAPACITY = Number(process.env.VITRINE_CAPACITY ?? 30);
const VITRINE_MAX_DAILY_REPLACEMENTS = Number(
  process.env.VITRINE_MAX_DAILY_REPLACEMENTS ?? 4,
);

export async function runVitrineRenewJob() {
  return runJob("VITRINE_RENEW", async (ctx) => {
    const candidates = await selectVitrineCandidates(VITRINE_CAPACITY);
    const candidateIds = new Set(candidates.map((c) => c.merchantListingId));

    const current = await prisma.vitrineSelection.findMany({
      where: { status: "ACTIVE" },
    });
    const currentIds = new Set(current.map((c) => c.merchantListingId));

    // Winners that still qualify: just refresh score/reason, never retire.
    const staying = current.filter((c) => candidateIds.has(c.merchantListingId));
    for (const row of staying) {
      const fresh = candidates.find((c) => c.merchantListingId === row.merchantListingId)!;
      await prisma.vitrineSelection.update({
        where: { id: row.id },
        data: {
          score: fresh.score,
          groupType: fresh.group,
          reason: fresh.reason,
          scoreBreakdown: fresh.scoreBreakdown as unknown as object,
        },
      });
      ctx.counters.updated += 1;
    }

    // Candidates not already active, best-scoring first, capped by the
    // daily replacement limit — never swap the whole showcase at once.
    const newcomers = candidates
      .filter((c) => !currentIds.has(c.merchantListingId))
      .slice(0, VITRINE_MAX_DAILY_REPLACEMENTS);

    const toRetire = current
      .filter((c) => !candidateIds.has(c.merchantListingId))
      .slice(0, newcomers.length);

    for (const row of toRetire) {
      await prisma.vitrineSelection.update({
        where: { id: row.id },
        data: { status: "RETIRED", retiredAt: new Date() },
      });
      ctx.counters.updated += 1;
    }

    for (const candidate of newcomers) {
      await prisma.vitrineSelection.upsert({
        where: { merchantListingId: candidate.merchantListingId },
        create: {
          merchantListingId: candidate.merchantListingId,
          groupType: candidate.group,
          status: "ACTIVE",
          score: candidate.score,
          scoreBreakdown: candidate.scoreBreakdown as unknown as object,
          reason: candidate.reason,
          activatedAt: new Date(),
        },
        update: {
          status: "ACTIVE",
          groupType: candidate.group,
          score: candidate.score,
          scoreBreakdown: candidate.scoreBreakdown as unknown as object,
          reason: candidate.reason,
          activatedAt: new Date(),
          retiredAt: null,
        },
      });
      ctx.counters.created += 1;
    }

    // Reserve list: best candidates not selected this round, for visibility
    // in the admin panel — not activated, just recorded as RESERVE.
    const reserve = candidates
      .filter(
        (c) =>
          !currentIds.has(c.merchantListingId) &&
          !newcomers.some((n) => n.merchantListingId === c.merchantListingId),
      )
      .slice(0, 20);
    for (const candidate of reserve) {
      await prisma.vitrineSelection.upsert({
        where: { merchantListingId: candidate.merchantListingId },
        create: {
          merchantListingId: candidate.merchantListingId,
          groupType: candidate.group,
          status: "RESERVE",
          score: candidate.score,
          scoreBreakdown: candidate.scoreBreakdown as unknown as object,
          reason: candidate.reason,
        },
        update: {
          score: candidate.score,
          groupType: candidate.group,
          scoreBreakdown: candidate.scoreBreakdown as unknown as object,
          reason: candidate.reason,
        },
      });
    }

    ctx.counters.processed = candidates.length;
    ctx.metadata.active = staying.length + newcomers.length;
    ctx.metadata.retired = toRetire.length;
    ctx.metadata.newcomers = newcomers.length;
    ctx.metadata.reserve = reserve.length;
    logger.info("vitrine_renew.done", ctx.metadata);
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runVitrineRenewJob()
    .then((counters) => {
      console.log("VITRINE_RENEW done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("VITRINE_RENEW failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
