import { prisma } from "@/lib/db";
import type { CommerceProvider } from "@/types/commerce";

/**
 * Once an AffiliateLinkRegistry row goes ACTIVE, nothing ever checks it
 * again — lastValidatedAt is stamped at save time and never read (found
 * 2026-09-14). A stale link (product delisted, out of stock for good)
 * keeps sending real visitors to a dead page indefinitely. This is the
 * missing check, using each merchant's own real, already-authorized API
 * (provider.getProduct) — never scraping the affiliate link itself, which
 * would need automating a browser session against pages we don't control.
 *
 * Deliberately conservative: a transient error (network blip, rate limit)
 * must never flip a healthy link to INVALID — only a clean "not found" or
 * a clean "out of stock" response counts as real evidence the offer is
 * gone. Anything else is a soft failure, counted but not acted on.
 */
export type LinkHealthOutcome =
  | { outcome: "STILL_VALID" }
  | { outcome: "FLAGGED_INVALID"; reason: "NOT_FOUND" | "OUT_OF_STOCK" }
  | { outcome: "CHECK_FAILED"; message: string };

export async function checkOneLinkHealth(
  provider: CommerceProvider,
  merchantListingId: string,
  externalId: string,
): Promise<LinkHealthOutcome> {
  let product;
  try {
    product = await provider.getProduct(externalId);
  } catch (err) {
    return { outcome: "CHECK_FAILED", message: String(err) };
  }

  if (!product) {
    await flagInvalid(merchantListingId, "NOT_FOUND");
    return { outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" };
  }
  if (product.offer.availability === "OUT_OF_STOCK") {
    await flagInvalid(merchantListingId, "OUT_OF_STOCK");
    return { outcome: "FLAGGED_INVALID", reason: "OUT_OF_STOCK" };
  }

  await prisma.affiliateLinkRegistry.update({
    where: { merchantListingId },
    data: { lastValidatedAt: new Date() },
  });
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
