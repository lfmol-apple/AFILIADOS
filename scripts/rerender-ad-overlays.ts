import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { renderAdOverlay, toBuffer } from "@/lib/services/ai-creative-factory/compositor";
import { readAiBase, saveFinalRender } from "@/lib/services/ai-creative-factory/creative-image-store";

// One-off, zero-cost re-render of the ad_overlay variant for every
// currently-approved creative, after a compositor fix (owner's finding,
// 2026-11-20: low-contrast title on light product backgrounds) — reuses
// the SAME cached AI base image, never a new OpenAI call.
async function main() {
  const approved = await prisma.vitrineCreative.findMany({
    where: { kind: "ad_overlay", qualityStatus: "approved" },
    include: { merchantListing: { select: { canonicalProduct: { select: { publicSlug: true, title: true } } } } },
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
    const png = await toBuffer(
      renderAdOverlay({
        aiBaseImageDataUri: dataUri,
        title: product.title,
        brand: product.brand,
        currentPrice: product.currentPrice!,
        referencePrice: product.referencePrice,
        hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
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
