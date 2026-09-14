import { prisma } from "@/lib/db";
import type { MercadoLivreProvider } from "@/lib/providers/mercado-livre-provider";
import type { ShopeeProvider } from "@/lib/providers/shopee-provider";

/**
 * Once an AffiliateLinkRegistry row goes ACTIVE, nothing ever checks it
 * again — lastValidatedAt is stamped at save time and never read (found
 * 2026-09-14). A stale link (product delisted, out of stock for good)
 * keeps sending real visitors to a dead page indefinitely. This is the
 * missing check, using each merchant's own real, already-authorized API —
 * never the affiliate link itself, which would need automating a browser
 * against a page we don't control.
 *
 * INCIDENT (2026-09-14, same day): the first version called
 * MercadoLivreProvider.getProduct() (GET /items/{id}) uniformly for every
 * ML link. But AffiliateLinkRegistry.merchantListingId always points at
 * the *catalog* row (see lib/queries/ml-affiliate-queue.ts's
 * enrichWithBestOffer — merchantListingId is never swapped to the real
 * offer sibling, only publicUrl/score are), and a catalog-level id
 * (mercado_livre_highlights-sourced) 404s on GET /items/{id} by design —
 * that's a *different* Mercado Livre resource, confirmed in this same
 * provider's own getCatalogProductName doc comment. Running the first
 * version against all 329 real ACTIVE links flagged 219 of them INVALID
 * incorrectly; every one was reverted by hand before this fix.
 *
 * Fixed: check the catalog product's own existence (GET /products/{id},
 * via getCatalogProductName) for Mercado Livre — the correct, already
 * proven-working endpoint for exactly this id shape (used elsewhere by
 * MercadoLivreBestsellerDemandSource's own resolver). No stock/condition
 * check for ML: that's a per-seller-offer fact, not a catalog-level one,
 * and GET /items/{id} 403s for any item this account doesn't own (every
 * real seller's item, confirmed in getCatalogProductItems's doc comment)
 * — there is no reliable per-offer endpoint available today, so ML only
 * ever checks "does the catalog product still exist," nothing finer.
 * Shopee is unaffected (no catalog/item split — its own externalId is
 * already the real item id productOfferV2 expects, and its API does
 * return a real per-offer availability fact).
 */
export type LinkHealthOutcome =
  | { outcome: "STILL_VALID" }
  | { outcome: "FLAGGED_INVALID"; reason: "NOT_FOUND" | "OUT_OF_STOCK" }
  | { outcome: "CHECK_FAILED"; message: string };

export async function checkOneMercadoLivreLinkHealth(
  provider: MercadoLivreProvider,
  merchantListingId: string,
  catalogProductId: string,
  dryRun: boolean,
): Promise<LinkHealthOutcome> {
  let name: string | null;
  try {
    name = await provider.getCatalogProductName(catalogProductId);
  } catch (err) {
    return { outcome: "CHECK_FAILED", message: String(err) };
  }

  if (name === null) {
    if (!dryRun) await flagInvalid(merchantListingId, "NOT_FOUND");
    return { outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" };
  }

  if (!dryRun) {
    await prisma.affiliateLinkRegistry.update({
      where: { merchantListingId },
      data: { lastValidatedAt: new Date() },
    });
  }
  return { outcome: "STILL_VALID" };
}

export async function checkOneShopeeLinkHealth(
  provider: ShopeeProvider,
  merchantListingId: string,
  externalId: string,
  dryRun: boolean,
): Promise<LinkHealthOutcome> {
  let product;
  try {
    product = await provider.getProduct(externalId);
  } catch (err) {
    return { outcome: "CHECK_FAILED", message: String(err) };
  }

  if (!product) {
    if (!dryRun) await flagInvalid(merchantListingId, "NOT_FOUND");
    return { outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" };
  }
  if (product.offer.availability === "OUT_OF_STOCK") {
    if (!dryRun) await flagInvalid(merchantListingId, "OUT_OF_STOCK");
    return { outcome: "FLAGGED_INVALID", reason: "OUT_OF_STOCK" };
  }

  if (!dryRun) {
    await prisma.affiliateLinkRegistry.update({
      where: { merchantListingId },
      data: { lastValidatedAt: new Date() },
    });
  }
  return { outcome: "STILL_VALID" };
}

async function flagInvalid(
  merchantListingId: string,
  reason: "NOT_FOUND" | "OUT_OF_STOCK",
) {
  // Never deleted, never silently hidden without a trace — status=INVALID
  // keeps the row for audit (matches the enum's own doc comment), and
  // active=false removes it from every public/admin surface immediately,
  // through the exact same mechanism a human unchecking "Descartar" or a
  // real out-of-stock signal already uses elsewhere — no new filtering
  // logic needed anywhere else in the codebase.
  await prisma.$transaction([
    prisma.affiliateLinkRegistry.update({
      where: { merchantListingId },
      data: { status: "INVALID", lastValidatedAt: new Date() },
    }),
    prisma.merchantListing.update({
      where: { id: merchantListingId },
      data: { active: false, availability: reason === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "UNKNOWN" },
    }),
  ]);
}
