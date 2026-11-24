import { describe, expect, it, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { buildShopeeAuthorizationHeader } from "@/lib/shopee/signature";
import { normalizeSubId } from "@/lib/services/shopee-attribution";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("buildShopeeAuthorizationHeader", () => {
  it("matches the documented SHA256(AppId + Timestamp + Payload + SecretKey) formula", () => {
    const header = buildShopeeAuthorizationHeader({
      appId: "12345",
      secretKey: "supersecret",
      timestamp: 1700000000,
      payload: '{"query":"{ shopeeOfferV2 { nodes { itemId } } }"}',
    });

    // Independently recomputed, not copy-pasted from the implementation.
    const expected = createHash("sha256")
      .update(
        "12345" +
          "1700000000" +
          '{"query":"{ shopeeOfferV2 { nodes { itemId } } }"}' +
          "supersecret",
      )
      .digest("hex");

    expect(header).toBe(
      `SHA256 Credential=12345, Timestamp=1700000000, Signature=${expected}`,
    );
  });

  it("never leaks the secret key itself into the header", () => {
    const header = buildShopeeAuthorizationHeader({
      appId: "12345",
      secretKey: "supersecret",
      timestamp: 1700000000,
      payload: "{}",
    });
    expect(header).not.toContain("supersecret");
  });
});

describe("normalizeSubId", () => {
  it("strips accents, spaces and punctuation, keeping only alphanumerics", () => {
    expect(normalizeSubId("Black Friday!")).toBe("BlackFriday");
    expect(normalizeSubId("Promoção-Relâmpago")).toBe("PromocaoRelampago");
    expect(normalizeSubId("admin_queue")).toBe("adminqueue");
  });
});

describe("buildShopeeSubIds", () => {
  it("sub_id1 is always the configured project tag, regardless of input", async () => {
    vi.stubEnv("SHOPEE_SUB_ID1", "precocaindo");
    vi.resetModules();
    const { buildShopeeSubIds: fresh } = await import(
      "@/lib/services/shopee-attribution"
    );
    expect(fresh({})).toEqual(["precocaindo"]);
  });

  it("keeps sub_id positions fixed even when an inner slot is empty", async () => {
    vi.stubEnv("SHOPEE_SUB_ID1", "precocaindo");
    vi.resetModules();
    const { buildShopeeSubIds: fresh } = await import(
      "@/lib/services/shopee-attribution"
    );
    // category omitted, but campaign present — sub_id3 must stay "" (not
    // shift campaign into position 3).
    const subIds = fresh({ source: "admin_queue", campaign: "blackfriday" });
    expect(subIds).toEqual(["precocaindo", "adminqueue", "", "blackfriday"]);
  });

  it("normalizes every non-empty slot", async () => {
    vi.stubEnv("SHOPEE_SUB_ID1", "precocaindo");
    vi.resetModules();
    const { buildShopeeSubIds: fresh } = await import(
      "@/lib/services/shopee-attribution"
    );
    const subIds = fresh({ category: "Ar Condicionado" });
    expect(subIds).toEqual(["precocaindo", "", "ArCondicionado"]);
  });
});
