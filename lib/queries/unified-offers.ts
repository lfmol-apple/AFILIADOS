import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOfertas, type ProductListItem } from "@/lib/queries/products";
import {
  selectCandidateListingIds,
  selectBestOfferIdsPerCanonicalProduct,
  bestByNonCommissionSignal,
} from "@/lib/queries/candidate-pool";
import { classifyOffer } from "@/lib/offers/categories";

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
  /** Optional link to this product's own /produto/[slug] page (Acquisition
   * Engine) — set ONLY when a public slug already exists (never generated
   * here, to keep this vitrine query cheap; see lib/queries/public-
   * product.ts). Purely additive: `href` above is unchanged and still the
   * card's primary CTA target for every existing caller/test. */
  detailHref?: string;
  /** Sidebar category on /ofertas (lib/offers/categories.ts) — derived
   * from the ML domainId or the title, presentation-only. */
  categorySlug?: string;
}

/**
 * Ranks and caps a list of real cards — never pads with fabricated
 * entries. Shared by Home's "O que vale a pena agora" (limit 8, project
 * brief: "se houver 5 boas, mostrar 5") and /ofertas's default grid, so
 * both surfaces apply the exact same real, commission-free ranking rule.
 */
export function selectTopUnifiedOffers(cards: UnifiedOfferCard[], limit: number): UnifiedOfferCard[] {
  return [...cards]
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1))
    .slice(0, limit);
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
    categorySlug: classifyOffer({ title: product.title }),
  };
}

/**
 * How many rows to fetch PER MERCHANT before ranking+slicing to `limit` —
 * never the whole table. Performance hotfix (2026-09-12): production has
 * tens of thousands of MerchantListing rows today and is expected to keep
 * growing; the previous implementation ran an unbounded `findMany` (no
 * `take` at all) and, for Mercado Livre, one additional query PER
 * candidate to find its best offer — together these took the Home page
 * from ~4s to 32.6s in production and would only get worse as the catalog
 * grows. `limit * 5`, capped at `CANDIDATE_POOL_CEILING`, gives the
 * in-memory, commission-free ranking below real room to pick the true top
 * N without ever scanning the full table — same idea as an index-assisted
 * "top-K" query, just expressed as an explicit bounded candidate set
 * because the actual ranking field (nonCommissionSignal) isn't a plain
 * column Postgres can ORDER BY directly. Pool membership itself is also
 * commission-free (candidate-pool.ts's selectCandidateListingIds) — a
 * second fix (2026-09-12) after code review found the pool's own DB-level
 * pre-selection was ordering by MonetizationScore.score, which blends in
 * commission and could silently exclude better-for-the-consumer rows
 * before the ranking below ever saw them.
 */
const CANDIDATE_POOL_MULTIPLIER = 5;
const CANDIDATE_POOL_CEILING = 200;

function candidatePoolSize(limit: number): number {
  return Math.min(limit * CANDIDATE_POOL_MULTIPLIER, CANDIDATE_POOL_CEILING);
}

/**
 * Real Shopee + Mercado Livre offers that are ACTUALLY purchasable right
 * now (AffiliateLinkRegistry.status === "ACTIVE") — this is a vitrine
 * with buying intent, not the Radar (which shows intelligence with or
 * without a link). Reuses the exact "best offer per canonical product"
 * rule already established for Mercado Livre in
 * lib/queries/ml-affiliate-queue.ts / lib/queries/radar-events.ts: the
 * link lives on the catalog-level MerchantListing, and price/condition/
 * seller facts come from its best-scoring real offer sibling — fetched in
 * one batched query below, never one query per candidate.
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
  const poolSize = candidatePoolSize(limit);

  // Pool MEMBERSHIP is decided by a commission-free proxy (demand +
  // offerQuality only — see candidate-pool.ts's doc comment for why this
  // can't just be `orderBy: { monetizationScore: { score: "desc" } }`:
  // that blend includes commission, which must never determine which
  // products even get considered). Hydration below is a plain `id: in`
  // fetch — order doesn't matter there, the real ranking happens in
  // memory via nonCommissionSignal further down.
  const [shopeeIds, mlCatalogIds] = await Promise.all([
    selectCandidateListingIds(
      Prisma.sql`ml.active = true AND m.code = 'SHOPEE' AND al.status = 'ACTIVE'`,
      poolSize,
    ),
    selectCandidateListingIds(
      Prisma.sql`ml.active = true AND m.code = 'MERCADO_LIVRE' AND al.status = 'ACTIVE' AND ml."canonicalProductId" IS NOT NULL`,
      poolSize,
    ),
  ]);

  const [shopeeListings, mlCatalogListings] = await Promise.all([
    prisma.merchantListing.findMany({
      where: { id: { in: shopeeIds } },
      include: {
        monetizationScore: true,
        signals: { orderBy: { observedAt: "desc" }, take: 1 },
      },
    }),
    prisma.merchantListing.findMany({
      where: { id: { in: mlCatalogIds } },
      include: {
        canonicalProduct: { select: { title: true, imageUrl: true, specifications: true, publicSlug: true } },
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
      detailHref: listing.slug ? `/produto/${listing.slug}` : undefined,
      categorySlug: classifyOffer({ title: raw?.productName ?? listing.externalId }),
    };
  });

  // Production incident (2026-09-13): a real Mercado Livre canonical
  // product can have 100-174 real offer siblings (average ~27) — fetching
  // every one of them for every candidate (as the previous version did)
  // pulled thousands of rows per request and hung the Home page. Postgres
  // picks the single best (commission-free) offer PER canonical product
  // directly via DISTINCT ON (candidate-pool.ts) — bounded strictly by
  // the number of canonical products in this pool, never by how many
  // real offers exist for any one of them.
  const canonicalProductIds = mlCatalogListings
    .map((c) => c.canonicalProductId)
    .filter((id): id is string => id !== null);
  const catalogListingIds = mlCatalogListings.map((c) => c.id);
  const bestOfferIds = await selectBestOfferIdsPerCanonicalProduct(canonicalProductIds, catalogListingIds);
  const bestOffers = bestOfferIds.length
    ? await prisma.merchantListing.findMany({
        where: { id: { in: bestOfferIds } },
        include: { monetizationScore: true, signals: { orderBy: { observedAt: "desc" }, take: 1 } },
      })
    : [];
  const bestOfferByCanonicalId = bestByNonCommissionSignal(
    bestOffers,
    (offer) => nonCommissionSignal(offer.monetizationScore?.components) ?? -1,
  );

  const mlCards: UnifiedOfferCard[] = mlCatalogListings.map((catalogListing) => {
    const bestOffer = catalogListing.canonicalProductId
      ? bestOfferByCanonicalId.get(catalogListing.canonicalProductId)
      : undefined;
    const offerRaw = bestOffer?.signals[0]?.raw as
      | { price?: number; original_price?: number | null; discountPercent?: number | null }
      | null;
    return {
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
      detailHref: catalogListing.canonicalProduct?.publicSlug
        ? `/produto/${catalogListing.canonicalProduct.publicSlug}`
        : undefined,
      categorySlug: classifyOffer({
        title: catalogListing.canonicalProduct?.title ?? catalogListing.externalId,
        mlDomainId: (
          catalogListing.canonicalProduct?.specifications as { domainId?: string } | null
        )?.domainId,
      }),
    };
  });

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
 * clause, no index. Performance hotfix (2026-09-12): getUnifiedMerchantOffers()
 * itself is now bounded (candidatePoolSize — never scans the whole table
 * regardless of the `limit` passed here), which also caps what this
 * search can find: with a catalog now in the tens of thousands of rows,
 * a rare term matching only a low-ranked listing outside that candidate
 * window won't surface. Trading completeness for a bounded, non-explosive
 * query is the right call for this hotfix (see this file's git history
 * for the incident); a real indexed text search (e.g. a Postgres
 * trigram/GIN index on a denormalized title column) is the correct
 * follow-up once this limitation actually bites — not attempted now, per
 * the project brief's explicit "não criar infraestrutura prematura de
 * indexação".
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
    // 200 is getUnifiedMerchantOffers's own CANDIDATE_POOL_CEILING — the
    // most it will ever fetch per merchant regardless of the number
    // passed here, so this isn't requesting "everything eligible" anymore
    // (the catalog is far larger than 200 rows today); it's the largest
    // bounded, ranked candidate set that function will return, filtered
    // by text after the fact. See that function's doc comment.
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
