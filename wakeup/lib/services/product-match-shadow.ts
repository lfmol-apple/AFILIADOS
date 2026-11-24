import { prisma } from "@/lib/db";
import { generateCandidatePairs, type MatchCandidateInput } from "./product-match-candidates";
import { buildMatchableListing } from "./product-match-input";
import { matchListings } from "./product-matcher";

/**
 * ProductMatcher Shadow Mode orchestrator (2026-09-08) — the piece that
 * actually connects lib/services/product-matcher.ts (pure, already
 * existed) to real, already-collected data. Reads MerchantListing +
 * CanonicalProduct + MerchantListingSignal (never calls an external API —
 * this only reasons over what ML_DEMAND/ML_ENRICHMENT/SHOPEE_REFRESH
 * already persisted), generates conservative candidate pairs
 * (product-match-candidates.ts), and persists every decision to
 * ProductMatchEvidence.
 *
 * SHADOW ONLY (project brief, explicit and absolute for this phase):
 * MerchantListing.canonicalProductId is NEVER written here, not even for
 * a CONFIRMED result. Mercado Livre's existing pipeline already uses
 * canonicalProductId to group listings for the public
 * getUnifiedMerchantOffers()/search/Radar surfaces (lib/queries/
 * unified-offers.ts) — writing a new cross-merchant grouping into that
 * same column would risk changing what /ofertas or search renders today,
 * which this phase must never do. Every match this run finds lives only
 * in ProductMatchEvidence, readable by a human/future phase, invisible to
 * every public query.
 *
 * Idempotent: (listingAId, listingBId) is always written in the same
 * lexicographic order regardless of which side matchListings() called
 * "a" or "b" (ProductMatchEvidence's real `@@unique([listingAId,
 * listingBId])` constraint only dedupes one specific order — without this
 * normalization, a rerun with the two listings visited in the opposite
 * order would create a second, reversed-duplicate row for the same real
 * pair). Upserted by that key, so a rerun updates confidence/evidence
 * in place rather than duplicating it.
 */
export interface ProductMatchShadowResult {
  eligibleListings: number;
  eligibleMlRepresentatives: number;
  eligibleShopeeListings: number;
  candidatePairsConsidered: number;
  evidenceProduced: number;
  confirmed: number;
  candidate: number;
  crossMerchant: number;
  intraMerchant: number;
  noMatch: number;
}

type MlListingRow = {
  id: string;
  externalId: string;
  canonicalProductId: string | null;
  canonicalProduct: {
    title: string;
    brand: string | null;
    model: string | null;
    gtin: string | null;
    specifications: unknown;
  } | null;
};

export async function runProductMatcherShadow(): Promise<ProductMatchShadowResult> {
  const [mlListings, shopeeListings] = await Promise.all([
    prisma.merchantListing.findMany({
      where: { merchant: { code: "MERCADO_LIVRE" }, active: true, canonicalProductId: { not: null } },
      select: {
        id: true,
        externalId: true,
        canonicalProductId: true,
        canonicalProduct: { select: { title: true, brand: true, model: true, gtin: true, specifications: true } },
      },
    }),
    prisma.merchantListing.findMany({
      where: { merchant: { code: "SHOPEE" }, active: true },
      select: {
        id: true,
        signals: {
          where: { source: "shopee_product_offer_v2" },
          orderBy: { observedAt: "desc" },
          take: 1,
          select: { raw: true },
        },
      },
    }),
  ]);

  // One representative per distinct ML canonical product (project brief
  // section 7: don't waste processing proving 17 near-identical real
  // offers of the same catalog product are "the same product" — that's
  // already true by construction, via the shared canonicalProductId).
  // Prefers the catalog-level row itself (externalId ===
  // specifications.catalogProductId, the same identification technique
  // already used in lib/queries/ml-affiliate-queue.ts); falls back to the
  // lowest listing id in the group, deterministic across reruns.
  const byCanonical = new Map<string, MlListingRow[]>();
  for (const l of mlListings as MlListingRow[]) {
    const key = l.canonicalProductId!;
    (byCanonical.get(key) ?? byCanonical.set(key, []).get(key)!).push(l);
  }
  const mlRepresentatives = [...byCanonical.values()].map((group) => {
    const catalogProductId = (group[0]!.canonicalProduct?.specifications as
      | { catalogProductId?: string }
      | null
      | undefined)?.catalogProductId;
    const catalogRow = group.find((l) => l.externalId === catalogProductId);
    return catalogRow ?? [...group].sort((a, b) => a.id.localeCompare(b.id))[0]!;
  });

  const shopeeEligible = shopeeListings.filter((l) => l.signals.length > 0);

  const inputs: MatchCandidateInput[] = [];
  for (const l of mlRepresentatives) {
    const matchable = buildMatchableListing({
      id: l.id,
      canonicalProduct: l.canonicalProduct,
      shopeeTitle: null,
    });
    if (matchable) inputs.push({ ...matchable, group: "MERCADO_LIVRE" });
  }
  for (const l of shopeeEligible) {
    const raw = l.signals[0]!.raw as { productName?: string } | null;
    const matchable = buildMatchableListing({
      id: l.id,
      canonicalProduct: null,
      shopeeTitle: raw?.productName ?? null,
    });
    if (matchable) inputs.push({ ...matchable, group: "SHOPEE" });
  }

  const candidatePairs = generateCandidatePairs(inputs);

  let confirmed = 0;
  let candidate = 0;
  let crossMerchant = 0;
  let intraMerchant = 0;
  let noMatch = 0;

  for (const pair of candidatePairs) {
    const result = matchListings(pair.a, pair.b);
    if (!result) {
      noMatch++;
      continue;
    }

    if (pair.a.group !== pair.b.group) crossMerchant++;
    else intraMerchant++;
    if (result.status === "CONFIRMED") confirmed++;
    else candidate++;

    const [listingAId, listingBId] = [result.listingAId, result.listingBId].sort();
    await prisma.productMatchEvidence.upsert({
      where: { listingAId_listingBId: { listingAId, listingBId } },
      create: {
        listingAId,
        listingBId,
        method: result.method,
        confidence: result.confidence,
        status: result.status,
        evidence: result.evidence as unknown as object,
      },
      update: {
        method: result.method,
        confidence: result.confidence,
        status: result.status,
        evidence: result.evidence as unknown as object,
      },
    });
  }

  return {
    eligibleListings: inputs.length,
    eligibleMlRepresentatives: mlRepresentatives.length,
    eligibleShopeeListings: shopeeEligible.length,
    candidatePairsConsidered: candidatePairs.length,
    evidenceProduced: confirmed + candidate,
    confirmed,
    candidate,
    crossMerchant,
    intraMerchant,
    noMatch,
  };
}
