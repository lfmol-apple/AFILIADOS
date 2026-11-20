import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { selectVitrineCandidates, type VitrineCandidate } from "@/lib/services/vitrine-selection";
import { registerCandidate } from "@/lib/services/commercial-intelligence/candidate-registry";
import { auditCandidate, type AuditInput } from "@/lib/services/commercial-intelligence/commercial-audit";
import type { VitrineScoreResult } from "@/lib/services/vitrine-score";
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
  // Owner's requirement, 2026-11-20 ("Auditoria Contínua", section 7):
  // an independent verdict, computed from the SAME raw evidence but by
  // its own, separate, more conservative criteria — never derived from
  // (or storing) the selection score itself. A candidate just selected
  // this cycle is, by construction, never "descricao_inadequada" (that's
  // a rejection gate in vitrine-selection.ts) and never stale (it was
  // just recomputed) — those two reprovação paths only ever fire for the
  // protected/stale rows handled separately below.
  const audit = auditCandidate({
    breakdown: candidate.scoreBreakdown,
    group: candidate.group,
    descriptionQuality: "adequada",
    priceCompetitivenessSampleSize: candidate.priceCompetitiveness.siblingOfferCount,
    commissionType: candidate.commissionEvidence.type as AuditInput["commissionType"],
    staleNotRecomputedThisCycle: false,
  });
  return {
    ...candidate.scoreBreakdown,
    matchedEventName: candidate.matchedEventName,
    matchedKeyword: candidate.matchedKeyword,
    commissionEvidence: candidate.commissionEvidence,
    priceCompetitiveness: candidate.priceCompetitiveness,
    adPotentialHypothesis: candidate.adPotentialHypothesis,
    commercialAudit: audit,
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
 *
 * Owner's authorization, 2026-11-20 ("Ordem de Execução", section 9): the
 * daily cap alone was never the real protection the owner asked for — a
 * fixed 4/day cap can still churn up to 28 of 30 slots across one week,
 * far past "10% de substituições comerciais por semana" (3 for a 30-slot
 * showcase). VITRINE_MAX_WEEKLY_REPLACEMENTS is the real, binding limit;
 * the daily cap stays as an extra, tighter same-day brake. Both apply —
 * whichever is smaller governs a given run.
 */
const VITRINE_CAPACITY = Number(process.env.VITRINE_CAPACITY ?? 30);
const VITRINE_MAX_DAILY_REPLACEMENTS = Number(
  process.env.VITRINE_MAX_DAILY_REPLACEMENTS ?? 4,
);
const VITRINE_MAX_WEEKLY_REPLACEMENTS = Number(
  process.env.VITRINE_MAX_WEEKLY_REPLACEMENTS ?? Math.max(1, Math.round(VITRINE_CAPACITY * 0.1)),
);
/** Owner's authorization, same section: "tempo mínimo de observação" — a
 * product that merely got outranked this cycle (not genuinely invalid)
 * stays at least this many days before it can be retired, so one bad
 * cycle of ranking noise never reads as "this doesn't work" on a sample
 * of a day or two. A genuinely invalid listing (gone, out of stock,
 * ineligible — present in `discarded` with a disqualifying reason) is
 * never protected by this: removing a broken offer is immediate, always.
 */
const VITRINE_MIN_OBSERVATION_DAYS = Number(process.env.VITRINE_MIN_OBSERVATION_DAYS ?? 3);
// Owner's finding, 2026-11-20 ("Auditoria Contínua"): a title that turns
// out to carry strong foreign-language markers is not "merely
// outranked" — it's the same kind of structural invalidity as an
// ineligible or untrustworthy price, and the independent audit
// (commercial-audit.ts) already reprova it outright. Confirmed live:
// without this, "Taza Termica... Vaca Lechera" and "Warm Snow Boots..."
// sat PROTECTED by minimum-observation-time despite being correctly
// flagged "reprovado" — removing a genuinely invalid offer must never
// wait out a protection window meant for ranking noise, not for this.
const DISQUALIFYING_DISCARD_REASONS = new Set([
  "sem_preco_confirmado",
  "inelegivel_para_anuncio",
  "preco_nao_confiavel",
  "descricao_inadequada",
]);

export async function runVitrineRenewJob() {
  return runJob("VITRINE_RENEW", async (ctx) => {
    ctx.metadata.legacyMonetizationScoreCandidatesRegistered = await registerLegacyMonetizationScoreCandidates();
    const { candidates, allScored, groupReport, discarded, funnel, activeEvents } =
      await selectVitrineCandidates(VITRINE_CAPACITY);
    const candidateIds = new Set(candidates.map((c) => c.merchantListingId));
    const scoredById = new Map(allScored.map((c) => [c.merchantListingId, c]));

    const current = await prisma.vitrineSelection.findMany({
      where: { status: "ACTIVE" },
    });
    const currentIds = new Set(current.map((c) => c.merchantListingId));

    // Owner's finding, 2026-11-20 ("Auditoria Contínua", section 4): this
    // used to refresh ONLY products still in the top-30 `candidates` —
    // meaning a product shielded from retirement by the rotation
    // protection below also had its score/evidence FROZEN, silently,
    // for as long as it stayed shielded. Confirmed live: Bicicleta
    // Ergométrica and Taza Termica kept showing their OLD, undiscounted
    // commission score for a full day after the stale-commission fix
    // shipped, because both had fallen out of the top 30 the same cycle
    // and never got touched again. Every product still found anywhere
    // in the broader, evidence-sufficient pool (`allScored`, not just
    // the top 30) gets fresh data every cycle — protection shields the
    // RETIREMENT decision only, never the evidence shown.
    const stillScored = current.filter((c) => scoredById.has(c.merchantListingId));
    for (const row of stillScored) {
      const fresh = scoredById.get(row.merchantListingId)!;
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

    // Owner's authorization, 2026-11-20 ("Ordem de Execução", section 9):
    // the real, binding rotation budget is per WEEK (10% of capacity, 3
    // for a 30-slot showcase), not per day — a fixed 4/day cap alone could
    // still churn most of the showcase across one week. Measured off
    // `activatedAt` across every row (active + reserve + retired) rather
    // than a dedicated event log — every genuine entry/replacement sets
    // this timestamp, so counting rows activated in the last 7 days IS
    // counting replacement events, with no extra schema needed.
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const recentEntries = await prisma.vitrineSelection.count({ where: { activatedAt: { gte: sevenDaysAgo } } });
    const weeklyBudgetRemaining = Math.max(0, VITRINE_MAX_WEEKLY_REPLACEMENTS - recentEntries);
    const rotationBudget = Math.min(VITRINE_MAX_DAILY_REPLACEMENTS, weeklyBudgetRemaining);

    const discardedByListingId = new Map(discarded.filter((d) => d.merchantListingId).map((d) => [d.merchantListingId!, d]));
    const droppedFromCandidates = current.filter((c) => !candidateIds.has(c.merchantListingId));

    // Genuinely invalid now (gone, out of stock, policy-ineligible, price
    // became untrustworthy) — removed the same cycle it's found broken,
    // never protected by minimum-observation-time, never rate-limited by
    // the rotation budget (owner's explicit split, section 9: "remoção de
    // ofertas inválidas" is immediate; the budget is only for discretionary
    // "better candidate found" swaps).
    const invalidNow = droppedFromCandidates.filter((c) => {
      const d = discardedByListingId.get(c.merchantListingId);
      return Boolean(d && DISQUALIFYING_DISCARD_REASONS.has(d.reason));
    });

    // Merely outranked this cycle (not structurally broken) — protected
    // until VITRINE_MIN_OBSERVATION_DAYS have passed since activation
    // (owner's requirement: "proteção contra conclusões com amostra
    // insuficiente"), and even once eligible, limited to what the
    // rotation budget still allows this week.
    const now = Date.now();
    const outrankedProtected: typeof droppedFromCandidates = [];
    const outrankedEligible = droppedFromCandidates.filter((c) => {
      if (invalidNow.includes(c)) return false;
      const observedLongEnough = !c.activatedAt || now - c.activatedAt.getTime() >= VITRINE_MIN_OBSERVATION_DAYS * 86_400_000;
      if (!observedLongEnough) outrankedProtected.push(c);
      return observedLongEnough;
    });
    const outrankedToRetire = outrankedEligible.slice(0, rotationBudget);
    const outrankedDeferredByBudget = outrankedEligible.slice(rotationBudget);

    const toRetire = [...invalidNow, ...outrankedToRetire];

    // Same finding as above, the other half of it: a dropped product
    // that isn't even in the broader sufficiency-passing pool anymore
    // (evidência ficou insuficiente, não só "superado por outro") has no
    // fresh score to show at all — but it's about to STAY active
    // (protected/deferred), so its REASON text must say so honestly
    // instead of leaving yesterday's "why it was picked" standing as if
    // still true. Skipped for rows about to be retired this cycle —
    // they get status+retiredAt updated below instead.
    const toRetireIds = new Set(toRetire.map((r) => r.id));
    for (const row of droppedFromCandidates) {
      if (scoredById.has(row.merchantListingId) || toRetireIds.has(row.id)) continue;
      const d = discardedByListingId.get(row.merchantListingId);
      if (!d) continue;
      const oldBreakdown = row.scoreBreakdown as Record<string, unknown>;
      await prisma.vitrineSelection.update({
        where: { id: row.id },
        data: {
          reason: `Nesta rodada, sem evidência suficiente para recalcular a nota — mantido ativo só por proteção de observação mínima: ${d.detail}`,
          scoreBreakdown: ({
            ...oldBreakdown,
            // Owner's requirement, section 7: the audit must flag this as
            // REPROVADO on its own — stale evidence that no longer clears
            // the real selection gate is never silently left looking
            // current just because it survived on protection.
            commercialAudit: auditCandidate({
              breakdown: oldBreakdown as unknown as VitrineScoreResult,
              group: row.groupType as VitrineCandidate["group"],
              descriptionQuality: "adequada",
              priceCompetitivenessSampleSize: 0,
              commissionType: "unknown",
              staleNotRecomputedThisCycle: true,
            }),
          } satisfies object) as object,
        },
      });
      ctx.counters.updated += 1;
    }

    // Newcomers fill: any genuine capacity headroom, plus exactly the
    // slots just freed above — never more. The very first run (current
    // length 0) is exempt from every cap, same reasoning as before: there
    // is no churn to protect against when the showcase doesn't exist yet.
    const headroom = Math.max(0, VITRINE_CAPACITY - current.length);
    const newcomerLimit = current.length === 0 ? candidates.length : toRetire.length + headroom;
    const newcomers = candidates
      .filter((c) => !currentIds.has(c.merchantListingId))
      .slice(0, newcomerLimit);

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
    // staying + newcomers undercounts: a product "protected" by minimum-
    // observation-time (or deferred by exhausted rotation budget) is
    // neither updated nor retired this cycle, but its row is still
    // ACTIVE — found live in the isolated test, 2026-11-20: metadata
    // reported active=21 while the real DB count (and the admin panel's
    // own direct query) was 30. current.length - retired + newcomers is
    // the one formula that's correct regardless of which bucket a
    // leftover product fell into.
    ctx.metadata.active = current.length - toRetire.length + newcomers.length;
    ctx.metadata.retired = toRetire.length;
    ctx.metadata.newcomers = newcomers.length;
    ctx.metadata.reserve = reserve.length;
    // Owner's requirement, section 9/13: the rotation budget and the
    // minimum-observation protection must be visible, not just enforced
    // silently — a reviewer should see exactly how much of this week's
    // churn allowance is left and which products were shielded.
    ctx.metadata.rotationStability = {
      weeklyLimit: VITRINE_MAX_WEEKLY_REPLACEMENTS,
      recentEntriesLast7d: recentEntries,
      weeklyBudgetRemainingBeforeThisRun: weeklyBudgetRemaining,
      dailyLimit: VITRINE_MAX_DAILY_REPLACEMENTS,
      rotationBudgetUsedThisRun: outrankedToRetire.length,
      invalidRemovedImmediately: invalidNow.length,
      protectedByMinObservation: outrankedProtected.length,
      deferredByExhaustedBudget: outrankedDeferredByBudget.length,
      minObservationDays: VITRINE_MIN_OBSERVATION_DAYS,
    };
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
