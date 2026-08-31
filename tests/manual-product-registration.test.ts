import { describe, expect, it, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { registerManualVerifiedProduct } from "@/lib/services/manual-product-registration";
import { promoteCandidateToProduct } from "@/lib/services/candidate-promotion";

/**
 * Dry-run proof (project brief Sprint 7 section 6) that, once a real ASIN
 * + marketplace + editorial content are supplied, the system can create a
 * Product -> MANUAL_VERIFIED -> draft, and that its /go/amazon/[asin] link
 * would be built automatically with the correct tracking tag — all without
 * ever touching production data. No fake product is left behind: every
 * fixture created here uses a __test- prefixed ASIN/slug and is deleted in
 * afterAll.
 */

const CATEGORY_SLUG = "__test-manual-registration-category__";
const ASIN_A = "TSTASINA01";
const ASIN_B = "TSTASINB02";
const ASIN_NO_TAG = "TSTASIND04";
const ASIN_CANDIDATE = "TSTASINC03";

let categoryId: string;
const createdProductIds: string[] = [];

async function cleanupCandidate(asin: string) {
  await prisma.productCandidate.deleteMany({ where: { asin } });
}

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await cleanupCandidate(ASIN_CANDIDATE);
  await prisma.category.deleteMany({ where: { id: categoryId } });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("registerManualVerifiedProduct", () => {
  it("sets up a real category fixture", async () => {
    const category = await prisma.category.upsert({
      where: { slug: CATEGORY_SLUG },
      create: { name: "Test Manual Registration Category", slug: CATEGORY_SLUG },
      update: {},
    });
    categoryId = category.id;
    expect(categoryId).toBeTruthy();
  });

  it("rejects a missing description (never fill it in silently)", async () => {
    const result = await registerManualVerifiedProduct({
      asin: ASIN_A,
      marketplace: "BR",
      title: "Produto de teste",
      description: "",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MISSING_FIELD");
  });

  it("rejects an unknown marketplace code", async () => {
    const result = await registerManualVerifiedProduct({
      asin: ASIN_A,
      marketplace: "XX",
      title: "Produto de teste",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_MARKETPLACE");
  });

  it("rejects a marketplace that isn't enabled (US, by default)", async () => {
    const result = await registerManualVerifiedProduct({
      asin: ASIN_A,
      marketplace: "US",
      title: "Produto de teste",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MARKETPLACE_NOT_ENABLED");
  });

  it("rejects an invalid ASIN", async () => {
    const result = await registerManualVerifiedProduct({
      asin: "not-an-asin",
      marketplace: "BR",
      title: "Produto de teste",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_ASIN");
  });

  it("rejects an unknown category and lists the available ones", async () => {
    const result = await registerManualVerifiedProduct({
      asin: ASIN_A,
      marketplace: "BR",
      title: "Produto de teste",
      description: "Conteúdo editorial de teste.",
      categorySlug: "__does-not-exist__",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.code === "CATEGORY_NOT_FOUND") {
      expect(Array.isArray(result.error.availableCategorySlugs)).toBe(true);
    } else {
      throw new Error("expected CATEGORY_NOT_FOUND");
    }
  });

  it("creates a draft, MANUAL_VERIFIED Product end-to-end and previews the correct affiliate URL when a tracking tag is confirmed", async () => {
    // The real AMAZON_BR_ASSOCIATE_TAG is intentionally empty until a human
    // reconfirms the current Amazon application — never assume it's set.
    // This test explicitly stubs a fake, clearly-test-only tag rather than
    // relying on the ambient .env, exactly like tests/amazon-cta.test.tsx
    // and tests/amazon-policy-guard.test.ts already do.
    vi.resetModules();
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "test-preview-tag-20");
    const { registerManualVerifiedProduct: registerWithTag } = await import(
      "@/lib/services/manual-product-registration"
    );
    const { prisma: freshPrisma } = await import("@/lib/db");

    const result = await registerWithTag({
      asin: ASIN_A,
      marketplace: "BR",
      title: "Produto de teste do dry-run",
      description: "Conteúdo editorial de teste, nunca copiado da Amazon.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    createdProductIds.push(result.product.id);

    const stored = await freshPrisma.product.findUnique({ where: { id: result.product.id } });
    expect(stored?.dataSource).toBe("MANUAL_VERIFIED");
    expect(stored?.active).toBe(false);
    expect(stored?.asin).toBe(ASIN_A);
    expect(stored?.categoryId).toBe(categoryId);

    // Never stored on Product/Offer — proves the same automatic construction
    // /go/amazon/[asin] uses, without a manual per-product affiliate link.
    expect(result.affiliateUrlPreview).toContain("amazon.com.br");
    expect(result.affiliateUrlPreview).toContain(`/dp/${ASIN_A}`);
    expect(result.affiliateUrlPreview).toMatch(/tag=test-preview-tag-20/);
  });

  it("returns a null affiliate URL preview (never a fabricated/malformed link) when no tracking tag is confirmed yet", async () => {
    vi.resetModules();
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");
    const { registerManualVerifiedProduct: registerWithoutTag } = await import(
      "@/lib/services/manual-product-registration"
    );

    const result = await registerWithoutTag({
      asin: ASIN_NO_TAG,
      marketplace: "BR",
      title: "Produto de teste sem tag confirmada",
      description: "Conteúdo editorial de teste, nunca copiado da Amazon.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    createdProductIds.push(result.product.id);
    expect(result.affiliateUrlPreview).toBeNull();
  });

  it("refuses to create a second Product for the same ASIN/marketplace", async () => {
    const result = await registerManualVerifiedProduct({
      asin: ASIN_A,
      marketplace: "BR",
      title: "Duplicado",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ALREADY_EXISTS");
  });

  it("never accepts a price, rating, or affiliate URL as input — the type doesn't expose those fields", async () => {
    const result = await registerManualVerifiedProduct({
      asin: ASIN_B,
      marketplace: "BR",
      title: "Produto sem campos comerciais fabricados",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
      // @ts-expect-error -- price is intentionally not part of ManualProductInput
      price: 199.9,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      createdProductIds.push(result.product.id);
      const stored = await prisma.product.findUnique({
        where: { id: result.product.id },
        include: { offers: true },
      });
      expect(stored?.offers).toEqual([]);
      expect(stored?.rating).toBeNull();
    }
  });
});

describe("promoteCandidateToProduct", () => {
  it("rejects promoting an ASIN with no matching candidate", async () => {
    const result = await promoteCandidateToProduct({
      asin: ASIN_CANDIDATE,
      marketplace: "BR",
      title: "Título final",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CANDIDATE_NOT_FOUND");
  });

  it("promotes a real candidate end-to-end: Product created, candidate marked PROMOTED", async () => {
    const candidate = await prisma.productCandidate.create({
      data: {
        asin: ASIN_CANDIDATE,
        marketplace: "BR",
        workingTitle: "Candidato de teste do dry-run",
        rationale: "Apenas para validar o fluxo de promoção automaticamente.",
      },
    });

    const result = await promoteCandidateToProduct({
      asin: ASIN_CANDIDATE,
      marketplace: "BR",
      title: "Título editorial final",
      description: "Conteúdo editorial de teste, revisado manualmente.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    createdProductIds.push(result.product.id);

    const updatedCandidate = await prisma.productCandidate.findUnique({ where: { id: candidate.id } });
    expect(updatedCandidate?.status).toBe("PROMOTED");
    expect(updatedCandidate?.productId).toBe(result.product.id);

    const product = await prisma.product.findUnique({ where: { id: result.product.id } });
    expect(product?.dataSource).toBe("MANUAL_VERIFIED");
    expect(product?.active).toBe(false);
  });

  it("refuses to re-promote an already-promoted candidate", async () => {
    const result = await promoteCandidateToProduct({
      asin: ASIN_CANDIDATE,
      marketplace: "BR",
      title: "Título editorial final",
      description: "Conteúdo editorial de teste.",
      categorySlug: CATEGORY_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ALREADY_PROMOTED");
  });
});
