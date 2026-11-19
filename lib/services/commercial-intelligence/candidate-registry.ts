import { prisma } from "@/lib/db";

/**
 * Motor Central de Inteligência Comercial — unified candidate registry
 * (owner's authorization, 2026-11-19, "Aprovação condicionada — Motor
 * Central de Inteligência Comercial", section 2). Any source may register
 * a candidate directly, with no approval from any other source — this
 * file is the single write/read surface for prisma.CommercialCandidateRegistry.
 *
 * Each distinct `CandidateSourceType` is one INDEPENDENT source for
 * corroboration purposes (owner's explicit rule: never count two
 * observations from the SAME underlying origin as independent evidence).
 * Keep this list to real, distinct origins — never split one API/page
 * into two strings just to inflate a product's corroboration count.
 */
export type CandidateSourceType =
  | "official_rank" // GET /highlights/{site}/category/{id}
  | "trend_keyword" // GET /trends/{site}
  | "seasonal_keyword" // keyword search for a thematic calendar event
  | "price_drop" // lib/services/radar.ts's detectPriceDrop, confirmed against real price history
  | "sibling_competitiveness" // price-competitiveness.ts, real sibling offers
  | "panel_bestseller" // ML affiliate panel, "mais vendidos" section (ml-revenue-capture-safari.ts)
  | "panel_recommended" // ML affiliate panel, "recomendados" section
  | "panel_extra_commission" // ML affiliate panel, "GANHOS EXTRAS" badge — temporary, never a baseline rate
  | "panel_offered_commission" // ML affiliate panel, regular per-product commission badge
  | "monetization_score_legacy"; // the site's own /ofertas score — informational only, never a gate

export interface RegisterCandidateInput {
  externalId: string;
  marketplace?: "BR" | "US";
  merchantListingId?: string | null;
  sourceType: CandidateSourceType;
  sourceDetail: Record<string, unknown>;
  categoryId?: string | null;
  /** Set when this externalId could not be resolved into a real
   * title/MerchantListing — e.g. "user_product_private_catalog" — so it
   * is recorded, never silently dropped (owner's explicit rule). */
  unresolvedReason?: string | null;
}

/** De-dupes within the same UTC calendar day for the same (externalId,
 * sourceType) pair — a job re-run an hour later shouldn't bloat the table
 * with an identical observation, but a genuinely new day's observation
 * always gets its own row (this table is the audit trail, never
 * collapsed to "latest only"). */
export async function registerCandidate(input: RegisterCandidateInput): Promise<void> {
  const marketplace = input.marketplace ?? "BR";
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const existingToday = await prisma.commercialCandidateRegistry.findFirst({
    where: {
      externalId: input.externalId,
      marketplace,
      sourceType: input.sourceType,
      discoveredAt: { gte: todayStart },
    },
    select: { id: true },
  });
  if (existingToday) return;

  await prisma.commercialCandidateRegistry.create({
    data: {
      externalId: input.externalId,
      marketplace,
      merchantListingId: input.merchantListingId ?? null,
      sourceType: input.sourceType,
      sourceDetail: input.sourceDetail as object,
      categoryId: input.categoryId ?? null,
      unresolvedReason: input.unresolvedReason ?? null,
    },
  });
}

export interface CorroborationResult {
  sources: CandidateSourceType[];
  count: number;
}

/** Counts DISTINCT sourceType values for one externalId — never raw row
 * count, so ten observations from the same source still count as 1. */
export async function computeCorroboration(externalId: string, marketplace: "BR" | "US" = "BR"): Promise<CorroborationResult> {
  const rows = await prisma.commercialCandidateRegistry.findMany({
    where: { externalId, marketplace, unresolvedReason: null },
    select: { sourceType: true },
    distinct: ["sourceType"],
  });
  const sources = rows.map((r) => r.sourceType as CandidateSourceType);
  return { sources, count: sources.length };
}

/** Batched version — avoids N+1 queries when scoring a whole pool. */
export async function computeCorroborationBatch(
  externalIds: readonly string[],
  marketplace: "BR" | "US" = "BR",
): Promise<Map<string, CorroborationResult>> {
  if (externalIds.length === 0) return new Map();
  const rows = await prisma.commercialCandidateRegistry.findMany({
    where: { externalId: { in: [...externalIds] }, marketplace, unresolvedReason: null },
    select: { externalId: true, sourceType: true },
    distinct: ["externalId", "sourceType"],
  });
  const map = new Map<string, Set<CandidateSourceType>>();
  for (const row of rows) {
    const set = map.get(row.externalId) ?? new Set<CandidateSourceType>();
    set.add(row.sourceType as CandidateSourceType);
    map.set(row.externalId, set);
  }
  const result = new Map<string, CorroborationResult>();
  for (const externalId of externalIds) {
    const set = map.get(externalId) ?? new Set<CandidateSourceType>();
    result.set(externalId, { sources: [...set], count: set.size });
  }
  return result;
}

/** The real, resolved merchantListingIds the registry currently knows
 * about within a lookback window — this is the new, unbiased entry point
 * for lib/services/vitrine-selection.ts's buildCommercialCandidatePool,
 * replacing the old "top 300 by monetizationScore" single gate. Ordered
 * by corroboration count (seen by more independent sources first), never
 * by monetizationScore — a transparent, inspectable processing order, not
 * an elimination criterion (owner's explicit rule, section 2 of the
 * original architecture approval: "evitando... um gargalo arbitrário que
 * elimine oportunidades relevantes antes da avaliação"). Pagination via
 * cursor, not a single flat cap. */
export async function listRegisteredMerchantListingIds(options: {
  lookbackDays?: number;
  take?: number;
  skip?: number;
}): Promise<{ merchantListingIds: string[]; nextSkip: number | null }> {
  const lookbackDays = options.lookbackDays ?? 60;
  const take = options.take ?? 500;
  const skip = options.skip ?? 0;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  // Owner's correction, 2026-11-19: found live the exact same bias this
  // whole registry exists to eliminate, reintroduced by this function's
  // OWN pagination — `orderBy: merchantListingId asc` sorted
  // alphabetically, but cuid()s are lexically time-ordered, so it was
  // really "oldest-created listing first." Of 70 real trend_keyword
  // candidates (today's freshest finds), ZERO made the top-1000 alphabetic
  // cut. Fixed: order by each listing's own MOST RECENT discovery
  // observation (any source) first — `distinct` + this `orderBy` makes
  // Prisma pick each id's freshest row, so a listing any source just
  // confirmed today always outranks one no source has touched in weeks,
  // regardless of how old the listing itself is.
  const rows = await prisma.commercialCandidateRegistry.findMany({
    where: { merchantListingId: { not: null }, discoveredAt: { gte: since } },
    select: { merchantListingId: true },
    distinct: ["merchantListingId"],
    orderBy: { discoveredAt: "desc" },
    take,
    skip,
  });

  const nextSkip = rows.length === take ? skip + take : null;
  return {
    merchantListingIds: rows.map((r) => r.merchantListingId!).filter(Boolean),
    nextSkip,
  };
}

export interface CoverageStat {
  categoryId: string | null;
  sourceType: CandidateSourceType;
  resolved: number;
  unresolved: number;
}

/** Per-category, per-source resolved vs unresolved counts (owner's
 * explicit rule, section 5: "apresente indicadores de cobertura por
 * categoria e fonte" — never extrapolate a small sample to the whole
 * catalog; this reports the REAL counts observed so far, nothing more). */
export async function coverageStats(lookbackDays = 30): Promise<CoverageStat[]> {
  const since = new Date(Date.now() - lookbackDays * 86_400_000);
  const rows = await prisma.commercialCandidateRegistry.groupBy({
    by: ["categoryId", "sourceType", "unresolvedReason"],
    where: { discoveredAt: { gte: since } },
    _count: { _all: true },
  });
  const byKey = new Map<string, CoverageStat>();
  for (const row of rows) {
    const key = `${row.categoryId ?? "null"}::${row.sourceType}`;
    const existing = byKey.get(key) ?? {
      categoryId: row.categoryId,
      sourceType: row.sourceType as CandidateSourceType,
      resolved: 0,
      unresolved: 0,
    };
    if (row.unresolvedReason) existing.unresolved += row._count._all;
    else existing.resolved += row._count._all;
    byKey.set(key, existing);
  }
  return [...byKey.values()];
}

export interface UnresolvedCandidate {
  externalId: string;
  sourceType: CandidateSourceType;
  categoryId: string | null;
  unresolvedReason: string;
  discoveredAt: Date;
}

/** Every externalId no source could resolve into a title — surfaced, not
 * discarded (owner's explicit rule, section 5). */
export async function listUnresolved(limit = 200): Promise<UnresolvedCandidate[]> {
  const rows = await prisma.commercialCandidateRegistry.findMany({
    where: { unresolvedReason: { not: null } },
    orderBy: { discoveredAt: "desc" },
    take: limit,
    select: { externalId: true, sourceType: true, categoryId: true, unresolvedReason: true, discoveredAt: true },
  });
  return rows.map((r) => ({ ...r, sourceType: r.sourceType as CandidateSourceType, unresolvedReason: r.unresolvedReason! }));
}
