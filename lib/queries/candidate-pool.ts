import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * DB-level, commission-free proxy for "is this row a plausible top
 * candidate" — sum of MonetizationScore.components.demand.value and
 * .offerQuality.value (0 when a component is UNKNOWN/absent, never
 * treated as a penalty worse than a real low value). Deliberately
 * excludes `commission`, `trend`, and `historicalConversion` from
 * MonetizationScore.score's blend.
 *
 * Why this exists (bias found in code review, 2026-09-12): the
 * performance hotfix's bounded candidate pool (lib/queries/unified-
 * offers.ts, lib/queries/radar-events.ts) originally used `orderBy:
 * { monetizationScore: { score: "desc" } }` to bias a `LIMIT`ed fetch
 * toward plausible winners instead of an arbitrary table slice — but
 * that `score` is a blend that includes `commission`. A high-commission,
 * low-demand/low-quality row could out-rank a genuinely better (for the
 * consumer) low-commission row at the DB level, get selected into the
 * bounded pool, and push the better row out — before the in-memory,
 * commission-free ranking (nonCommissionSignal in unified-offers.ts) ever
 * got a chance to see it. Project rule: comissão nunca decide quais
 * produtos são apresentados ao consumidor como as melhores oportunidades
 * — that has to hold at pool-membership time too, not just at final sort
 * time.
 *
 * Raw SQL, not Prisma's typed `orderBy`, because Prisma has no way to
 * order by a nested JSON path (`components->'demand'->>'value'`) for a
 * Postgres JSONB column — only whole-field/relation ordering. Removing
 * the `LIMIT`/`ORDER BY` entirely (i.e. plain `findMany` with no
 * ordering) was considered and rejected: once the eligible set exceeds
 * the pool ceiling, a DB-order-only slice would freeze the vitrine on
 * whatever physical/insertion order Postgres happens to return, forever
 * — commission-blind, but not actually good for the consumer either.
 */
const NON_COMMISSION_ORDER_FRAGMENT = Prisma.sql`(
    COALESCE((ms.components->'demand'->>'value')::numeric, 0)
    + COALESCE((ms.components->'offerQuality'->>'value')::numeric, 0)
  ) DESC NULLS LAST`;

/**
 * Returns up to `limit` MerchantListing ids matching `whereSql`, ordered
 * by the commission-free proxy above — one bounded query, never a
 * per-candidate round trip. `whereSql` may reference `ml`
 * (MerchantListing), `m` (its Merchant), `al` (its AffiliateLinkRegistry
 * — left-joined, null when absent) and `ms` (its MonetizationScore —
 * left-joined, null when absent).
 *
 * Callers still do a second, typed `findMany({ where: { id: { in: ... } } })`
 * to hydrate the actual rows/includes — the order of *that* fetch doesn't
 * matter, because every caller re-ranks in memory afterward using its own
 * commission-free signal. This function only decides pool *membership*.
 */
export async function selectCandidateListingIds(
  whereSql: Prisma.Sql,
  limit: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT ml.id
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    LEFT JOIN "AffiliateLinkRegistry" al ON al."merchantListingId" = ml.id
    LEFT JOIN "MonetizationScore" ms ON ms."merchantListingId" = ml.id
    WHERE ${whereSql}
    ORDER BY ${NON_COMMISSION_ORDER_FRAGMENT}
    LIMIT ${limit}
  `);
  return rows.map((r) => r.id);
}

/**
 * Groups `offers` by `canonicalProductId`, keeping only the
 * highest-`score`-scoring one per group — `score` must itself be
 * commission-free (callers pass their own nonCommissionSignal-style
 * function), never MonetizationScore.score directly. Replaces relying on
 * "rows pre-sorted by the DB" (which is exactly the bias described
 * above) with an explicit, local comparison — correct regardless of
 * what order the rows arrive in.
 */
export function bestByNonCommissionSignal<
  T extends { canonicalProductId: string | null },
>(offers: T[], score: (offer: T) => number): Map<string, T> {
  const best = new Map<string, T>();
  for (const offer of offers) {
    if (!offer.canonicalProductId) continue;
    const current = best.get(offer.canonicalProductId);
    if (!current || score(offer) > score(current)) {
      best.set(offer.canonicalProductId, offer);
    }
  }
  return best;
}
