import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createVitrine, DuplicateAttributionTagError, LEGACY_VITRINE_SLUG } from "@/lib/services/vitrine-manager";
import { saveVitrineLink } from "@/lib/services/affiliate-link-registry";

/**
 * Owner's directive, 2026-11-25 ("investigue e corrija imediatamente o
 * problema do attributionTag, pois esse campo é estratégico para a
 * implantação da segunda vitrine e para a separação comercial entre
 * vitrines"). Real root cause (confirmed by reproducing on `main` before
 * any change here): the local dev database's "Vitrine" table had an
 * `attributionTag` column, added by an undocumented `prisma db push` at
 * some earlier point, that existed in NEITHER schema.prisma NOR any
 * committed migration — production's own table never had it at all
 * (confirmed by reading it directly, read-only, over SSH). The fix:
 * migration 20261125120000_vitrine_attribution_tag properly adds the
 * column (nullable → backfill the one real "Vitrine Geral" row with its
 * existing "vitrinedinamica" tag → NOT NULL + unique), and
 * createVitrine() now requires and persists it for real.
 */

const TEST_PREFIX = "vattr-test-";

function testVitrineInput(suffix: string, attributionTag?: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    slug: `${TEST_PREFIX}${suffix}-${unique}`,
    name: `Vitrine ${suffix} (teste)`,
    attributionTag: attributionTag ?? `${TEST_PREFIX}attr-${suffix}-${unique}`,
  };
}

describe("Vitrine.attributionTag — real database integration (local dev DB)", () => {
  afterEach(async () => {
    await prisma.vitrine.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("creates a new vitrine with its own real attributionTag", async () => {
    const input = testVitrineInput("nova");
    const vitrine = await createVitrine(input);
    expect(vitrine.attributionTag).toBe(input.attributionTag);

    const reloaded = await prisma.vitrine.findUniqueOrThrow({ where: { id: vitrine.id } });
    expect(reloaded.attributionTag).toBe(input.attributionTag);
  });

  it("preserves the ORIGINAL vitrine's attributionTag exactly as 'vitrinedinamica' — never touched by this fix", async () => {
    const legacy = await prisma.vitrine.findUniqueOrThrow({ where: { slug: LEGACY_VITRINE_SLUG } });
    expect(legacy.attributionTag).toBe("vitrinedinamica");
  });

  it("creating two vitrines simultaneously with distinct tags never collides (real concurrent writes, not sequential)", async () => {
    const inputA = testVitrineInput("sim-a");
    const inputB = testVitrineInput("sim-b");
    const [a, b] = await Promise.all([createVitrine(inputA), createVitrine(inputB)]);
    expect(a.attributionTag).toBe(inputA.attributionTag);
    expect(b.attributionTag).toBe(inputB.attributionTag);
    expect(a.attributionTag).not.toBe(b.attributionTag);
  });

  it("prevents a duplicate attributionTag across two different vitrines — the real unique index decides, not application logic", async () => {
    const sharedTag = `${TEST_PREFIX}dup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const first = await createVitrine(testVitrineInput("dup-first", sharedTag));
    expect(first.attributionTag).toBe(sharedTag);

    await expect(createVitrine(testVitrineInput("dup-second", sharedTag))).rejects.toBeInstanceOf(DuplicateAttributionTagError);

    // The first vitrine's row must be completely untouched by the failed attempt.
    const stillThere = await prisma.vitrine.findUniqueOrThrow({ where: { id: first.id } });
    expect(stillThere.attributionTag).toBe(sharedTag);
  });

  it("two DIFFERENT real vitrines can coexist with two different tags — isolation, not a global singleton", async () => {
    const a = await createVitrine(testVitrineInput("iso-a"));
    const b = await createVitrine(testVitrineInput("iso-b"));
    const rows = await prisma.vitrine.findMany({ where: { id: { in: [a.id, b.id] } } });
    const tags = rows.map((r) => r.attributionTag).sort();
    expect(tags).toEqual([a.attributionTag, b.attributionTag].sort());
  });

  it("documents the real current boundary: VitrineLink's own tag is NOT yet wired to Vitrine.attributionTag", async () => {
    // Owner's directive, 2026-11-25, asked this investigated explicitly
    // ("rastreamento de cliques... integração com a segunda vitrine").
    // lib/services/affiliate-link-registry.ts's saveVitrineLink() still
    // hardcodes "vitrinedinamica" for every VitrineLink row regardless of
    // which Vitrine currently holds the listing ACTIVE — VitrineLink has
    // no vitrineId at all yet. This is deliberately NOT fixed in this PR
    // (a second vitrine's clicks are not yet commercially distinguishable
    // in practice — see this file's own header comment and the PR
    // description for the recommended next step). This test exists so
    // that gap is a visible, intentional boundary — not a silent
    // assumption — and breaks loudly the day someone wires it without
    // updating this test.
    const merchant = await prisma.merchant.upsert({
      where: { code: "MERCADO_LIVRE" },
      create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
      update: {},
    });
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: merchant.id,
        externalId: `${TEST_PREFIX}ext-${Date.now()}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://example.com/attribution-boundary-fixture",
      },
    });
    const secondVitrine = await createVitrine(testVitrineInput("boundary"));
    expect(secondVitrine.attributionTag).not.toBe("vitrinedinamica");

    const link = await saveVitrineLink({
      merchantListingId: listing.id,
      merchantId: merchant.id,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: listing.productUrl,
      affiliateUrl: "https://mercadolivre.com/sec/attribution-boundary-fixture",
    });
    // Current, pre-wiring behavior — a listing claimed by the SECOND
    // vitrine's selection still gets the FIRST vitrine's literal tag.
    expect(link.attributionTag).toBe("vitrinedinamica");

    await prisma.vitrineLink.deleteMany({ where: { merchantListingId: listing.id } });
    await prisma.merchantListing.deleteMany({ where: { id: listing.id } });
  });
});
