import { prisma } from "@/lib/db";
import { buildAmazonDirectProductUrl } from "@/lib/amazon/policy-guard";

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { code: "AMAZON" },
    create: {
      code: "AMAZON",
      name: "Amazon",
      homepageUrl: "https://www.amazon.com.br",
      active: true,
      affiliateEnabled: true,
    },
    update: {
      name: "Amazon",
      active: true,
      affiliateEnabled: true,
    },
  });

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  let canonicalCreated = 0;
  let listingsCreated = 0;

  for (const product of products) {
    let canonicalProductId = product.canonicalProductId;
    if (!canonicalProductId) {
      const canonical = await prisma.canonicalProduct.upsert({
        where: { slug: product.slug },
        create: {
          slug: product.slug,
          title: product.title,
          brand: product.brand,
          description: product.description,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          specifications: product.specifications ?? undefined,
          active: product.active,
        },
        update: {},
      });
      canonicalProductId = canonical.id;
      canonicalCreated += 1;
      await prisma.product.update({
        where: { id: product.id },
        data: { canonicalProductId },
      });
    }

    const existingListing = await prisma.merchantListing.findUnique({
      where: {
        merchantId_marketplace_externalId: {
          merchantId: merchant.id,
          marketplace: product.marketplace,
          externalId: product.asin,
        },
      },
    });
    if (existingListing) continue;

    await prisma.merchantListing.create({
      data: {
        canonicalProductId,
        merchantId: merchant.id,
        legacyProductId: product.id,
        externalId: product.asin,
        externalIdType: "ASIN",
        marketplace: product.marketplace,
        productUrl: buildAmazonDirectProductUrl(
          product.asin,
          product.marketplace,
        ),
        source: product.dataSource,
        active: product.active,
      },
    });
    listingsCreated += 1;
  }

  console.log("Backfill multiloja concluído:");
  console.log(`  produtos canônicos criados: ${canonicalCreated}`);
  console.log(`  listings Amazon criados:    ${listingsCreated}`);
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
