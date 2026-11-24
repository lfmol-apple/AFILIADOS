import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOneShotPrompt,
  isBakedPriceStale,
  shouldRegenerateAdOverlay,
  shouldAttemptPriceRegenerationNow,
  shouldSkipDueToRejectionCooldown,
  promptFieldChanged,
  prioritizeRegenerationCandidates,
  ONE_SHOT_MECHANISM_TAG,
} from "@/lib/services/ai-creative-factory/one-shot-ad-generator";

/**
 * Owner's directive, 2026-11-21 ("implemente testes automatizados,
 * gratuitos e sem rede, verificando a seleção do mecanismo, a
 * preservação das informações reais do produto, a separação dos
 * formatos e os bloqueios financeiros"). Every test here is a pure
 * function call or a mocked fetch — zero network, zero cost.
 *
 * Real root cause found in CI, 2026-11-21 (PR #17 review): two tests
 * below pointed VITRINE_HENRIQUE_STYLE_REFERENCE_PATH at the REAL bundled
 * Henrique reference art (lib/services/ai-creative-factory/assets/
 * henrique-style-reference.png) — correctly gitignored (owner's rule:
 * never commit the original art), so it only existed on a machine that
 * had manually placed it there, never on a fresh CI checkout. Fixed by
 * pointing those tests at tests/fixtures/one-shot-style-reference.synthetic.png
 * instead — a throwaway 1x1 PNG committed ONLY to prove the gates
 * (financial mode, migration allowlist/call-count) fire correctly once a
 * reference file exists, never to assert anything about its visual
 * content. Production's own default path (env.ts) is untouched — the
 * real art still loads from the real, gitignored path in every real
 * environment; only these tests' stubbed env var changed.
 */

describe("buildOneShotPrompt — preserves real product information, never invents", () => {
  it("includes the real title, brand, and real confirmed benefits", () => {
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Pistola de pulverização elétrica Tssaper TP550",
      brand: "Tssaper",
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 228.9,
      referencePrice: 376.7,
      hasConfirmedDiscount: true,
      benefits: ["550W DE POTÊNCIA", "RESERVATÓRIO 800ML"],
    });
    expect(prompt).toContain("Pistola de pulverização elétrica Tssaper TP550");
    expect(prompt).toContain("marca Tssaper");
    expect(prompt).toContain("550W DE POTÊNCIA");
    expect(prompt).toContain("RESERVATÓRIO 800ML");
  });

  it("includes the real crossed-out reference price only when a discount is actually confirmed", () => {
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Produto X",
      brand: null,
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 100,
      referencePrice: 150,
      hasConfirmedDiscount: true,
      benefits: [],
    });
    expect(prompt).toContain("R$ 100,00");
    expect(prompt).toContain("R$ 150,00");
  });

  it("never fabricates a crossed-out price when no discount is confirmed, and loudly warns against inventing one", () => {
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Produto Y",
      brand: null,
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 72.9,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });
    expect(prompt).toContain("R$ 72,90");
    // Scoped to the actual price-badge bullet line, not the whole prompt —
    // the new critical warning paragraph legitimately mentions the literal
    // placeholder text 'de R$X' as an example of what NOT to draw, which
    // would otherwise false-positive a broader whole-prompt regex.
    const priceLine = prompt.split("\n").find((line) => line.includes("Selo de preço"));
    expect(priceLine).not.toMatch(/de R\$\d/);
    // Real failure, 2026-11-24: a single mid-list bullet wasn't enough to
    // stop the model inventing a discount badge — this is the loud,
    // standalone warning that replaced/reinforced it.
    expect(prompt).toContain("AVISO CRÍTICO — ESTE PRODUTO NÃO TEM DESCONTO");
    expect(prompt).toContain('NENHUM selo "% OFF"');
  });

  it("includes NO discount warning at all when a real discount IS confirmed", () => {
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Produto Y2",
      brand: null,
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 72.9,
      referencePrice: 100,
      hasConfirmedDiscount: true,
      benefits: [],
    });
    expect(prompt).not.toContain("AVISO CRÍTICO — ESTE PRODUTO NÃO TEM DESCONTO");
  });

  it("never fabricates a benefit icon when no real benefit was extracted", () => {
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Produto Z",
      brand: null,
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 10,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });
    expect(prompt).toContain("Não inclua ícones de benefício");
    expect(prompt).toContain("não invente um");
  });

  it("always forbids inventing rating, sold quantity, and extra objects", () => {
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Produto W",
      brand: null,
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 10,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });
    expect(prompt).toContain("NÃO inclua nenhuma menção a nota ou vendas");
    expect(prompt).toContain("Não adicione nenhum objeto");
  });

  it("requires the CTA bar to fully fit both lines of logo and button text, never asks for an empty margin below it", () => {
    // Real root cause, 2026-11-24 (corrected twice): the bar touching the
    // bottom edge is the CORRECT, approved style (confirmed by direct
    // comparison against the real Henrique reference) — the actual
    // defect was content (the second text line) getting clipped because
    // the bar wasn't sized to fit it. An earlier fix (commit 405fd17)
    // wrongly diagnosed this as a missing-margin problem and asked for
    // empty space instead, which a real production test confirmed did
    // NOT fix anything. This asserts the corrected, fit-based instruction
    // is present and that no "leave an empty margin" framing remains.
    const prompt = buildOneShotPrompt({
      externalId: "MLB-TEST",
      title: "Produto V",
      brand: null,
      productPhoto: Buffer.alloc(0),
      productPhotoContentType: "image/jpeg",
      currentPrice: 10,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });
    expect(prompt).toContain("DUAS linhas do logotipo do Mercado Livre");
    expect(prompt).toContain("DUAS linhas do texto do botão");
    expect(prompt).toContain("encostada na borda de baixo é o padrão correto e esperado");
    expect(prompt).not.toMatch(/margem (vazia|real)/);
    expect(prompt).not.toContain("espaço vazio");
  });
});

describe("promptFieldChanged — treats a never-recorded field as unknown, never as 'changed'", () => {
  it("is false when the field was never recorded (undefined), regardless of the current value", () => {
    expect(promptFieldChanged(undefined, null)).toBe(false);
    expect(promptFieldChanged(undefined, "Black Friday")).toBe(false);
    expect(promptFieldChanged(undefined, undefined)).toBe(false);
  });

  it("is false when the recorded value matches the current value", () => {
    expect(promptFieldChanged("eletronicos", "eletronicos")).toBe(false);
    expect(promptFieldChanged(null, null)).toBe(false);
  });

  it("is true only when a previously-RECORDED value genuinely differs", () => {
    expect(promptFieldChanged("Natal", "Black Friday")).toBe(true);
    expect(promptFieldChanged(null, "Black Friday")).toBe(true);
    expect(promptFieldChanged("Natal", null)).toBe(true);
  });
});

describe("shouldSkipDueToRejectionCooldown — stops burning money on a creative that keeps failing", () => {
  const now = new Date("2026-11-24T12:00:00Z");

  it("never blocks when there are fewer attempts than the consecutive-rejection threshold", () => {
    expect(
      shouldSkipDueToRejectionCooldown({
        recentAttempts: [{ qualityStatus: "rejected", generatedAt: now }],
        maxConsecutive: 2,
        cooldownHours: 24,
        now,
      }),
    ).toBe(false);
  });

  it("never blocks when the streak includes an approved attempt", () => {
    expect(
      shouldSkipDueToRejectionCooldown({
        recentAttempts: [
          { qualityStatus: "rejected", generatedAt: now },
          { qualityStatus: "approved", generatedAt: new Date("2026-11-23T12:00:00Z") },
        ],
        maxConsecutive: 2,
        cooldownHours: 24,
        now,
      }),
    ).toBe(false);
  });

  it("blocks once the consecutive-rejection streak is reached and the cooldown window hasn't elapsed", () => {
    expect(
      shouldSkipDueToRejectionCooldown({
        recentAttempts: [
          { qualityStatus: "rejected", generatedAt: now },
          { qualityStatus: "rejected", generatedAt: new Date("2026-11-24T01:00:00Z") },
        ],
        maxConsecutive: 2,
        cooldownHours: 24,
        now,
      }),
    ).toBe(true);
  });

  it("allows another attempt once the cooldown window has fully elapsed since the last attempt", () => {
    expect(
      shouldSkipDueToRejectionCooldown({
        recentAttempts: [
          { qualityStatus: "rejected", generatedAt: new Date("2026-11-22T00:00:00Z") }, // 60h before `now`
          { qualityStatus: "rejected", generatedAt: new Date("2026-11-21T00:00:00Z") },
        ],
        maxConsecutive: 2,
        cooldownHours: 24,
        now,
      }),
    ).toBe(false);
  });
});

describe("isBakedPriceStale — never silently overlays a new price on an old baked image", () => {
  it("is not stale when nothing changed", () => {
    expect(
      isBakedPriceStale({ bakedCurrentPrice: 100, bakedReferencePrice: 150, liveCurrentPrice: 100, liveReferencePrice: 150 }),
    ).toBe(false);
  });

  it("is stale when the current price changed", () => {
    expect(
      isBakedPriceStale({ bakedCurrentPrice: 100, bakedReferencePrice: 150, liveCurrentPrice: 90, liveReferencePrice: 150 }),
    ).toBe(true);
  });

  it("is stale when the reference price changed (e.g. a discount was confirmed afterwards)", () => {
    expect(
      isBakedPriceStale({ bakedCurrentPrice: 100, bakedReferencePrice: null, liveCurrentPrice: 100, liveReferencePrice: 150 }),
    ).toBe(true);
  });
});

describe("shouldAttemptPriceRegenerationNow — throttles the PAID attempt, never the safety unpublish", () => {
  it("allows an attempt when there has never been one", () => {
    expect(shouldAttemptPriceRegenerationNow({ lastAttemptAt: null, now: new Date("2026-11-21T12:00:00Z"), minIntervalHours: 24 })).toBe(true);
  });

  it("blocks an attempt made less than the minimum interval ago", () => {
    expect(
      shouldAttemptPriceRegenerationNow({
        lastAttemptAt: new Date("2026-11-21T00:00:00Z"),
        now: new Date("2026-11-21T12:00:00Z"), // 12h later
        minIntervalHours: 24,
      }),
    ).toBe(false);
  });

  it("allows an attempt once the minimum interval has fully elapsed", () => {
    expect(
      shouldAttemptPriceRegenerationNow({
        lastAttemptAt: new Date("2026-11-20T00:00:00Z"),
        now: new Date("2026-11-21T12:00:00Z"), // 36h later
        minIntervalHours: 24,
      }),
    ).toBe(true);
  });
});

describe("prioritizeRegenerationCandidates — commercial priority, deterministic", () => {
  it("picks the highest-score candidates first, up to the cap", () => {
    const result = prioritizeRegenerationCandidates(
      [
        { merchantListingId: "low", score: 10 },
        { merchantListingId: "high", score: 90 },
        { merchantListingId: "mid", score: 50 },
      ],
      2,
    );
    expect(result.map((r) => r.merchantListingId)).toEqual(["high", "mid"]);
  });

  it("keeps original order for tied scores (stable sort, no arbitrary reshuffling)", () => {
    const result = prioritizeRegenerationCandidates(
      [
        { merchantListingId: "a", score: 50 },
        { merchantListingId: "b", score: 50 },
      ],
      2,
    );
    expect(result.map((r) => r.merchantListingId)).toEqual(["a", "b"]);
  });

  it("never returns more than maxCount even with many eligible candidates", () => {
    const candidates = Array.from({ length: 30 }, (_, i) => ({ merchantListingId: `p${i}`, score: i }));
    expect(prioritizeRegenerationCandidates(candidates, 3)).toHaveLength(3);
  });
});

describe("shouldRegenerateAdOverlay — mechanism selection, the exact thing that must never silently regress", () => {
  const base = {
    hasExistingRow: true,
    existingQualityStatus: "approved" as const,
    existingMechanism: ONE_SHOT_MECHANISM_TAG,
    categoryChanged: false,
    eventChanged: false,
    priceStale: false,
  };

  it("regenerates when there is no existing row at all", () => {
    expect(shouldRegenerateAdOverlay({ ...base, hasExistingRow: false })).toBe(true);
  });

  it("regenerates when the existing row was rejected", () => {
    expect(shouldRegenerateAdOverlay({ ...base, existingQualityStatus: "rejected" })).toBe(true);
  });

  it("ALWAYS regenerates a legacy row (old hybrid compositor mechanism, or unknown) — this is the regression guard", () => {
    expect(shouldRegenerateAdOverlay({ ...base, existingMechanism: null })).toBe(true);
    expect(shouldRegenerateAdOverlay({ ...base, existingMechanism: "hybrid_legacy" })).toBe(true);
  });

  it("regenerates when category changed", () => {
    expect(shouldRegenerateAdOverlay({ ...base, categoryChanged: true })).toBe(true);
  });

  it("regenerates when the seasonal event changed", () => {
    expect(shouldRegenerateAdOverlay({ ...base, eventChanged: true })).toBe(true);
  });

  it("regenerates when the baked price went stale", () => {
    expect(shouldRegenerateAdOverlay({ ...base, priceStale: true })).toBe(true);
  });

  it("does NOT regenerate when everything is current, approved, and already one-shot", () => {
    expect(shouldRegenerateAdOverlay(base)).toBe(false);
  });
});

describe("generateOneShotAd — fails safe, never falls back silently, respects the financial gate", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("throws OneShotReferenceMissingError and never reaches the network when the reference file is missing", async () => {
    vi.stubEnv("VITRINE_HENRIQUE_STYLE_REFERENCE_PATH", "/tmp/this-file-does-not-exist-on-purpose.png");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB-TEST");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "1");
    const { generateOneShotAd, OneShotReferenceMissingError } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");

    await expect(
      generateOneShotAd({
        externalId: "MLB-TEST",
        title: "Produto Teste",
        brand: null,
        productPhoto: Buffer.alloc(10),
        productPhotoContentType: "image/jpeg",
        currentPrice: 10,
        referencePrice: null,
        hasConfirmedDiscount: false,
        benefits: [],
      }),
    ).rejects.toBeInstanceOf(OneShotReferenceMissingError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still blocks on VITRINE_CREATIVE_MODE=teste even when the reference file DOES exist — the financial gate is never bypassed by this mechanism", async () => {
    // A committed synthetic fixture (never the real Henrique art) —
    // proves the gate, not file availability, is what stops the call
    // here, on any machine including a fresh CI checkout.
    vi.stubEnv("VITRINE_HENRIQUE_STYLE_REFERENCE_PATH", "tests/fixtures/one-shot-style-reference.synthetic.png");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB-TEST");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "1");
    delete process.env.VITRINE_CREATIVE_MODE; // the real default — blocked
    const { generateOneShotAd } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");
    const { CreativeGenerationBlockedError } = await import("@/lib/services/ai-creative-factory/openai-image-client");

    await expect(
      generateOneShotAd({
        externalId: "MLB-TEST",
        title: "Produto Teste",
        brand: null,
        productPhoto: Buffer.alloc(10),
        productPhotoContentType: "image/jpeg",
        currentPrice: 10,
        referencePrice: null,
        hasConfirmedDiscount: false,
        benefits: [],
      }),
    ).rejects.toBeInstanceOf(CreativeGenerationBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("generateOneShotAd — controlled migration rollout (owner's directive, 2026-11-21)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    // A committed synthetic fixture (never the real Henrique art) and an
    // authorized financial mode so these tests isolate the migration gate
    // specifically, not some other gate.
    vi.stubEnv("VITRINE_HENRIQUE_STYLE_REFERENCE_PATH", "tests/fixtures/one-shot-style-reference.synthetic.png");
    vi.stubEnv("VITRINE_CREATIVE_MODE", "piloto_autorizado");
    vi.stubEnv("VITRINE_CREATIVE_PILOT_MAX_CALLS", "5");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const input = () => ({
    externalId: "MLB36520675",
    title: "Pistola de pulverização elétrica Tssaper TP550",
    brand: "Tssaper",
    productPhoto: Buffer.alloc(10),
    productPhotoContentType: "image/jpeg",
    currentPrice: 228.9,
    referencePrice: 376.7,
    hasConfirmedDiscount: true,
    benefits: ["550W DE POTÊNCIA"],
  });

  it("blocks every product when the allowlist is empty (the real default) — never reaches the network", async () => {
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "5");
    const { generateOneShotAd, OneShotMigrationNotAuthorizedError } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");

    await expect(generateOneShotAd(input())).rejects.toBeInstanceOf(OneShotMigrationNotAuthorizedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a product that IS on the allowlist if VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS is 0 (the real default)", async () => {
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB36520675");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "0");
    const { generateOneShotAd, OneShotMigrationNotAuthorizedError } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");

    await expect(generateOneShotAd(input())).rejects.toBeInstanceOf(OneShotMigrationNotAuthorizedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a product NOT on the allowlist even when others are authorized — one product at a time, not a blanket switch", async () => {
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB-SOME-OTHER-PRODUCT");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "30");
    const { generateOneShotAd, OneShotMigrationNotAuthorizedError } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");

    await expect(generateOneShotAd(input())).rejects.toBeInstanceOf(OneShotMigrationNotAuthorizedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows exactly VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS calls for an allowlisted product in one process, then blocks the next", async () => {
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB36520675");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "1");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("fake").toString("base64") }] }),
    });
    const { generateOneShotAd, OneShotMigrationNotAuthorizedError } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");

    await generateOneShotAd(input()); // 1st call: allowed
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(generateOneShotAd(input())).rejects.toBeInstanceOf(OneShotMigrationNotAuthorizedError); // 2nd: blocked
    expect(fetchMock).toHaveBeenCalledTimes(1); // never reached the network a second time
  });
});

describe("regression guard — the factory job must never import the old compositor overlay for ad_overlay", () => {
  it("jobs/vitrine-creative-factory.ts does not import renderAdOverlay at all (a doc comment may still reference it by name)", () => {
    const source = readFileSync(new URL("../jobs/vitrine-creative-factory.ts", import.meta.url), "utf8");
    const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"));
    expect(importLines.join("\n")).not.toMatch(/renderAdOverlay/);
  });

  it("jobs/vitrine-creative-factory.ts imports the one-shot generator for ad_overlay", () => {
    const source = readFileSync(new URL("../jobs/vitrine-creative-factory.ts", import.meta.url), "utf8");
    expect(source).toContain("generateOneShotAd");
    expect(source).toContain("one-shot-ad-generator");
  });
});
