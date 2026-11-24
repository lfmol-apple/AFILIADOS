import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  selectVitrineCandidates,
  type VitrineCandidate,
  type DiscardedCandidate,
  type CandidatePoolFunnel,
  type GroupFillReport,
} from "@/lib/services/vitrine-selection";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";
import { countRecentCommercialSwaps } from "@/lib/services/vitrine-rotation-budget";
import { loadValidatedAiSelection, intersectWithEligiblePool, MIN_OVERLAP_RATIO } from "@/lib/services/commercial-intelligence/validated-ai-selection";

/**
 * Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
 * conectar a inteligência à seleção real), item 3: "a nova página...
 * precisa mostrar EXATAMENTE a seleção que será aplicada." Extracted
 * out of jobs/vitrine-renew.ts so there is exactly ONE implementation
 * of "who stays, who enters, who's retired, who's deferred by budget" —
 * the preview page and the real job call the SAME function, so the two
 * can never drift apart. This function performs NO writes and makes NO
 * AI call — it only reads the already-persisted AI snapshot
 * (validated-ai-selection.ts) and today's real, fresh eligibility.
 */

const VITRINE_CAPACITY = Number(process.env.VITRINE_CAPACITY ?? 30);
const VITRINE_MAX_DAILY_REPLACEMENTS = Number(process.env.VITRINE_MAX_DAILY_REPLACEMENTS ?? 4);
const VITRINE_MAX_WEEKLY_REPLACEMENTS = Number(
  process.env.VITRINE_MAX_WEEKLY_REPLACEMENTS ?? Math.max(1, Math.round(VITRINE_CAPACITY * 0.1)),
);
const VITRINE_MIN_OBSERVATION_DAYS = Number(process.env.VITRINE_MIN_OBSERVATION_DAYS ?? 3);

const DISQUALIFYING_DISCARD_REASONS = new Set([
  "sem_preco_confirmado",
  "inelegivel_para_anuncio",
  "preco_nao_confiavel",
  "descricao_inadequada",
  "reprovado_auditoria",
]);

type CurrentRow = Awaited<ReturnType<typeof loadCurrentRows>>[number];

async function loadCurrentRows(vitrineId: string) {
  return prisma.vitrineSelection.findMany({
    where: { vitrineId, status: "ACTIVE" },
    include: { merchantListing: { include: { canonicalProduct: { select: { title: true } } } } },
  });
}

export interface VitrineRenewalDecisionBlocked {
  blocked: true;
  reason: string;
}

export interface VitrineRenewalDecisionReady {
  blocked: false;
  vitrineId: string;
  aiSnapshotId: string;
  aiSnapshotReferenceDate: Date;
  aiSnapshotOverlapRatio: number;
  criticNotes: string | null;
  current: CurrentRow[];
  candidates: VitrineCandidate[];
  allScored: VitrineCandidate[];
  discarded: DiscardedCandidate[];
  funnel: CandidatePoolFunnel;
  activeEvents: { name: string; stage: string; daysUntilPeak: number }[];
  groupReport: GroupFillReport[];
  rotationBudget: number;
  weeklyBudgetRemainingBeforeThisRun: number;
  invalidNow: CurrentRow[];
  outrankedToRetire: CurrentRow[];
  outrankedDeferredByBudget: CurrentRow[];
  outrankedProtected: CurrentRow[];
  toRetire: CurrentRow[];
  newcomers: VitrineCandidate[];
  entrantsAwaitingLink: VitrineCandidate[];
  reserve: VitrineCandidate[];
  /** Deterministic fingerprint of (snapshotId + exact current ACTIVE
   * set) — owner's authorization, item 3: "se os dados mudaram entre
   * prévia e aprovação, interrompa e exija nova revisão." Never a
   * guess: two calls with the identical real inputs always produce the
   * identical fingerprint; any real change to either input changes it. */
  fingerprint: string;
}

export type VitrineRenewalDecision = VitrineRenewalDecisionBlocked | VitrineRenewalDecisionReady;

function computeFingerprint(snapshotId: string, current: CurrentRow[]): string {
  const sortedIds = current.map((c) => c.merchantListingId).sort();
  const hash = createHash("sha256");
  hash.update(snapshotId);
  hash.update("|");
  hash.update(sortedIds.join(","));
  return hash.digest("hex");
}

export async function computeVitrineRenewalDecision(): Promise<VitrineRenewalDecision> {
  const vitrineId = await getLegacyVitrineId();
  const { candidates: deterministicCandidates, allScored, discarded, funnel, activeEvents, groupReport } = await selectVitrineCandidates(VITRINE_CAPACITY);

  const aiSelection = await loadValidatedAiSelection();
  if (!aiSelection.ok) {
    return { blocked: true, reason: aiSelection.reason };
  }
  const { ordered: aiValidatedCandidates, overlapRatio } = intersectWithEligiblePool(aiSelection.orderedListingIds, deterministicCandidates);
  if (overlapRatio < MIN_OVERLAP_RATIO) {
    return {
      blocked: true,
      reason: `Snapshot ${aiSelection.snapshotId} incompatível com o pool real de hoje — só ${Math.round(overlapRatio * 100)}% dos itens recomendados ainda são elegíveis (mínimo ${Math.round(MIN_OVERLAP_RATIO * 100)}%).`,
    };
  }

  const candidates = aiValidatedCandidates.slice(0, VITRINE_CAPACITY);
  const candidateIds = new Set(candidates.map((c) => c.merchantListingId));

  const current = await loadCurrentRows(vitrineId);
  const currentIds = new Set(current.map((c) => c.merchantListingId));

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const recentEntries = await countRecentCommercialSwaps(sevenDaysAgo);
  const weeklyBudgetRemaining = Math.max(0, VITRINE_MAX_WEEKLY_REPLACEMENTS - recentEntries);
  const rotationBudget = Math.min(VITRINE_MAX_DAILY_REPLACEMENTS, weeklyBudgetRemaining);

  const discardedByListingId = new Map(discarded.filter((d) => d.merchantListingId).map((d) => [d.merchantListingId!, d]));
  const droppedFromCandidates = current.filter((c) => !candidateIds.has(c.merchantListingId));

  const invalidNow = droppedFromCandidates.filter((c) => {
    const d = discardedByListingId.get(c.merchantListingId);
    return Boolean(d && DISQUALIFYING_DISCARD_REASONS.has(d.reason));
  });

  const now = Date.now();
  const outrankedProtected: CurrentRow[] = [];
  const outrankedEligible = droppedFromCandidates.filter((c) => {
    if (invalidNow.includes(c)) return false;
    const observedLongEnough = !c.activatedAt || now - c.activatedAt.getTime() >= VITRINE_MIN_OBSERVATION_DAYS * 86_400_000;
    if (!observedLongEnough) outrankedProtected.push(c);
    return observedLongEnough;
  });
  const outrankedEligibleByWeakest = [...outrankedEligible].sort((a, b) => a.score - b.score);
  const outrankedToRetire = outrankedEligibleByWeakest.slice(0, rotationBudget);
  const outrankedDeferredByBudget = outrankedEligibleByWeakest.slice(rotationBudget);

  const toRetire = [...invalidNow, ...outrankedToRetire];

  const headroom = Math.max(0, VITRINE_CAPACITY - current.length);
  const newcomerLimit = current.length === 0 ? candidates.length : toRetire.length + headroom;
  const candidateEntrants = candidates.filter((c) => !currentIds.has(c.merchantListingId));

  const entrantLinks = candidateEntrants.length
    ? await prisma.affiliateLinkRegistry.findMany({
        where: { merchantListingId: { in: candidateEntrants.map((c) => c.merchantListingId) }, status: "ACTIVE" },
        select: { merchantListingId: true },
      })
    : [];
  const entrantsWithActiveLink = new Set(entrantLinks.map((l) => l.merchantListingId));
  const publishableEntrants = candidateEntrants.filter((c) => entrantsWithActiveLink.has(c.merchantListingId));
  const entrantsAwaitingLink = candidateEntrants.filter((c) => !entrantsWithActiveLink.has(c.merchantListingId));

  const newcomers = publishableEntrants.slice(0, newcomerLimit);
  const reserve = candidates.filter((c) => !currentIds.has(c.merchantListingId) && !newcomers.some((n) => n.merchantListingId === c.merchantListingId)).slice(0, 20);

  return {
    blocked: false,
    vitrineId,
    aiSnapshotId: aiSelection.snapshotId,
    aiSnapshotReferenceDate: aiSelection.referenceDate,
    aiSnapshotOverlapRatio: overlapRatio,
    criticNotes: aiSelection.criticNotes,
    current,
    candidates,
    allScored,
    discarded,
    funnel,
    activeEvents,
    groupReport,
    rotationBudget,
    weeklyBudgetRemainingBeforeThisRun: weeklyBudgetRemaining,
    invalidNow,
    outrankedToRetire,
    outrankedDeferredByBudget,
    outrankedProtected,
    toRetire,
    newcomers,
    entrantsAwaitingLink,
    reserve,
    fingerprint: computeFingerprint(aiSelection.snapshotId, current),
  };
}
