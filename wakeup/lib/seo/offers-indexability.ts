import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import { getUnifiedMerchantOffers } from "@/lib/queries/unified-offers";

/**
 * Single source of truth for whether /ofertas deserves indexing right now.
 * The page can stay reachable in pre-launch, but sitemap, robots and page
 * metadata must agree so Search Console is not fed a URL that declares
 * itself noindex.
 */
export async function isOffersPageIndexable(): Promise<boolean> {
  if (currentlyVisibleDataSources().length > 0) return true;
  return (await getUnifiedMerchantOffers(1)).length > 0;
}
