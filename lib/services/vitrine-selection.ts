import { prisma } from "@/lib/db";

/**
 * Score v1 — reuses MonetizationScore exactly as the real ML/Shopee jobs
 * already compute it (lib/services/monetization-score.ts), no new scoring
 * model yet. A real weighted/seasonal score (lib/services/vitrine-score.ts)
 * is Fase 2 work, once the commercial calendar and trend-rollup jobs exist
 * — see docs for this module's plan. Never invent a signal that isn't
 * already in the database.
 */

export type VitrineGroupType = "sazonal" | "recorrente" | "emergente";

/** No seasonal-calendar engine exists yet (Fase 2) — "sazonal" is always 0
 * for now, documented here rather than silently dropped, so the admin panel
 * can say so instead of implying it's working. */
const GROUP_TARGETS: Record<VitrineGroupType, number> = {
  sazonal: 0,
  recorrente: 18,
  emergente: 12,
};

interface EligibleListing {
  merchantListingId: string;
  score: number;
  group: VitrineGroupType;
  reason: string;
}

/**
 * Classifies a listing by which discovery signal produced it — the closest
 * thing to "recorrente vs emergente" available without a seasonal engine.
 * mercado_livre_highlights (bestseller rank) = a listing that's already
 * selling well = recorrente. mercado_livre_trends (search-rank only, no
 * confirmed sales) = emergente (a newer, less-proven signal).
 */
function classifyGroup(latestSignalSource: string | null): {
  group: VitrineGroupType;
  reason: string;
} {
  if (latestSignalSource === "mercado_livre_highlights") {
    return {
      group: "recorrente",
      reason: "no ranking de mais vendidos da categoria no Mercado Livre",
    };
  }
  if (latestSignalSource === "mercado_livre_trends") {
    return {
      group: "emergente",
      reason: "em alta nas pesquisas do Mercado Livre, venda ainda não confirmada",
    };
  }
  return {
    group: "recorrente",
    reason: "pontuação de monetização calculada pelo ciclo de descoberta",
  };
}

/**
 * Selects up to `limit` Mercado Livre listings for the Vitrine Inteligente,
 * balancing recorrente/emergente by MonetizationScore — reuses the score
 * the real discovery jobs (ml-demand.ts, ml-enrichment.ts) already
 * calculated, never recomputes or invents anything. Only Mercado Livre
 * listings: the Vitrine Inteligente's whole purpose (per the project brief)
 * is ML-affiliate traffic, same as the existing public /ofertas scope for
 * ML, so this reuses that same universe rather than inventing a new one.
 */
export async function selectVitrineCandidates(
  limit = 30,
): Promise<EligibleListing[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      availability: { not: "OUT_OF_STOCK" },
      merchant: { code: "MERCADO_LIVRE" },
      monetizationScore: { score: { not: null } },
      canonicalProduct: { isNot: null },
    },
    select: {
      id: true,
      monetizationScore: { select: { score: true } },
      signals: {
        orderBy: { observedAt: "desc" },
        take: 1,
        select: { source: true },
      },
    },
    orderBy: { monetizationScore: { score: "desc" } },
    take: limit * 4, // oversample so group quotas have enough to choose from
  });

  const byGroup: Record<VitrineGroupType, EligibleListing[]> = {
    sazonal: [],
    recorrente: [],
    emergente: [],
  };

  for (const listing of listings) {
    const score = listing.monetizationScore?.score;
    if (score == null) continue;
    const { group, reason } = classifyGroup(listing.signals[0]?.source ?? null);
    byGroup[group].push({ merchantListingId: listing.id, score, group, reason });
  }

  const selected: EligibleListing[] = [];
  for (const group of Object.keys(GROUP_TARGETS) as VitrineGroupType[]) {
    selected.push(...byGroup[group].slice(0, GROUP_TARGETS[group]));
  }

  // Fill any remaining slots (quotas not fully met) with the next
  // best-scoring candidates overall, regardless of group.
  if (selected.length < limit) {
    const chosenIds = new Set(selected.map((s) => s.merchantListingId));
    const leftovers = Object.values(byGroup)
      .flat()
      .filter((c) => !chosenIds.has(c.merchantListingId))
      .sort((a, b) => b.score - a.score);
    selected.push(...leftovers.slice(0, limit - selected.length));
  }

  return selected.sort((a, b) => b.score - a.score).slice(0, limit);
}
