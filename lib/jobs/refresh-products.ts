import { prisma } from "@/lib/db";
import { getCommerceProvider } from "@/lib/providers";
import type { JobContext } from "./automation-run";
import type { UpdatePriority } from "@prisma/client";

/**
 * Shared refresh logic for REFRESH_PRIORITY_PRODUCTS / REFRESH_CATALOG.
 * Pulls current offers for a batch of active products and records a new
 * PriceHistory point only when the price actually changed, so history
 * reflects real observations rather than one row per run (project brief
 * section 10/52: never fabricate or pad history).
 */
export async function refreshProductsByPriority(
  priorities: UpdatePriority[],
  limit: number,
  ctx: JobContext,
) {
  const products = await prisma.product.findMany({
    where: { active: true, updatePriority: { in: priorities } },
    orderBy: { lastSeenAt: "asc" },
    take: limit,
  });
  if (products.length === 0) return;

  const provider = getCommerceProvider();
  const asins = products.map((p) => p.asin);
  const offers = await provider.getOffers(asins);
  const now = new Date();

  for (const product of products) {
    ctx.counters.processed += 1;
    const offer = offers[product.asin];
    if (!offer) {
      ctx.counters.errors += 1;
      continue;
    }

    const lastOffer = await prisma.offer.findFirst({
      where: { productId: product.id },
      orderBy: { observedAt: "desc" },
    });
    const priceChanged = !lastOffer || Number(lastOffer.price) !== offer.price;

    await prisma.offer.create({
      data: {
        productId: product.id,
        provider: "AMAZON",
        price: offer.price,
        currency: offer.currency,
        originalPrice: offer.originalPrice,
        discountPercentage: offer.discountPercentage,
        affiliateUrl: offer.affiliateUrl,
        availability: offer.availability,
        observedAt: offer.observedAt,
      },
    });

    if (priceChanged) {
      await prisma.priceHistory.create({
        data: {
          productId: product.id,
          provider: "AMAZON",
          price: offer.price,
          observedAt: offer.observedAt,
        },
      });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { lastSeenAt: now },
    });

    ctx.counters.updated += 1;
  }
}
