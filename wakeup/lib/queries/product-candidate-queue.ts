import { prisma } from "@/lib/db";

/**
 * Amazon's equivalent of getMlAffiliateQueue (lib/queries/ml-affiliate-
 * queue.ts) — the /admin review surface for docs/COHORT.md's
 * ProductCandidate flow. Never includes PROMOTED (already a real Product,
 * done) or REJECTED (a human decided it, no need to keep reviewing) — only
 * CANDIDATE/APPROVED, the two states still awaiting a human action.
 */
export interface ProductCandidateQueueItem {
  id: string;
  asin: string;
  marketplace: string;
  workingTitle: string;
  categoryHint: string | null;
  slugHint: string | null;
  rationale: string;
  status: "CANDIDATE" | "APPROVED";
  scores: {
    searchPotential: number | null;
    purchaseIntent: number | null;
    ticketSize: number | null;
    commissionEstimate: number | null;
    longTailOpportunity: number | null;
    seoCompetitiveness: number | null;
    valuePropositionFit: number | null;
    clickProbability: number | null;
  };
  createdAt: Date;
}

export async function getProductCandidateQueue(): Promise<ProductCandidateQueueItem[]> {
  const candidates = await prisma.productCandidate.findMany({
    where: { status: { in: ["CANDIDATE", "APPROVED"] } },
    // No score is machine-computed today (internalScore stays null until
    // lib/services/cohort-ranking.ts's weighted average is implemented —
    // see docs/COHORT.md) — order by recency, a human re-sorts mentally
    // using the visible heuristic scores.
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });

  return candidates.map((c) => ({
    id: c.id,
    asin: c.asin,
    marketplace: c.marketplace,
    workingTitle: c.workingTitle,
    categoryHint: c.categoryHint,
    slugHint: c.slugHint,
    rationale: c.rationale,
    status: c.status as "CANDIDATE" | "APPROVED",
    scores: {
      searchPotential: c.searchPotential,
      purchaseIntent: c.purchaseIntent,
      ticketSize: c.ticketSize,
      commissionEstimate: c.commissionEstimate,
      longTailOpportunity: c.longTailOpportunity,
      seoCompetitiveness: c.seoCompetitiveness,
      valuePropositionFit: c.valuePropositionFit,
      clickProbability: c.clickProbability,
    },
    createdAt: c.createdAt,
  }));
}

export async function listActiveCategoryOptions(): Promise<{ slug: string; name: string }[]> {
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });
  return categories;
}
