import { prisma } from "@/lib/db";
import { isValidAsin, buildAmazonProductUrl } from "@/lib/amazon/policy-guard";
import { isMarketplaceCode, getEnabledMarketplaces } from "@/lib/config/marketplaces";
import { generateUniqueSlug } from "@/lib/services/slug";
import type { MarketplaceCode } from "@/types/marketplace";

/**
 * The one and only way to create a dataSource=MANUAL_VERIFIED Product —
 * used by both scripts/product-add.ts and lib/services/candidate-promotion.ts
 * (project brief Sprint 7 sections 4-6), so there is exactly one place that
 * decides what fields a manually-registered real product may have.
 *
 * Deliberately narrow: no price, no rating, no reviewCount, no imageUrl, no
 * affiliateUrl field accepted here at all — those aren't exposed as inputs,
 * not just "left blank," so this function can never be used to smuggle in a
 * fabricated commercial fact. active is always created false (draft); a
 * human decides when to flip it via scripts/product-activate.ts. The
 * affiliate URL itself is never stored per-product — it's derived
 * automatically from asin+marketplace by buildAmazonProductUrl(), the same
 * function /go/amazon/[asin] uses, so nobody ever has to hand-build a link.
 */
export interface ManualProductInput {
  asin: string;
  marketplace: string;
  title: string;
  /** Original PreçoCaindo editorial content — never the Amazon listing
   * description, never a fabricated review/spec. */
  description: string;
  categorySlug: string;
  brand?: string | null;
  /** Only when a specific slug is required (e.g. matching a promoted
   * candidate's slugHint) — otherwise a unique one is derived from title. */
  slug?: string | null;
}

export type ManualProductRegistrationError =
  | { code: "MISSING_FIELD"; message: string }
  | { code: "INVALID_MARKETPLACE"; message: string }
  | { code: "MARKETPLACE_NOT_ENABLED"; message: string }
  | { code: "INVALID_ASIN"; message: string }
  | { code: "CATEGORY_NOT_FOUND"; message: string; availableCategorySlugs: string[] }
  | { code: "ALREADY_EXISTS"; message: string; existingProductId: string };

export interface RegisteredManualProduct {
  id: string;
  slug: string;
  asin: string;
  marketplace: MarketplaceCode;
}

export type ManualProductRegistrationResult =
  | { ok: true; product: RegisteredManualProduct; affiliateUrlPreview: string | null }
  | { ok: false; error: ManualProductRegistrationError };

export async function registerManualVerifiedProduct(
  input: ManualProductInput,
): Promise<ManualProductRegistrationResult> {
  if (!input.title?.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", message: "title é obrigatório." } };
  }
  if (!input.description?.trim()) {
    return {
      ok: false,
      error: { code: "MISSING_FIELD", message: "description (conteúdo editorial próprio) é obrigatório." },
    };
  }
  if (!input.categorySlug?.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", message: "categorySlug é obrigatório." } };
  }

  if (!isMarketplaceCode(input.marketplace)) {
    return {
      ok: false,
      error: { code: "INVALID_MARKETPLACE", message: `Marketplace desconhecido: "${input.marketplace}".` },
    };
  }
  const marketplace = input.marketplace as MarketplaceCode;
  if (!getEnabledMarketplaces().includes(marketplace)) {
    return {
      ok: false,
      error: {
        code: "MARKETPLACE_NOT_ENABLED",
        message: `Marketplace ${marketplace} não está habilitado (AMAZON_${marketplace}_ENABLED=false).`,
      },
    };
  }

  if (!isValidAsin(input.asin)) {
    return { ok: false, error: { code: "INVALID_ASIN", message: `ASIN inválido: "${input.asin}".` } };
  }

  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) {
    const available = await prisma.category.findMany({
      where: { active: true },
      select: { slug: true },
      orderBy: { slug: "asc" },
    });
    return {
      ok: false,
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: `Categoria não encontrada: "${input.categorySlug}".`,
        availableCategorySlugs: available.map((c) => c.slug),
      },
    };
  }

  const existing = await prisma.product.findUnique({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace, asin: input.asin } },
  });
  if (existing) {
    return {
      ok: false,
      error: {
        code: "ALREADY_EXISTS",
        message: `Já existe um Product para este ASIN/marketplace (id=${existing.id}, slug=${existing.slug}, dataSource=${existing.dataSource}).`,
        existingProductId: existing.id,
      },
    };
  }

  const slug =
    input.slug?.trim() ||
    (await generateUniqueSlug(
      input.title,
      input.asin,
      async (candidateSlug) => Boolean(await prisma.product.findUnique({ where: { slug: candidateSlug } })),
    ));

  const product = await prisma.product.create({
    data: {
      asin: input.asin,
      provider: "AMAZON",
      marketplace,
      dataSource: "MANUAL_VERIFIED",
      slug,
      title: input.title,
      brand: input.brand ?? null,
      description: input.description,
      categoryId: category.id,
      // Always created as a draft — a human decides when to publish via
      // scripts/product-activate.ts. Even then, it stays non-public until
      // PUBLIC_CATALOG_ENABLED and MANUAL_PRODUCTS_ENABLED are both on.
      active: false,
    },
  });

  // Preview only, never persisted on Product/Offer — proves the exact same
  // automatic construction /go/amazon/[asin] uses at request time, so
  // nobody needs to hand-build or store an affiliate link per product.
  let affiliateUrlPreview: string | null = null;
  try {
    affiliateUrlPreview = buildAmazonProductUrl(product.asin, marketplace);
  } catch {
    affiliateUrlPreview = null;
  }

  return {
    ok: true,
    product: { id: product.id, slug: product.slug, asin: product.asin, marketplace },
    affiliateUrlPreview,
  };
}
