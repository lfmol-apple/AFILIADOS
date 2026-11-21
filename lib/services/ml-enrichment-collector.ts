import { prisma } from "@/lib/db";
import {
  findAttribute,
  type MercadoLivreProvider,
  type MercadoLivreSellerReputation,
} from "@/lib/providers/mercado-livre-provider";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import {
  offerQualityScore,
  getDiscountPercent,
} from "@/lib/services/ml-offer-quality";
import { getHistoricalClickSignal } from "@/lib/services/historical-click-signal";
import { mapDomainIdToCategorySlug } from "@/lib/services/commercial-intelligence/ml-domain-category-map";
import { evaluateCanonicalEquivalence, extractVariantAttributes } from "@/lib/services/canonical-product-equivalence";
import type { MonetizationScoreInput } from "@/types/monetization";

/** Real root cause, 2026-11-20 ("Etapa 4 — Categorias e Sazonalidade"):
 * `detail.domain_id` was already captured into `specifications.domainId`
 * on every product, but nothing ever resolved it to our own real
 * `Category.id` — so `categoryId` stayed null for 100% of products,
 * site-wide. Cached (our own Category table is a fixed, rarely-changing
 * 17 rows — a 5-minute cache avoids a query per enriched listing
 * without ever risking a stale slug for long). */
let categorySlugToIdCache: { at: number; value: Map<string, string> } | null = null;
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveCategoryId(domainId: string | null | undefined): Promise<string | null> {
  if (!categorySlugToIdCache || Date.now() - categorySlugToIdCache.at > CATEGORY_CACHE_TTL_MS) {
    const rows = await prisma.category.findMany({ select: { id: true, slug: true } });
    categorySlugToIdCache = { at: Date.now(), value: new Map(rows.map((r) => [r.slug, r.id])) };
  }
  const slug = mapDomainIdToCategorySlug(domainId);
  return categorySlugToIdCache.value.get(slug) ?? null;
}

/**
 * Shared per-catalog-product enrichment logic, extracted from
 * scripts/ml-enrich-offers.ts (Automação Operacional V1, 2026-09-08) so
 * the manual script and the automated job (jobs/ml-enrichment.ts) run the
 * exact same real-API-calls-and-persistence code. Behavior unchanged from
 * the original script — see that file's own doc comment for the full,
 * real investigation behind `permalinkVerified: false` and which
 * endpoints are/aren't called.
 */
export interface EnrichCatalogListingResult {
  offersProcessed: number;
  offersCreated: number;
  offersUpdated: number;
}

type CatalogListingLike = {
  id: string;
  externalId: string;
  canonicalProductId: string | null;
};

export async function enrichCatalogListing(
  provider: MercadoLivreProvider,
  merchantId: string,
  catalogListing: CatalogListingLike,
  catalogDemandScore: number,
  sellerCache: Map<number, MercadoLivreSellerReputation | null>,
): Promise<EnrichCatalogListingResult | null> {
  const catalogProductId = catalogListing.externalId;
  const detail = await provider.getCatalogProductDetail(catalogProductId);
  if (!detail) return null; // 404 — not an error, just nothing to enrich yet.

  // General Market Scanner V1 (2026-09-08): MANUFACTURER and
  // ALPHANUMERIC_MODELS (real ML attributes, confirmed live — 77% and
  // 80% coverage respectively across the 35 real catalog products
  // checked) were already inside `detail.attributes` every cycle but
  // never extracted. Neither is a GTIN and neither confirms a
  // cross-merchant match by itself (Shopee exposes nothing comparable) —
  // stored in `specifications` (already free-form Json, no migration)
  // purely to strengthen intra-ML identity confidence for a future phase.
  // Never used by ProductMatcher's GTIN/MANUFACTURER_ID tiers as-is —
  // that would require deciding these are safe cross-listing identifiers
  // first, which this phase does not do.
  const manufacturer = findAttribute(detail, "MANUFACTURER") ?? null;
  const alphanumericModel =
    findAttribute(detail, "ALPHANUMERIC_MODELS") ??
    findAttribute(detail, "ALPHANUMERIC_MODEL") ??
    null;
  const brand = findAttribute(detail, "BRAND") ?? null;
  const model = findAttribute(detail, "MODEL") ?? null;
  // Owner's directive, 2026-11-21 ("Produtos Philco — aprovado com
  // restrições"): real variant-defining attributes (voltage, color,
  // capacity, kit composition), captured so a future equivalence check
  // never has to guess — see canonical-product-equivalence.ts's doc
  // comment for the real, live-confirmed Philco 127V/220V case this
  // exists for.
  const variantAttributes = extractVariantAttributes(detail.attributes);

  const categoryId = await resolveCategoryId(detail.domain_id);

  const specifications = {
    catalogProductId,
    domainId: detail.domain_id ?? null,
    familyName: detail.family_name ?? null,
    line: findAttribute(detail, "LINE") ?? null,
    manufacturer,
    alphanumericModel,
    variantAttributes,
  };

  const existingBySlug = await prisma.canonicalProduct.findUnique({
    where: { slug: `ml-catalog-${catalogProductId}` },
    select: { id: true },
  });

  let canonical: { id: string };
  if (existingBySlug) {
    // Unchanged behavior: this exact catalogProductId already has its
    // own canonical — just refresh it, same as before this change.
    canonical = await prisma.canonicalProduct.update({
      where: { id: existingBySlug.id },
      data: { title: detail.name, brand, model, gtin: findAttribute(detail, "GTIN") ?? null, imageUrl: detail.pictures?.[0]?.url ?? null, categoryId, specifications },
      select: { id: true },
    });
  } else {
    // Owner's directive, 2026-11-21: before creating a brand-new
    // CanonicalProduct for a catalogProductId never seen before, check
    // whether an EXISTING canonical with the same brand+model is
    // actually the SAME real product under a different official ML
    // catalogProductId (the real root cause of the 164-row Philco
    // split — ML itself assigned two catalogProductIds to what looked
    // like one product). Reuse only on CONFIRMED equivalence (real
    // matching variant attribute, e.g. same VOLTAGE+COLOR) — brand+model
    // alone is explicitly never sufficient (owner's rule: "não faça
    // fusão automática... apenas por marca e modelo").
    const reuseCandidates =
      brand && model
        ? await prisma.canonicalProduct.findMany({
            where: { brand: { equals: brand, mode: "insensitive" }, model: { equals: model, mode: "insensitive" } },
            select: { id: true, brand: true, model: true, specifications: true },
          })
        : [];

    let reuseTargetId: string | null = null;
    const nonEquivalentFindings: { candidateId: string; verdict: ReturnType<typeof evaluateCanonicalEquivalence> }[] = [];
    for (const candidate of reuseCandidates) {
      const candidateSpecs = candidate.specifications as { variantAttributes?: Record<string, string> } | null;
      const verdict = evaluateCanonicalEquivalence(
        { brand, model, variantAttributes },
        { brand: candidate.brand, model: candidate.model, variantAttributes: candidateSpecs?.variantAttributes ?? {} },
      );
      if (verdict.decision === "equivalent" && !reuseTargetId) {
        reuseTargetId = candidate.id;
      } else if (verdict.decision !== "equivalent") {
        nonEquivalentFindings.push({ candidateId: candidate.id, verdict });
      }
    }

    if (reuseTargetId) {
      const target = await prisma.canonicalProduct.findUniqueOrThrow({ where: { id: reuseTargetId } });
      const existingSpecs = (target.specifications as Record<string, unknown> | null) ?? {};
      const alsoKnownAs = new Set([
        ...((existingSpecs.alsoKnownAsCatalogProductIds as string[] | undefined) ?? []),
        catalogProductId,
      ]);
      canonical = await prisma.canonicalProduct.update({
        where: { id: reuseTargetId },
        data: { specifications: { ...existingSpecs, alsoKnownAsCatalogProductIds: [...alsoKnownAs] } },
        select: { id: true },
      });
    } else {
      // Genuinely never seen this real product before (or every
      // same-brand+model candidate was confirmed DISTINCT, or there's
      // not enough shared attribute data to decide) — record every
      // unresolved/distinct finding for human review, then create a new
      // canonical as before this change. Never deletes or merges
      // existing rows — purely additive logging + the normal create.
      for (const finding of nonEquivalentFindings) {
        await prisma.canonicalProductMergeReview.upsert({
          where: {
            existingCanonicalProductId_newCatalogProductId: {
              existingCanonicalProductId: finding.candidateId,
              newCatalogProductId: catalogProductId,
            },
          },
          create: {
            existingCanonicalProductId: finding.candidateId,
            newCatalogProductId: catalogProductId,
            brand,
            model,
            verdict: finding.verdict.decision === "distinct" ? "confirmed_distinct_variant" : "ambiguous_no_attribute_overlap",
            matchedAttributes: finding.verdict.matchedAttributes,
            conflictingAttributes: finding.verdict.conflictingAttributes,
          },
          update: {
            verdict: finding.verdict.decision === "distinct" ? "confirmed_distinct_variant" : "ambiguous_no_attribute_overlap",
            matchedAttributes: finding.verdict.matchedAttributes,
            conflictingAttributes: finding.verdict.conflictingAttributes,
          },
        });
      }
      canonical = await prisma.canonicalProduct.create({
        data: {
          slug: `ml-catalog-${catalogProductId}`,
          title: detail.name,
          brand,
          model,
          gtin: findAttribute(detail, "GTIN") ?? null,
          imageUrl: detail.pictures?.[0]?.url ?? null,
          categoryId,
          specifications,
        },
        select: { id: true },
      });
    }
  }

  if (catalogListing.canonicalProductId !== canonical.id) {
    await prisma.merchantListing.update({
      where: { id: catalogListing.id },
      data: { canonicalProductId: canonical.id },
    });
  }

  const items = await provider.getCatalogProductItems(catalogProductId);

  // One reputation call per distinct seller, all at once: they were awaited one
  // by one inside the loop below (about 10 round trips per product).
  const unseen = [...new Set(items.map((item) => item.seller_id))].filter(
    (id) => !sellerCache.has(id),
  );
  await Promise.all(
    unseen.map(async (id) => {
      sellerCache.set(id, await provider.getSellerReputation(id));
    }),
  );

  let offersCreated = 0;
  let offersUpdated = 0;

  for (const item of items) {
    if (!sellerCache.has(item.seller_id)) {
      sellerCache.set(
        item.seller_id,
        await provider.getSellerReputation(item.seller_id),
      );
    }
    const seller = sellerCache.get(item.seller_id) ?? null;

    // Not a confirmed permalink — see scripts/ml-enrich-offers.ts's
    // file-level doc comment for the full investigation. Item-specific,
    // never presented as verified without permalinkVerified: false too.
    const bestEffortUrl = `https://produto.mercadolivre.com.br/${item.item_id}`;

    const existing = await prisma.merchantListing.findUnique({
      where: {
        merchantId_marketplace_externalId: {
          merchantId,
          marketplace: "BR",
          externalId: item.item_id,
        },
      },
      select: { id: true },
    });

    const offerListing = await prisma.merchantListing.upsert({
      where: {
        merchantId_marketplace_externalId: {
          merchantId,
          marketplace: "BR",
          externalId: item.item_id,
        },
      },
      create: {
        merchantId,
        externalId: item.item_id,
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: bestEffortUrl,
        source: "MANUAL_VERIFIED",
        canonicalProductId: canonical.id,
      },
      update: { canonicalProductId: canonical.id, productUrl: bestEffortUrl },
    });
    if (existing) offersUpdated++;
    else offersCreated++;

    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: offerListing.id,
        source: "mercado_livre_catalog_items",
        raw: {
          ...item,
          discountPercent: getDiscountPercent(item),
          seller,
          permalinkVerified: false,
          discoverySource: "ML_ENRICHMENT",
        } as unknown as object,
      },
    });

    const input: MonetizationScoreInput = {
      demandSignal: {
        value: catalogDemandScore,
        quality: "DERIVED_FROM_OBSERVED",
      },
      commissionSignal: null,
      trendSignal: null,
      historicalConversionSignal: await getHistoricalClickSignal(
        offerListing.id,
      ),
      offerQualitySignal: {
        value: offerQualityScore(item, seller),
        quality: "OBSERVED",
      },
    };
    const score = calculateMonetizationScore(input);
    await prisma.monetizationScore.upsert({
      where: { merchantListingId: offerListing.id },
      create: {
        merchantListingId: offerListing.id,
        score: score.score,
        confidence: score.confidence,
        components: score.components as unknown as object,
        reasons: score.reasons,
        missingSignals: score.missingSignals,
      },
      update: {
        score: score.score,
        confidence: score.confidence,
        components: score.components as unknown as object,
        reasons: score.reasons,
        missingSignals: score.missingSignals,
      },
    });
  }

  return { offersProcessed: items.length, offersCreated, offersUpdated };
}
