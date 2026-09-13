import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getUnifiedMerchantOffers } from "@/lib/queries/unified-offers";
import { selectCandidateListingIds, bestByNonCommissionSignal } from "@/lib/queries/candidate-pool";

/**
 * Commission-bias regression guard (2026-09-12, post-hotfix code review).
 * The bug found in the just-approved performance hotfix: the bounded
 * candidate pool (lib/queries/unified-offers.ts,
 * lib/queries/radar-events.ts) pre-selected rows at the DB level with
 * `orderBy: { monetizationScore: { score: "desc" } }` — but that `score`
 * is a blend that includes `commission` (lib/services/monetization-
 * score.ts). A row with a high commission but low demand/offerQuality
 * could out-rank, and therefore push out of the bounded `LIMIT`, a row
 * that's genuinely better for the consumer but pays less — before the
 * in-memory, commission-free ranking (nonCommissionSignal) ever got a
 * chance to see it. Project rule: comissão nunca decide quais produtos
 * são apresentados ao consumidor como as melhores oportunidades — this
 * has to hold at pool-MEMBERSHIP time, not just at final-sort time.
 *
 * Every "Produto A" below has an astronomically high demand/offerQuality
 * (1,000,000) and every "Produto B" filler has an astronomically high
 * blended `score` (simulating heavy commission weighting) but a tiny
 * demand/offerQuality (1) — values far outside any real component's
 * plausible range, so these assertions hold regardless of whatever real
 * or other-test data already exists in the shared dev database.
 */

const RUN_ID = `bias-guard-${Date.now()}`;
let shopeeMerchantId: string;
let mlMerchantId: string;
const listingIds: string[] = [];
const canonicalIds: string[] = [];

beforeAll(async () => {
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopee.id;
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = ml.id;
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

async function createShopeeListing(opts: {
  externalId: string;
  score: number;
  demand: number;
  offerQuality: number;
  commission: number;
}) {
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: opts.externalId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: `https://shopee.com.br/${opts.externalId}`,
      active: true,
    },
  });
  listingIds.push(listing.id);
  await prisma.monetizationScore.create({
    data: {
      merchantListingId: listing.id,
      score: opts.score,
      confidence: 0.9,
      components: {
        demand: { value: opts.demand, quality: "OBSERVED", detail: "test" },
        offerQuality: { value: opts.offerQuality, quality: "OBSERVED", detail: "test" },
        commission: { value: opts.commission, quality: "OBSERVED", detail: "test" },
      },
      reasons: [],
      missingSignals: [],
    },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: listing.id,
      merchantId: shopeeMerchantId,
      publicUrl: listing.productUrl,
      affiliateUrl: `https://s.shopee.com.br/afiliado/${opts.externalId}`,
      attributionTag: "precocaindo",
      source: "API",
      status: "ACTIVE",
    },
  });
  return listing;
}

describe("candidate pool membership is commission-free", () => {
  it(
    "getUnifiedMerchantOffers: a genuinely good product (high demand/offerQuality, low blended score) " +
      "is not excluded from the bounded pool by many high-commission fillers",
    async () => {
      // Produto A: exactly the scenario from the code review — great for
      // the consumer, but its blended score would be terrible under the
      // old ordering (no commission at all).
      const productA = await createShopeeListing({
        externalId: `${RUN_ID}-produto-a`,
        score: 1,
        demand: 1_000_000,
        offerQuality: 1_000_000,
        commission: 0,
      });

      // Produto B fillers: worse for the consumer, but a huge blended
      // score (as if commission alone drove it there) — enough of them
      // (> poolSize) to fully occupy a small bounded pool under the old,
      // commission-inclusive ordering.
      const FILLER_COUNT = 10; // > poolSize (5) computed below
      for (let i = 0; i < FILLER_COUNT; i++) {
        await createShopeeListing({
          externalId: `${RUN_ID}-produto-b-${i}`,
          score: 1_000_000,
          demand: 1,
          offerQuality: 1,
          commission: 1_000_000,
        });
      }

      // limit=1 -> candidatePoolSize = min(1*5, 200) = 5, well under
      // FILLER_COUNT. Under the old `orderBy: monetizationScore.score
      // desc` pool selection, all 5 slots would go to Produto B fillers
      // (score 1,000,000 >> Produto A's score of 1), excluding Produto A
      // entirely before the commission-free ranking ever ran.
      const offers = await getUnifiedMerchantOffers(1);

      expect(offers).toHaveLength(1);
      expect(offers[0].id).toBe(productA.id);
    },
  );

  it(
    "selectCandidateListingIds orders by demand+offerQuality, never by the blended (commission-inclusive) score",
    async () => {
      const productA = await createShopeeListing({
        externalId: `${RUN_ID}-unit-a`,
        score: 1,
        demand: 100,
        offerQuality: 100,
        commission: 0,
      });
      const productB = await createShopeeListing({
        externalId: `${RUN_ID}-unit-b`,
        score: 100,
        demand: 1,
        offerQuality: 1,
        commission: 100,
      });

      // Scoped to just these two rows via `ml.id = ANY(...)` — immune to
      // any other real or synthetic data in the shared dev database. This
      // is the exact function lib/queries/radar-events.ts's
      // collectShopeeEvents/collectMercadoLivreEvents also call for pool
      // selection, so this proves the fix for Radar's pool too, without
      // needing to win a live priority-ranking contest against unrelated
      // real events to prove it end-to-end.
      const ids = await selectCandidateListingIds(
        Prisma.sql`ml.id = ANY(${[productA.id, productB.id]})`,
        1,
      );

      expect(ids).toEqual([productA.id]);
      expect(ids).not.toContain(productB.id);
    },
  );
});

describe("best-offer-per-canonical-product selection is commission-free", () => {
  it("bestByNonCommissionSignal picks the higher demand/offerQuality sibling, not the higher-scored one", () => {
    const offerA = { canonicalProductId: "p1", id: "offer-a", nonCommission: 100 };
    const offerB = { canonicalProductId: "p1", id: "offer-b", nonCommission: 1 };

    const best = bestByNonCommissionSignal([offerB, offerA], (o) => o.nonCommission);

    expect(best.get("p1")?.id).toBe("offer-a");
  });

  it(
    "getUnifiedMerchantOffers (Mercado Livre): the ML card's price/opportunitySignal come from the " +
      "best-for-the-consumer sibling offer, not the highest-commission one",
    async () => {
      const canonical = await prisma.canonicalProduct.create({
        data: { slug: `${RUN_ID}-ml-canonical`, title: `Produto Guard ML ${RUN_ID}` },
      });
      canonicalIds.push(canonical.id);

      const catalogListing = await prisma.merchantListing.create({
        data: {
          merchantId: mlMerchantId,
          externalId: `${RUN_ID}-ml-catalog`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: `https://mercadolivre.com.br/${RUN_ID}/catalog`,
          canonicalProductId: canonical.id,
          active: true,
        },
      });
      listingIds.push(catalogListing.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: catalogListing.id,
          score: 1_000_000,
          confidence: 0.9,
          components: {
            demand: { value: 1_000_000, quality: "OBSERVED", detail: "test" },
            offerQuality: { value: 1_000_000, quality: "OBSERVED", detail: "test" },
          },
          reasons: [],
          missingSignals: [],
        },
      });
      await prisma.affiliateLinkRegistry.create({
        data: {
          merchantListingId: catalogListing.id,
          merchantId: mlMerchantId,
          publicUrl: catalogListing.productUrl,
          affiliateUrl: `https://mercadolivre.com/afiliado/${RUN_ID}`,
          attributionTag: "precocaindo",
          source: "MANUAL_ADMIN",
          status: "ACTIVE",
        },
      });

      // Offer A: the real best offer for the consumer (great demand/
      // offerQuality) but a low blended score.
      const offerA = await prisma.merchantListing.create({
        data: {
          merchantId: mlMerchantId,
          externalId: `${RUN_ID}-ml-offer-a`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: `https://mercadolivre.com.br/${RUN_ID}/offer-a`,
          canonicalProductId: canonical.id,
          active: true,
        },
      });
      listingIds.push(offerA.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: offerA.id,
          score: 1,
          confidence: 0.9,
          components: {
            demand: { value: 1_000_000, quality: "OBSERVED", detail: "test" },
            offerQuality: { value: 1_000_000, quality: "OBSERVED", detail: "test" },
            commission: { value: 0, quality: "OBSERVED", detail: "test" },
          },
          reasons: [],
          missingSignals: [],
        },
      });
      await prisma.merchantListingSignal.create({
        data: { merchantListingId: offerA.id, source: "mercado_livre_catalog_items", raw: { price: 50 } },
      });

      // Offer B: a high-commission offer that would have "won" under the
      // old (score-desc) selection despite being worse for the consumer.
      const offerB = await prisma.merchantListing.create({
        data: {
          merchantId: mlMerchantId,
          externalId: `${RUN_ID}-ml-offer-b`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: `https://mercadolivre.com.br/${RUN_ID}/offer-b`,
          canonicalProductId: canonical.id,
          active: true,
        },
      });
      listingIds.push(offerB.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: offerB.id,
          score: 1_000_000,
          confidence: 0.9,
          components: {
            demand: { value: 1, quality: "OBSERVED", detail: "test" },
            offerQuality: { value: 1, quality: "OBSERVED", detail: "test" },
            commission: { value: 1_000_000, quality: "OBSERVED", detail: "test" },
          },
          reasons: [],
          missingSignals: [],
        },
      });
      await prisma.merchantListingSignal.create({
        data: { merchantListingId: offerB.id, source: "mercado_livre_catalog_items", raw: { price: 999 } },
      });

      const offers = await getUnifiedMerchantOffers(24);
      const card = offers.find((o) => o.id === catalogListing.id);

      expect(card).toBeDefined();
      // nonCommissionSignal(offerA.components) = avg(1_000_000, 1_000_000) = 1_000_000
      expect(card?.opportunitySignal).toBe(1_000_000);
      expect(card?.currentPrice).toBe(50);
    },
  );
});
