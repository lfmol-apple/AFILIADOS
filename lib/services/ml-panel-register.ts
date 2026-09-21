import { prisma } from "@/lib/db";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { ensureMercadoLivreMerchant } from "@/lib/services/ml-demand-collector";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import { saveManualAffiliateLink } from "@/lib/services/affiliate-link-registry";
import { logger } from "@/lib/observability/logger";

export class PanelRegisterError extends Error {}

/**
 * Picks the Mercado Livre catalog product id out of a page's HTML or a URL.
 * The affiliate panel's "social" landing page mentions the shared product many
 * times as .../p/MLB123 (plain or URL-encoded) and a handful of "related"
 * products only a few times, so the most frequent id wins.
 */
export function extractCatalogProductId(text: string): string | null {
  const counts = new Map<string, number>();
  for (const m of text.matchAll(/(?:\/p\/|%2Fp%2F)(MLB\d{6,})/gi)) {
    const id = m[1]!.toUpperCase();
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, n] of counts) {
    if (n > bestCount) {
      best = id;
      bestCount = n;
    }
  }
  return best;
}

const MELI_HOSTS = /^(www\.)?(mercadolivre\.com(\.br)?|meli\.la)$/i;

/** Follows the short link and returns the catalog product id, or null. */
export async function resolveCatalogProductId(
  affiliateUrl: string,
): Promise<string | null> {
  const url = new URL(affiliateUrl);
  if (!MELI_HOSTS.test(url.hostname)) return null;
  const direct = extractCatalogProductId(decodeURIComponent(affiliateUrl));
  if (direct) return direct;
  const response = await fetch(affiliateUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  return extractCatalogProductId(await response.text());
}

export interface PanelRegisterResult {
  merchantListingId: string;
  catalogProductId: string;
  title: string | null;
}

/**
 * Registers one product the owner picked from the panel list: identifies the
 * Mercado Livre product behind the pasted affiliate link, creates its catalog
 * listing (title, photo and prices come from Mercado Livre itself, exactly as
 * the automated cycle does), saves the link and records which panel row it
 * answered so the row leaves the list.
 */
export async function registerPanelPick(input: {
  panelId: string;
  panelTitle: string;
  affiliateUrl: string;
  rate: number;
  price: number;
}): Promise<PanelRegisterResult> {
  const catalogProductId = await resolveCatalogProductId(input.affiliateUrl);
  if (!catalogProductId) {
    throw new PanelRegisterError(
      "Não consegui identificar o produto nesse link. Cole o link gerado pelo botão Compartilhar do painel (meli.la ou mercadolivre.com/sec/...).",
    );
  }

  const merchant = await ensureMercadoLivreMerchant();
  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: merchant.id,
        marketplace: "BR",
        externalId: catalogProductId,
      },
    },
    create: {
      merchantId: merchant.id,
      externalId: catalogProductId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: `https://www.mercadolivre.com.br/p/${catalogProductId}`,
      source: "MANUAL_VERIFIED",
    },
    update: {},
  });

  try {
    const provider = await createMercadoLivreProvider();
    await enrichCatalogListing(provider, merchant.id, listing, 60, new Map());
  } catch (error) {
    logger.warn("ml_panel_register.enrich_failed", {
      catalogProductId,
      message: String(error),
    });
  }

  let current = await prisma.merchantListing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { canonicalProduct: { select: { title: true } } },
  });
  if (!current.canonicalProductId) {
    // Mercado Livre did not return the product: fall back to the title the
    // owner saw in the panel, so the page can still exist.
    const canonical = await prisma.canonicalProduct.upsert({
      where: { slug: `ml-catalog-${catalogProductId}` },
      create: {
        slug: `ml-catalog-${catalogProductId}`,
        title: input.panelTitle,
        specifications: { catalogProductId },
      },
      update: {},
    });
    current = await prisma.merchantListing.update({
      where: { id: listing.id },
      data: { canonicalProductId: canonical.id },
      include: { canonicalProduct: { select: { title: true } } },
    });
  }

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "panel_pick",
      raw: {
        panelTitle: input.panelTitle,
        rate: input.rate,
        price: input.price,
      },
    },
  });

  await saveManualAffiliateLink({
    merchantListingId: listing.id,
    merchantId: merchant.id,
    merchantCode: "MERCADO_LIVRE",
    publicUrl: current.productUrl,
    affiliateUrl: input.affiliateUrl,
  });

  return {
    merchantListingId: listing.id,
    catalogProductId,
    title: current.canonicalProduct?.title ?? null,
  };
}

/** Panel row ids already answered with a saved link. */
export async function loadRegisteredPanelIds(): Promise<Set<string>> {
  const rows = await prisma.merchantListingSignal.findMany({
    where: { source: "panel_pick" },
    select: { raw: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    const raw = row.raw as { panelId?: string; panelTitle?: string } | null;
    const id = raw?.panelId ?? raw?.panelTitle;
    if (id) ids.add(id);
  }
  return ids;
}
