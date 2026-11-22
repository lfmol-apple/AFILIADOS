import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { renderAdOverlay, toBuffer } from "@/lib/services/ai-creative-factory/compositor";
import { readAiBase, saveFinalRender } from "@/lib/services/ai-creative-factory/creative-image-store";
import { interpretProduct } from "@/lib/services/ai-creative-factory/product-interpretation";

// One-off, zero-cost re-render of the ad_overlay variant for every
// currently-approved creative, after a compositor fix (owner's finding,
// 2026-11-20: low-contrast title on light product backgrounds) — reuses
// the SAME cached AI base image, never a new OpenAI call.
async function main() {
  const approved = await prisma.vitrineCreative.findMany({
    where: { kind: "ad_overlay", qualityStatus: "approved" },
    include: {
      merchantListing: {
        select: {
          canonicalProduct: { select: { publicSlug: true, title: true, categoryId: true } },
          // Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
          // Inteligentes"): the relation is now a list (a listing can have
          // one row per vitrine) — this script only ever cares about the
          // real, currently-active one, same single row it always read
          // before this change for the one vitrine that existed then.
          vitrineSelections: { where: { status: "ACTIVE" }, select: { scoreBreakdown: true }, take: 1 },
        },
      },
    },
  });
  let updated = 0;
  for (const row of approved) {
    const slug = row.merchantListing.canonicalProduct?.publicSlug;
    if (!slug) continue;
    const product = await loadPublicMerchantProduct(slug).catch(() => null);
    if (!product) continue;
    const aiBaseBytes = readAiBase(row.merchantListingId, row.version);
    if (!aiBaseBytes) continue;
    const dataUri = `data:image/png;base64,${aiBaseBytes.toString("base64")}`;
    const breakdown = row.merchantListing.vitrineSelections[0]?.scoreBreakdown as { matchedEventName?: string | null } | null;
    const profile = interpretProduct({
      title: product.title,
      brand: product.brand,
      categoryHint: row.merchantListing.canonicalProduct?.categoryId ?? null,
      currentPrice: product.currentPrice!,
      referencePrice: product.referencePrice,
      hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
      rating: product.rating,
      reviewCount: product.reviewCount,
      isSeasonalEvent: breakdown?.matchedEventName ?? null,
    });
    const png = await toBuffer(
      renderAdOverlay({
        aiBaseImageDataUri: dataUri,
        title: product.title,
        brand: product.brand,
        currentPrice: product.currentPrice!,
        referencePrice: product.referencePrice,
        hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
        benefits: profile.benefits.map((b) => b.text),
      }),
    );
    saveFinalRender(row.merchantListingId, "ad_overlay", row.version, png);
    updated += 1;
    console.log(`re-rendered ${product.title.slice(0, 50)}`);
  }
  console.log(`done: ${updated}/${approved.length} re-rendered`);
  await prisma.$disconnect();
}

main();
