import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ensurePublicSlugForListing } from "@/lib/queries/public-product";
import { saveManualAffiliateLink } from "@/lib/services/affiliate-link-registry";

const runId = Date.now();
let counter = 0;
const canonicalIds: string[] = [];
const listingIds: string[] = [];

async function makeMlListing(withCanonical: boolean) {
  const n = ++counter;
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  const canonical = withCanonical
    ? await prisma.canonicalProduct.create({
        data: {
          slug: `ml-catalog-slugtest-${runId}-${n}`,
          title: `Creatina Teste Slug ${runId} ${n}`,
        },
      })
    : null;
  if (canonical) canonicalIds.push(canonical.id);
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      externalId: `MLBSLUG${runId}-${n}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://produto.mercadolivre.com.br/MLB1",
      canonicalProductId: canonical?.id ?? null,
    },
  });
  listingIds.push(listing.id);
  return { merchant, canonical, listing };
}

afterAll(async () => {
  await prisma.affiliateLinkRegistry.deleteMany({
    where: { merchantListingId: { in: listingIds } },
  });
  await prisma.merchantListing.deleteMany({
    where: { id: { in: listingIds } },
  });
  await prisma.canonicalProduct.deleteMany({
    where: { id: { in: canonicalIds } },
  });
});

describe("ensurePublicSlugForListing", () => {
  it("creates the public slug for a Mercado Livre listing from its catalog product, and is idempotent", async () => {
    const { listing, canonical } = await makeMlListing(true);
    const slug = await ensurePublicSlugForListing(listing.id);
    expect(slug).toBeTruthy();
    expect(slug).toContain("creatina");
    expect(
      (
        await prisma.canonicalProduct.findUnique({
          where: { id: canonical!.id },
        })
      )?.publicSlug,
    ).toBe(slug);
    expect(await ensurePublicSlugForListing(listing.id)).toBe(slug);
  });

  it("returns null when the listing cannot have a page", async () => {
    const { listing } = await makeMlListing(false);
    expect(await ensurePublicSlugForListing(listing.id)).toBeNull();
    expect(await ensurePublicSlugForListing("does-not-exist")).toBeNull();
  });

  it("saving an affiliate link gives the listing its public page right away", async () => {
    const { listing, canonical, merchant } = await makeMlListing(true);
    await saveManualAffiliateLink({
      merchantListingId: listing.id,
      merchantId: merchant.id,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: listing.productUrl,
      affiliateUrl: "https://meli.la/1AbCdEf",
    });
    const after = await prisma.canonicalProduct.findUnique({
      where: { id: canonical!.id },
    });
    expect(after?.publicSlug).toBeTruthy();
  });
});
