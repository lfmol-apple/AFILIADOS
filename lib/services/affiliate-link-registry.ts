import { prisma } from "@/lib/db";
import { ensurePublicSlugForListing } from "@/lib/queries/public-product";
import { logger } from "@/lib/observability/logger";
import {
  assertAllowedMerchantDestination,
  isMerchantCode,
  MerchantRoutingError,
  type MerchantCode,
} from "@/lib/merchants/config";
import type {
  AffiliateLinkRegistry,
  MerchantCode as PrismaMerchantCode,
} from "@prisma/client";

/**
 * Prisma's Merchant.code is upper-snake (project brief-neutral DB
 * convention); lib/merchants/config.ts's MerchantCode is kebab-case (matches
 * the public /go/[merchant]/... URL segment). This is the only place that
 * translates between them for affiliate-link validation — never duplicate
 * this mapping elsewhere.
 */
function toRoutingMerchantCode(code: PrismaMerchantCode): MerchantCode | null {
  const kebab = code.toLowerCase().replace(/_/g, "-");
  return isMerchantCode(kebab) ? kebab : null;
}

export class AffiliateLinkValidationError extends Error {}

/** Read-only lookup — used by the ML admin queue and by anything that needs
 * to know "do we already have a working link for this listing" before
 * asking a human/API to generate a new one. */
export async function getAffiliateLink(
  merchantListingId: string,
): Promise<AffiliateLinkRegistry | null> {
  return prisma.affiliateLinkRegistry.findUnique({
    where: { merchantListingId },
  });
}

interface SaveAffiliateLinkInput {
  merchantListingId: string;
  merchantId: string;
  merchantCode: PrismaMerchantCode;
  publicUrl: string;
  affiliateUrl: string;
  attributionTag: string;
}

async function saveAffiliateLink(
  input: SaveAffiliateLinkInput,
  source: "API" | "MANUAL_ADMIN" | "LEGACY" | "MANUAL_ADMIN_CATEGORY",
): Promise<AffiliateLinkRegistry> {
  const routingCode = toRoutingMerchantCode(input.merchantCode);
  if (!routingCode) {
    throw new AffiliateLinkValidationError(
      `Unknown merchant code: ${input.merchantCode}`,
    );
  }

  try {
    assertAllowedMerchantDestination(input.affiliateUrl, routingCode);
  } catch (err) {
    if (err instanceof MerchantRoutingError) {
      throw new AffiliateLinkValidationError(err.message);
    }
    throw err;
  }

  // A hand-pasted link must belong to exactly one product. The same link saved
  // on two listings sends visitors of one of them to the wrong product (found
  // 2026-09-21: two different refill kits both opened one Samsung phone).
  if (source === "MANUAL_ADMIN" || source === "MANUAL_ADMIN_CATEGORY") {
    const taken = await prisma.affiliateLinkRegistry.findFirst({
      where: {
        affiliateUrl: input.affiliateUrl,
        status: "ACTIVE",
        merchantListingId: { not: input.merchantListingId },
      },
      select: { merchantListingId: true },
    });
    if (taken) {
      throw new AffiliateLinkValidationError(
        "Esse link já está cadastrado em outro produto. Cada produto precisa do seu próprio link, gerado no painel para ele.",
      );
    }
  }

  const saved = await prisma.affiliateLinkRegistry.upsert({
    where: { merchantListingId: input.merchantListingId },
    create: {
      merchantListingId: input.merchantListingId,
      merchantId: input.merchantId,
      publicUrl: input.publicUrl,
      affiliateUrl: input.affiliateUrl,
      attributionTag: input.attributionTag,
      source,
      status: "ACTIVE",
      lastValidatedAt: new Date(),
    },
    update: {
      publicUrl: input.publicUrl,
      affiliateUrl: input.affiliateUrl,
      attributionTag: input.attributionTag,
      source,
      status: "ACTIVE",
      lastValidatedAt: new Date(),
    },
  });

  // Everything the owner registers must be able to reach Google: give the
  // listing its public page right away (it enters the sitemap once it passes
  // the publication gate). Best-effort — a slug problem must never fail or
  // roll back saving the link itself; the periodic maintenance run
  // (app/api/internal/seo-maintenance) catches anything missed here.
  try {
    await ensurePublicSlugForListing(input.merchantListingId);
  } catch (error) {
    logger.warn("affiliate_link.public_slug_failed", {
      merchantListingId: input.merchantListingId,
      message: String(error),
    });
  }

  return saved;
}

/**
 * The human-assisted Mercado Livre flow (project brief): an admin pastes a
 * link they generated in ML's own official tool, tagged "precocaindo".
 * Validates the pasted URL is actually an allowed Mercado Livre host before
 * ever persisting it — a typo'd/wrong-merchant paste is rejected, never
 * silently stored. Always source=MANUAL_ADMIN — the site's original queue
 * (app/admin/page.tsx's "Pendências de receita"), unchanged since 2026-09-08.
 */
export async function saveManualAffiliateLink(
  input: Omit<SaveAffiliateLinkInput, "attributionTag">,
): Promise<AffiliateLinkRegistry> {
  return saveAffiliateLink(
    { ...input, attributionTag: "precocaindo" },
    "MANUAL_ADMIN",
  );
}

/**
 * Same human-assisted Mercado Livre flow, byte-for-byte, for links pasted
 * through the newer /admin/fila-links queue (2026-09-22) — products read off
 * the affiliate panel category by category, never the "Pendências de
 * receita" one. The only difference is `source=MANUAL_ADMIN_CATEGORY`, kept
 * apart from MANUAL_ADMIN on purpose (owner's request): every link this
 * queue creates from now on is queryable as its own batch, distinct from
 * the ~1,280 links already ACTIVE before this value existed — precaution in
 * case those two batches need different correction work later. Public
 * behavior is identical: same validation, same publication-gate slug, same
 * duplicate-link guard, same rendering on /ofertas.
 */
export async function saveManualAffiliateLinkFromCategoryQueue(
  input: Omit<SaveAffiliateLinkInput, "attributionTag">,
): Promise<AffiliateLinkRegistry> {
  return saveAffiliateLink(
    { ...input, attributionTag: "precocaindo" },
    "MANUAL_ADMIN_CATEGORY",
  );
}

/** The Shopee flow: a link generated programmatically through their
 * official affiliate API (lib/providers/shopee-provider.ts). */
export async function saveApiGeneratedAffiliateLink(
  input: SaveAffiliateLinkInput,
): Promise<AffiliateLinkRegistry> {
  return saveAffiliateLink(input, "API");
}
