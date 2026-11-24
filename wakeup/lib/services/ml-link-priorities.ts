import { classifyOffer } from "@/lib/offers/categories";
import { estimatedCommissionRate } from "@/lib/config/ml-commission-tiers";

export interface LinkCandidate {
  externalId: string;
  title: string;
  mlDomainId: string | null;
  bestsellerRank: number;
  price: number | null;
}

export interface RankedLinkCandidate extends LinkCandidate {
  categorySlug: string;
  commissionRate: number | null;
  /** demand (1 for rank 1, ~0 for rank 50) x commission rate. */
  priority: number;
}

/**
 * Orders products the owner has NOT linked yet by real demand (ML bestseller
 * rank) x observed category commission, best first. Categories with no
 * observed rate sort after every category with one, ordered by demand only —
 * never guessed.
 */
export function rankLinkCandidates(
  candidates: LinkCandidate[],
): RankedLinkCandidate[] {
  return candidates
    .map((c) => {
      const categorySlug = classifyOffer({
        title: c.title,
        mlDomainId: c.mlDomainId,
      });
      const commissionRate = estimatedCommissionRate(categorySlug);
      const demand = Math.max(0, (51 - c.bestsellerRank) / 50);
      return {
        ...c,
        categorySlug,
        commissionRate,
        priority: demand * (commissionRate ?? 0),
      };
    })
    .sort((a, b) => {
      if ((a.commissionRate === null) !== (b.commissionRate === null))
        return a.commissionRate === null ? 1 : -1;
      if (a.commissionRate === null) return a.bestsellerRank - b.bestsellerRank;
      return b.priority - a.priority || a.bestsellerRank - b.bestsellerRank;
    });
}
