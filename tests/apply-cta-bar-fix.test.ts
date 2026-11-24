import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db";
import { promoteCorrectedCreative } from "@/scripts/apply-cta-bar-fix";

/**
 * Owner's directive, 2026-11-24 ("Verificações finais", item 4): proves
 * the real mechanism that promotes an already-corrected local CTA-bar
 * file into the real versioned creative path — the thing the live XML
 * feed (app/catalogo/mercado-livre.xml/route.ts) actually reads from.
 * Runs entirely against the local test DB and a scratch directory this
 * test owns; never touches production, never calls an AI model.
 */
const TEST_PREFIX = "apply-cta-fix-test-";

describe("promoteCorrectedCreative — real promotion mechanism (local dev DB)", () => {
  let correctedDir: string;
  let creativeDir: string;

  beforeEach(() => {
    correctedDir = mkdtempSync(path.join(tmpdir(), "cta-fix-corrected-"));
    creativeDir = mkdtempSync(path.join(tmpdir(), "cta-fix-creative-store-"));
    vi.stubEnv("VITRINE_CREATIVE_DIR", creativeDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    rmSync(correctedDir, { recursive: true, force: true });
    rmSync(creativeDir, { recursive: true, force: true });
    await prisma.vitrineCreative.deleteMany({ where: { merchantListingId: { startsWith: TEST_PREFIX } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
  });

  async function seedListingWithCreative(suffix: string, version: number) {
    const merchant = await prisma.merchant.upsert({
      where: { code: "MERCADO_LIVRE" },
      create: { code: "MERCADO_LIVRE", name: "Mercado Livre" },
      update: {},
    });
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: merchant.id,
        externalId: `${TEST_PREFIX}${suffix}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: `https://example.com/${suffix}`,
        source: "MANUAL_VERIFIED",
      },
    });
    await prisma.vitrineCreative.create({
      data: {
        merchantListingId: listing.id,
        kind: "ad_overlay",
        version,
        originalPhotoUrl: "https://example.com/original.jpg",
        aiBaseImageUrl: "ai-base-v1.png",
        finalImageUrl: `https://example.com/old-v${version}.png`,
        promptInputs: {},
        model: "test-fixture",
        qualityStatus: "approved",
        publishedAt: new Date(),
      },
    });
    return listing;
  }

  it("promotes a corrected file: unpublishes the old row, creates a new versioned+published row with a new URL", async () => {
    const listing = await seedListingWithCreative("promote", 3);
    writeFileSync(path.join(correctedDir, `${listing.id}-v4.png`), Buffer.from("fake-png-bytes"));

    const result = await promoteCorrectedCreative(
      { gid: listing.id, title: "Produto teste", version: 3, verdict: "cta_cortado" },
      { correctedDir, commit: true },
    );

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") throw new Error("unreachable");
    expect(result.fromVersion).toBe(3);
    expect(result.toVersion).toBe(4);

    const rows = await prisma.vitrineCreative.findMany({
      where: { merchantListingId: listing.id, kind: "ad_overlay" },
      orderBy: { version: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].version).toBe(3);
    expect(rows[0].publishedAt).toBeNull(); // old row unpublished, never deleted (real rollback safety net preserved)
    expect(rows[1].version).toBe(4);
    expect(rows[1].publishedAt).not.toBeNull();
    expect(rows[1].finalImageUrl).not.toBe(rows[0].finalImageUrl); // real new URL — this is what defeats Meta's image cache
    expect(rows[1].finalImageUrl).toContain(`${listing.id}-ad_overlay-v4`);
    expect(rows[1].costUsd?.toNumber()).toBe(0); // no new AI call
  });

  it("dry-run mode (commit=false) never writes to the database", async () => {
    const listing = await seedListingWithCreative("dryrun", 3);
    writeFileSync(path.join(correctedDir, `${listing.id}-v4.png`), Buffer.from("fake-png-bytes"));

    const result = await promoteCorrectedCreative(
      { gid: listing.id, title: "Produto teste", version: 3, verdict: "cta_cortado" },
      { correctedDir, commit: false },
    );

    expect(result.outcome).toBe("dry_run");
    const rows = await prisma.vitrineCreative.findMany({ where: { merchantListingId: listing.id, kind: "ad_overlay" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].version).toBe(3);
    expect(rows[0].publishedAt).not.toBeNull(); // untouched
  });

  it("never promotes when the DB's real current version no longer matches the classification snapshot", async () => {
    const listing = await seedListingWithCreative("stale-snapshot", 5); // DB has moved on to v5 since classification was built
    writeFileSync(path.join(correctedDir, `${listing.id}-v4.png`), Buffer.from("fake-png-bytes"));

    const result = await promoteCorrectedCreative(
      { gid: listing.id, title: "Produto teste", version: 3, verdict: "cta_cortado" }, // classification still thinks it's v3
      { correctedDir, commit: true },
    );

    expect(result.outcome).toBe("skipped_version_mismatch");
    const rows = await prisma.vitrineCreative.findMany({ where: { merchantListingId: listing.id, kind: "ad_overlay" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].version).toBe(5); // untouched
  });

  it("never promotes when the corrected file is missing", async () => {
    const listing = await seedListingWithCreative("missing-file", 3);
    // Deliberately no file written to correctedDir.

    const result = await promoteCorrectedCreative(
      { gid: listing.id, title: "Produto teste", version: 3, verdict: "cta_cortado" },
      { correctedDir, commit: true },
    );

    expect(result.outcome).toBe("skipped_missing_file");
  });
});
