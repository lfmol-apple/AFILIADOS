import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { selectVitrineCandidates, type VitrineCandidate } from "@/lib/services/vitrine-selection";
import { registerCandidate } from "@/lib/services/commercial-intelligence/candidate-registry";
import { logger } from "@/lib/observability/logger";

/** The site's own /ofertas monetizationScore, registered as ONE MORE
 * informational CommercialCandidateRegistry source (owner's
 * authorization, 2026-11-19, section 1: "poderá servir como uma
 * informação complementar, mas jamais como filtro eliminatório
 * obrigatório") — never the pool's gate anymore (see
 * vitrine-selection.ts's buildCommercialCandidatePool doc comment), just
 * one independent signal among the others for corroboration purposes. */
async function registerLegacyMonetizationScoreCandidates(limit = 500) {
  const top = await prisma.monetizationScore.findMany({
    where: { score: { not: null } },
    orderBy: { score: "desc" },
    take: limit,
    select: { merchantListingId: true, score: true, merchantListing: { select: { externalId: true } } },
  });
  for (const row of top) {
    await registerCandidate({
      externalId: row.merchantListing.externalId,
      merchantListingId: row.merchantListingId,
      sourceType: "monetization_score_legacy",
      sourceDetail: { score: row.score },
    });
  }
  return top.length;
}

/** Attaches the real search evidence (which event/keyword found this
 * product, when applicable) onto the stored breakdown — so the admin
 * panel can show it per product (owner's request: "explique por que cada
 * produto foi considerado sazonal, indicando o evento correspondente"),
 * without a schema change (VitrineSelection.scoreBreakdown is already a
 * free-form Json column). */
function breakdownWithEvidence(candidate: VitrineCandidate): object {
  return {
    ...candidate.scoreBreakdown,
    matchedEventName: candidate.matchedEventName,
    matchedKeyword: candidate.matchedKeyword,
    commissionEvidence: candidate.commissionEvidence,
    priceCompetitiveness: candidate.priceCompetitiveness,
    adPotentialHypothesis: candidate.adPotentialHypothesis,
  };
}

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
    ctx.metadata.legacyMonetizationScoreCandidatesRegistered = await registerLegacyMonetizationScoreCandidates();
    const { candidates, groupReport, discarded, funnel, activeEvents } =
      await selectVitrineCandidates(VITRINE_CAPACITY);
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
          scoreBreakdown: breakdownWithEvidence(fresh),
        },
      });
      ctx.counters.updated += 1;
    }

    // Candidates not already active, best-scoring first. The daily
    // replacement cap only protects an ALREADY-POPULATED showcase from
    // churning too fast — it must not apply to the very first run (found
    // live in the isolated-environment test, 2026-11-19: with
    // current.length === 0, the cap silently limited the brand-new
    // Vitrine to 4 products instead of filling it to capacity).
    const newcomerLimit = current.length === 0 ? candidates.length : VITRINE_MAX_DAILY_REPLACEMENTS;
    const newcomers = candidates
      .filter((c) => !currentIds.has(c.merchantListingId))
      .slice(0, newcomerLimit);

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
          scoreBreakdown: breakdownWithEvidence(candidate),
          reason: candidate.reason,
          activatedAt: new Date(),
        },
        update: {
          status: "ACTIVE",
          groupType: candidate.group,
          score: candidate.score,
          scoreBreakdown: breakdownWithEvidence(candidate),
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
          scoreBreakdown: breakdownWithEvidence(candidate),
          reason: candidate.reason,
        },
        update: {
          score: candidate.score,
          groupType: candidate.group,
          scoreBreakdown: breakdownWithEvidence(candidate),
          reason: candidate.reason,
        },
      });
    }

    ctx.counters.processed = candidates.length;
    ctx.metadata.active = staying.length + newcomers.length;
    ctx.metadata.retired = toRetire.length;
    ctx.metadata.newcomers = newcomers.length;
    ctx.metadata.reserve = reserve.length;
    // Owner's explicit request, 2026-11-19: when a group falls short of
    // its target, say why — never silently backfilled without a trace.
    // Full funnel (found -> deduped -> discarded -> evaluated -> selected)
    // and the discard list itself, so a reviewer can see exactly what was
    // excluded and why, not just the final 30.
    ctx.metadata.groupReport = groupReport;
    ctx.metadata.funnel = funnel;
    ctx.metadata.discarded = discarded.slice(0, 50);
    ctx.metadata.activeEvents = activeEvents;
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
