import { prisma } from "@/lib/db";
import { saveVitrineLink } from "@/lib/services/affiliate-link-registry";
import { resolveAttributionTagForListing } from "@/lib/services/vitrine-manager";

export class VitrineRegisterError extends Error {}

export interface VitrineRegisterResult {
  merchantListingId: string;
  title: string | null;
}

/**
 * Saves the "vitrinedinamica" affiliate link for a listing the Vitrine
 * Inteligente already selected (lib/services/vitrine-selection.ts). Unlike
 * registerPanelPick (ml-panel-register.ts), this never creates or enriches
 * a MerchantListing — by the time a listing reaches VitrineSelection it
 * already exists, discovered and enriched by the regular ML/Shopee jobs.
 * The only new thing here is the second, parallel affiliate link.
 */
export async function registerVitrineLink(input: {
  merchantListingId: string;
  affiliateUrl: string;
}): Promise<VitrineRegisterResult> {
  const listing = await prisma.merchantListing.findUnique({
    where: { id: input.merchantListingId },
    include: {
      merchant: true,
      canonicalProduct: { select: { title: true } },
    },
  });
  if (!listing) {
    throw new VitrineRegisterError("Produto da Vitrine não encontrado.");
  }

  // Owner's directive, 2026-11-24 ("Isolamento integral entre vitrines",
  // item 3): never hardcoded here — it's whichever vitrine currently
  // holds this exact listing ACTIVE, so a real click is always
  // traceable to the vitrine that actually produced it.
  const attributionTag = await resolveAttributionTagForListing(listing.id);

  await saveVitrineLink({
    merchantListingId: listing.id,
    merchantId: listing.merchantId,
    merchantCode: listing.merchant.code,
    publicUrl: listing.productUrl,
    affiliateUrl: input.affiliateUrl,
    attributionTag,
  });

  return {
    merchantListingId: listing.id,
    title: listing.canonicalProduct?.title ?? null,
  };
}
