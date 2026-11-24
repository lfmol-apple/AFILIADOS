import { prisma } from "@/lib/db";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";
import { selectVitrineCandidates, type VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Four priority tiers for a human to go refresh REAL commission data on,
 * via Mercado Livre's own affiliate panel UI (owner's directive,
 * 2026-11-24: "não precisamos atualizar os mais de 73 mil anúncios
 * indiscriminadamente" — this is deliberately small and targeted, never a
 * mass scan). Tiers 2 and 4 are a judgment call, documented here because
 * there is no 4th real VitrineSelection status to key them off of:
 *
 *  1. ACTIVE      — real VitrineSelection.status, scoped to the legacy
 *                   Vitrine (every existing Vitrine-wide query defaults
 *                   to it the same way, e.g. loadVitrineLinkQueue).
 *  2. "eligible"  — the strongest candidates from allScored (every
 *                   candidate that already passed the real
 *                   evidence-sufficiency gate this cycle, per
 *                   selectVitrineCandidates's own documented contract)
 *                   that are NOT already ACTIVE or RESERVE — i.e. real,
 *                   already-scored candidates that would be the next to
 *                   fill a vacancy once the weekly rotation budget allows
 *                   it. Capped at ELIGIBLE_CAP so this tier stays a short,
 *                   actionable list, not the whole pool.
 *  3. RESERVE     — real VitrineSelection.status, ordered by score desc
 *                   (the owner's own words: "maior potencial comercial").
 *  4. "demand"    — allScored entries, not already in tiers 1-3, whose
 *                   salesEvidenceType is "official_rank" (the strongest
 *                   of the three real evidence types this codebase
 *                   already distinguishes — see vitrine-selection.ts's
 *                   officialRankEvidence/searchRelevanceOnly/
 *                   unknownSalesEvidence) — i.e. real proven demand, not
 *                   just a search-relevance guess. Capped at DEMAND_CAP.
 *
 * Within every tier, sorted by commission-evidence staleness first
 * (unknown/stale first — the ones that most need a fresh read), then by
 * score desc.
 */

const ELIGIBLE_CAP = 10;
const DEMAND_CAP = 8;

export type CommissionPriorityTier = "active" | "eligible" | "reserve" | "demand";

export const TIER_LABEL: Record<CommissionPriorityTier, string> = {
  active: "1. Ativo na Vitrine",
  eligible: "2. Elegível para vaga",
  reserve: "3. Reserva (maior potencial)",
  demand: "4. Novo, com evidência real de demanda",
};

export interface CommissionPriorityRow {
  merchantListingId: string;
  externalId: string;
  title: string;
  tier: CommissionPriorityTier;
  score: number;
  commissionEvidence: {
    type: string;
    rate: number | null;
    estimatedValueBrl: number | null;
    stale: boolean;
  };
}

function sortWithinTier(rows: CommissionPriorityRow[]): CommissionPriorityRow[] {
  return [...rows].sort((a, b) => {
    const aUnknown = a.commissionEvidence.type === "unknown" || a.commissionEvidence.stale;
    const bUnknown = b.commissionEvidence.type === "unknown" || b.commissionEvidence.stale;
    if (aUnknown !== bUnknown) return aUnknown ? -1 : 1; // most-needing-refresh first
    return b.score - a.score;
  });
}

export async function buildCommissionPriorityQueue(vitrineId?: string): Promise<CommissionPriorityRow[]> {
  const scopedVitrineId = vitrineId ?? (await getLegacyVitrineId());

  const [activeSelections, reserveSelections, selectionResult] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { vitrineId: scopedVitrineId, status: "ACTIVE" },
      select: { merchantListingId: true, score: true },
    }),
    prisma.vitrineSelection.findMany({
      where: { vitrineId: scopedVitrineId, status: "RESERVE" },
      select: { merchantListingId: true, score: true },
      orderBy: { score: "desc" },
    }),
    selectVitrineCandidates(30),
  ]);

  const activeIds = new Set(activeSelections.map((s) => s.merchantListingId));
  const reserveIds = new Set(reserveSelections.map((s) => s.merchantListingId));
  const byId = new Map<string, VitrineCandidate>(selectionResult.allScored.map((c) => [c.merchantListingId, c]));

  const allIds = new Set<string>([
    ...activeIds,
    ...reserveIds,
    ...selectionResult.allScored.map((c) => c.merchantListingId),
  ]);
  const listings = allIds.size
    ? await prisma.merchantListing.findMany({
        where: { id: { in: [...allIds] } },
        select: { id: true, externalId: true },
      })
    : [];
  const externalIdById = new Map(listings.map((l) => [l.id, l.externalId]));

  function toRow(merchantListingId: string, tier: CommissionPriorityTier, fallbackScore: number): CommissionPriorityRow | null {
    const candidate = byId.get(merchantListingId);
    const externalId = externalIdById.get(merchantListingId);
    if (!externalId) return null; // real data missing — never fabricate a row
    return {
      merchantListingId,
      externalId,
      title: candidate?.title ?? "(produto sem título no ranking desta rodada)",
      tier,
      score: candidate?.score ?? fallbackScore,
      commissionEvidence: candidate?.commissionEvidence ?? { type: "unknown", rate: null, estimatedValueBrl: null, stale: false },
    };
  }

  const tierActive = sortWithinTier(
    activeSelections
      .map((s) => toRow(s.merchantListingId, "active", s.score))
      .filter((r): r is CommissionPriorityRow => r !== null),
  );

  const tierReserve = sortWithinTier(
    reserveSelections
      .map((s) => toRow(s.merchantListingId, "reserve", s.score))
      .filter((r): r is CommissionPriorityRow => r !== null),
  );

  const notActiveOrReserve = selectionResult.allScored.filter(
    (c) => !activeIds.has(c.merchantListingId) && !reserveIds.has(c.merchantListingId),
  );

  const tierEligible = sortWithinTier(
    [...notActiveOrReserve]
      .sort((a, b) => b.score - a.score)
      .slice(0, ELIGIBLE_CAP)
      .map((c) => toRow(c.merchantListingId, "eligible", c.score))
      .filter((r): r is CommissionPriorityRow => r !== null),
  );
  const eligibleIds = new Set(tierEligible.map((r) => r.merchantListingId));

  const tierDemand = sortWithinTier(
    notActiveOrReserve
      .filter((c) => c.salesEvidenceType === "official_rank" && !eligibleIds.has(c.merchantListingId))
      .sort((a, b) => b.score - a.score)
      .slice(0, DEMAND_CAP)
      .map((c) => toRow(c.merchantListingId, "demand", c.score))
      .filter((r): r is CommissionPriorityRow => r !== null),
  );

  return [...tierActive, ...tierEligible, ...tierReserve, ...tierDemand];
}
