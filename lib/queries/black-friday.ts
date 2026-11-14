import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";
import {
  buildTelegramPostCandidate,
  type TelegramPostCandidate,
} from "@/lib/services/price-drop-digest";

/**
 * Black Friday real-discount check (2026-11-14, owner's call): the one
 * question every shopper asks this time of year — "did they just raise it
 * before the sale?" — answered with our own tracked history, never the
 * seller's own claimed discount (that's UnifiedOfferCard.discountPercent,
 * a different, untrusted signal). Reuses the exact same detectPriceDrop
 * logic the Radar feed and the Telegram channel already use, so this page
 * can never show a drop the rest of the site wouldn't also recognize as
 * real.
 */
const POOL_SIZE = 300;
const BATCH_SIZE = 20;
const MAX_RESULTS = 40;
const TTL_MS = 20 * 60 * 1000;

export interface RealDiscountCard extends TelegramPostCandidate {
  imageUrl: string | null;
  href: string;
}

interface CandidateRow {
  id: string;
}

async function loadPool(): Promise<CandidateRow[]> {
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT ml.id
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    JOIN "AffiliateLinkRegistry" alr
      ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    WHERE ml.active = true
      AND m.code IN ('MERCADO_LIVRE', 'SHOPEE')
    ORDER BY ml."updatedAt" DESC
    LIMIT ${POOL_SIZE}
  `;
}

async function buildCandidates(): Promise<RealDiscountCard[]> {
  const pool = await loadPool();
  const found: RealDiscountCard[] = [];
  for (let i = 0; i < pool.length; i += BATCH_SIZE) {
    const batch = pool.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          const facts = await loadMerchantListingFactsByListingId(row.id);
          if (!facts) return null;
          const candidate = buildTelegramPostCandidate(facts);
          if (!candidate) return null;
          return {
            ...candidate,
            imageUrl: facts.imageUrl,
            href: `/go/${candidate.merchantSlug}/${candidate.externalId}`,
          } satisfies RealDiscountCard;
        } catch (err) {
          logger.warn("black_friday.facts_failed", {
            merchantListingId: row.id,
            message: String(err),
          });
          return null;
        }
      }),
    );
    for (const r of results) if (r) found.push(r);
  }
  // All-time lows first (the strongest proof), then biggest real drop.
  return found
    .sort((a, b) => {
      if (a.isAllTimeLow !== b.isAllTimeLow) return a.isAllTimeLow ? -1 : 1;
      return b.dropPercent - a.dropPercent;
    })
    .slice(0, MAX_RESULTS);
}

const g = globalThis as unknown as {
  __blackFridayState?: {
    cached: { at: number; items: RealDiscountCard[] } | null;
    inflight: Promise<RealDiscountCard[]> | null;
  };
};
const state = (g.__blackFridayState ??= { cached: null, inflight: null });

function refresh(): Promise<RealDiscountCard[]> {
  state.inflight ??= buildCandidates()
    .then((items) => {
      state.cached = { at: Date.now(), items };
      return items;
    })
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
}

/** Stale-while-revalidate, same pattern as getOffersPool. */
export async function getRealDiscountCandidates(
  now: number = Date.now(),
): Promise<RealDiscountCard[]> {
  if (state.cached) {
    if (now - state.cached.at >= TTL_MS) {
      refresh().catch((error) => {
        console.error("black_friday.refresh_failed", error);
      });
    }
    return state.cached.items;
  }
  return refresh();
}
