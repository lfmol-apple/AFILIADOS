import { prisma } from "@/lib/db";
import { getOfertas, type ProductListItem } from "@/lib/queries/products";

/**
 * Cross-merchant view-model for the public "vitrine" surfaces (Home's
 * "Melhores oportunidades agora", `/ofertas`'s default grid) — project
 * brief, 2026-09-08. A presentation shape ONLY: never a new commercial
 * model, never touches OpportunityScore/MonetizationScore computation.
 * Every field is nullable because the underlying merchants genuinely
 * don't all provide the same facts (project brief: "NUNCA inventar
 * preço, desconto, rating, vendas ou comissão" — a null field here means
 * exactly that, no source, not a zero).
 */
export interface UnifiedOfferCard {
  id: string;
  merchant: "AMAZON" | "SHOPEE" | "MERCADO_LIVRE";
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  referencePrice: number | null;
  discountPercent: number | null;
  rating: number | null;
  soldQuantity: number | null;
  /** Real, commission-free signal — never MonetizationScore's blended
   * score (that mixes in commission, which must never drive what a
   * consumer sees ranked higher — project brief section "REGRA DE
   * MONETIZAÇÃO"). For Amazon this IS OpportunityScore (already
   * consumer-only by design). For Shopee/ML it's the average of just the
   * `demand` and `offerQuality` components already stored in
   * MonetizationScore.components — real, already-computed values, with
   * `commission` explicitly excluded. See nonCommissionSignal() below. */
  opportunitySignal: number | null;
  /** Only ever set for a genuinely purchasable item — Amazon's own
   * `/produto/[slug]` for Amazon (existing, unchanged), the internal
   * `/go/[merchant]/[externalId]` redirect for Shopee/ML, and ONLY when
   * a real AffiliateLinkRegistry row is ACTIVE. Every caller of this
   * module already filters to ACTIVE-linked rows before mapping, so this
   * is non-null on every card this file returns — kept nullable in the
   * type as a structural reminder for any future caller that stops
   * pre-filtering. */
  href: string | null;
}

function nonCommissionSignal(components: unknown): number | null {
  const c = components as
    | { demand?: { value: number | null }; offerQuality?: { value: number | null } }
    | null
    | undefined;
  const values = [c?.demand?.value, c?.offerQuality?.value].filter(
    (v): v is number => typeof v === "number",
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function mapAmazonProductToUnifiedCard(product: ProductListItem): UnifiedOfferCard {
  const offer = product.offers[0];
  return {
    id: product.id,
    merchant: "AMAZON",
    title: product.title,
    imageUrl: product.imageUrl,
    currentPrice: offer ? Number(offer.price) : null,
    referencePrice:
      offer?.originalPrice && Number(offer.originalPrice) > Number(offer.price)
        ? Number(offer.originalPrice)
        : null,
    discountPercent: offer?.discountPercentage ?? null,
    rating: null, // not modeled on Product/Offer today — never guessed.
    soldQuantity: null,
    opportunitySignal: product.opportunityScore?.score ?? null,
    href: `/produto/${product.slug}`,
  };
}

/**
 * Real Shopee + Mercado Livre offers that are ACTUALLY purchasable right
 * now (AffiliateLinkRegistry.status === "ACTIVE") — this is a vitrine
 * with buying intent, not the Radar (which shows intelligence with or
 * without a link). Reuses the exact "best offer per canonical product"
 * rule already established for Mercado Livre in
 * lib/queries/ml-affiliate-queue.ts / lib/queries/radar-events.ts: the
 * link lives on the catalog-level MerchantListing, and price/condition/
 * seller facts come from its best-scoring real offer sibling.
 */
export async function getUnifiedMerchantOffers(
  limit: number = 24,
  /** Extra query params merged into every card's href, on top of the
   * defaults (pageType=ofertas&pageSlug=ofertas&source=unified_offers) —
   * lets a caller (e.g. searchUnifiedOffers below) tag clicks with
   * `source=search&query=...` without duplicating the href-building or
   * eligibility logic. */
  linkParams?: Record<string, string>,
): Promise<UnifiedOfferCard[]> {
  const [shopeeListings, mlCatalogListings] = await Promise.all([
    prisma.merchantListing.findMany({
      where: {
        active: true,
        merchant: { code: "SHOPEE" },
        affiliateLink: { is: { status: "ACTIVE" } },
      },
      include: {
        monetizationScore: true,
        signals: { orderBy: { observedAt: "desc" }, take: 1 },
      },
    }),
    prisma.merchantListing.findMany({
      where: {
        active: true,
        merchant: { code: "MERCADO_LIVRE" },
        affiliateLink: { is: { status: "ACTIVE" } },
        canonicalProduct: { isNot: null },
      },
      include: {
        canonicalProduct: { select: { title: true, imageUrl: true, specifications: true } },
        monetizationScore: true,
      },
    }),
  ]);

  const params = new URLSearchParams({
    pageType: "ofertas",
    pageSlug: "ofertas",
    source: "unified_offers",
    ...linkParams,
  }).toString();

  const shopeeCards: UnifiedOfferCard[] = shopeeListings.map((listing) => {
    const raw = listing.signals[0]?.raw as
      | { productName?: string; imageUrl?: string; priceMin?: string; priceDiscountRate?: number; rating?: number; sales?: number }
      | null;
    const price = raw?.priceMin ? Number(raw.priceMin) : null;
    return {
      id: listing.id,
      merchant: "SHOPEE",
      title: raw?.productName ?? listing.externalId,
      imageUrl: raw?.imageUrl ?? null,
      currentPrice: price !== null && !Number.isNaN(price) ? price : null,
      referencePrice: null, // Shopee's API gives a discount rate, not a literal original price.
      discountPercent: typeof raw?.priceDiscountRate === "number" ? raw.priceDiscountRate / 100 : null,
      rating: raw?.rating ?? null,
      soldQuantity: raw?.sales ?? null,
      opportunitySignal: nonCommissionSignal(listing.monetizationScore?.components),
      href: `/go/shopee/${encodeURIComponent(listing.externalId)}?${params}`,
    };
  });

  const mlCards: UnifiedOfferCard[] = [];
  for (const catalogListing of mlCatalogListings) {
    const bestOffer = await prisma.merchantListing.findFirst({
      where: { canonicalProductId: catalogListing.canonicalProductId, id: { not: catalogListing.id } },
      include: { monetizationScore: true, signals: { orderBy: { observedAt: "desc" }, take: 1 } },
      orderBy: { monetizationScore: { score: "desc" } },
    });
    const offerRaw = bestOffer?.signals[0]?.raw as
      | { price?: number; original_price?: number | null; discountPercent?: number | null }
      | null;
    mlCards.push({
      id: catalogListing.id,
      merchant: "MERCADO_LIVRE",
      title: catalogListing.canonicalProduct?.title ?? catalogListing.externalId,
      imageUrl: catalogListing.canonicalProduct?.imageUrl ?? null,
      currentPrice: offerRaw?.price ?? null,
      referencePrice: offerRaw?.original_price ?? null,
      discountPercent: offerRaw?.discountPercent ?? null,
      rating: null, // UNKNOWN for Mercado Livre — see docs/MONETIZATION_SCORE.md.
      soldQuantity: null, // UNKNOWN for Mercado Livre.
      opportunitySignal: nonCommissionSignal(
        (bestOffer ?? catalogListing).monetizationScore?.components,
      ),
      href: `/go/mercado-livre/${encodeURIComponent(catalogListing.externalId)}?${params}`,
    });
  }

  return [...shopeeCards, ...mlCards]
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1))
    .slice(0, limit);
}

export interface SearchUnifiedOffersResult {
  items: UnifiedOfferCard[];
  page: number;
  totalPages: number;
}

/**
 * Busca Cross-Merchant V1 — 2026-09-08. The one real bug this fixes:
 * `/ofertas?q=...` only ever called getOfertas() (Amazon's own Product
 * table), so Shopee/Mercado Livre never participated in a search, no
 * matter how much real data existed for them. This function is
 * deliberately NOT a new engine — it queries our own already-observed
 * base only (no ML/Shopee/Amazon API call, ever, during a request) and
 * reuses, unchanged: getOfertas() for Amazon (same `contains`
 * text match it already had), getUnifiedMerchantOffers() for the
 * Shopee/ML eligibility rule (active, AffiliateLinkRegistry ACTIVE —
 * same fail-closed rule /ofertas's default view already enforces) and
 * the same UnifiedOfferCard shape/ranking as everywhere else.
 *
 * NOT grouped by product (project brief, explicit): ProductMatcher has
 * never run against real data (0 ProductMatchEvidence rows, confirmed
 * live in both local and production databases) — showing "Galaxy A17 —
 * Mercado Livre" and a second "Galaxy A17 — Mercado Livre" as two
 * separate results is the honest V1, never a guessed merge.
 *
 * Text matching for Mercado Livre/Shopee: a plain, case-insensitive
 * substring check on the title already computed by
 * getUnifiedMerchantOffers() — no new Prisma query, no JSON/ILIKE
 * clause, no index. This is intentionally the smallest thing that
 * works at today's real volume (12 Shopee + a couple hundred ML
 * listings, fetched once, filtered in memory). If that volume grows by
 * an order of magnitude, this in-memory filter should be replaced by a
 * real indexed text search (e.g. a Postgres trigram/GIN index on a
 * denormalized title column) — not attempted now, per the project
 * brief's explicit "não criar infraestrutura prematura de indexação".
 *
 * Only page 1 includes Shopee/ML results (same precedent this codebase
 * already used for the old ShopeeShowcase-on-page-1-only pattern) —
 * Amazon's own real pagination (page 2+) is untouched and unaffected.
 */
export async function searchUnifiedOffers(input: {
  query: string;
  page?: number;
  pageSize?: number;
}): Promise<SearchUnifiedOffersResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 24;

  const amazonResult = await getOfertas({ query: input.query, page, pageSize });
  const amazonCards = amazonResult.items.map(mapAmazonProductToUnifiedCard);

  let merchantCards: UnifiedOfferCard[] = [];
  if (page === 1) {
    // 200: comfortably above today's real total (12 Shopee + ~200 ML
    // listings, most without an ACTIVE link and therefore already
    // excluded by getUnifiedMerchantOffers itself) — not a hardcoded
    // "enough for now" guess so much as "everything eligible, full
    // stop", filtered by text after the fact.
    const eligible = await getUnifiedMerchantOffers(200, {
      source: "search",
      campaign: input.query,
    });
    const needle = input.query.trim().toLowerCase();
    merchantCards = needle
      ? eligible.filter((card) => card.title.toLowerCase().includes(needle))
      : [];
  }

  const items = [...amazonCards, ...merchantCards].sort(
    (a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1),
  );

  return { items, page: amazonResult.page, totalPages: amazonResult.totalPages };
}
