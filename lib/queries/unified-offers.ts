import { prisma } from "@/lib/db";
import type { ProductListItem } from "@/lib/queries/products";

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
export async function getUnifiedMerchantOffers(limit: number = 24): Promise<UnifiedOfferCard[]> {
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
      href: `/go/shopee/${encodeURIComponent(listing.externalId)}?pageType=ofertas&pageSlug=ofertas&source=unified_offers`,
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
      href: `/go/mercado-livre/${encodeURIComponent(catalogListing.externalId)}?pageType=ofertas&pageSlug=ofertas&source=unified_offers`,
    });
  }

  return [...shopeeCards, ...mlCards]
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1))
    .slice(0, limit);
}
