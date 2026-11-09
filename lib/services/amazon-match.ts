import { prisma } from "@/lib/db";
import { registerManualVerifiedProduct } from "@/lib/services/manual-product-registration";

export type AmazonMatchDecisionInput =
  | { merchantListingId: string; decision: "NO_MATCH" }
  | {
      merchantListingId: string;
      decision: "MATCHED";
      asin: string;
      title: string;
      brand?: string | null;
      categorySlug: string;
      description: string;
    };

export type AmazonMatchDecisionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Records one human review decision from the Amazon-matching queue
 * (lib/queries/amazon-match-queue.ts) — the listing leaves the queue the
 * moment this succeeds, whichever way it went. On MATCHED, reuses (never
 * duplicates) an existing Product for that ASIN if one was already
 * registered from a different listing — the same real-world Amazon
 * product can legitimately be the match for more than one ML/Shopee
 * listing (e.g. two sellers of the identical item).
 */
export async function recordAmazonMatchDecision(
  input: AmazonMatchDecisionInput,
): Promise<AmazonMatchDecisionResult> {
  const listing = await prisma.merchantListing.findUnique({
    where: { id: input.merchantListingId },
  });
  if (!listing) {
    return { ok: false, error: "MerchantListing não encontrado." };
  }

  const already = await prisma.amazonMatch.findUnique({
    where: { merchantListingId: input.merchantListingId },
  });
  if (already) {
    return { ok: false, error: "Este anúncio já foi revisado." };
  }

  if (input.decision === "NO_MATCH") {
    await prisma.amazonMatch.create({
      data: { merchantListingId: input.merchantListingId, status: "NO_MATCH" },
    });
    return { ok: true };
  }

  let product = await prisma.product.findUnique({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin: input.asin } },
  });

  if (!product) {
    const result = await registerManualVerifiedProduct({
      asin: input.asin,
      marketplace: "BR",
      title: input.title,
      description: input.description,
      categorySlug: input.categorySlug,
      brand: input.brand ?? null,
    });
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }
    product = await prisma.product.findUnique({ where: { id: result.product.id } });
    if (product && !product.active) {
      product = await prisma.product.update({ where: { id: product.id }, data: { active: true } });
    }
  }
  if (!product) {
    return { ok: false, error: "Falha ao criar o produto Amazon." };
  }

  await prisma.amazonMatch.create({
    data: {
      merchantListingId: input.merchantListingId,
      status: "MATCHED",
      amazonProductId: product.id,
    },
  });
  return { ok: true };
}
