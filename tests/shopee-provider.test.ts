import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("ShopeeProvider", () => {
  it("fails explicitly (NOT_CONFIGURED) with default env — no partner credentials exist yet", async () => {
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    expect(() => new ShopeeProvider()).toThrow(/SHOPEE_ENABLED/);
  });

  it("still fails even with SHOPEE_ENABLED=true, since no real partner credential shape is confirmed", async () => {
    vi.stubEnv("SHOPEE_ENABLED", "true");
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    expect(() => new ShopeeProvider()).toThrow(/SHOPEE_API_ENABLED|PARTNER/);
  });

  it("never calls the network under any configuration — no real endpoint is implemented", async () => {
    vi.stubEnv("SHOPEE_ENABLED", "true");
    vi.stubEnv("SHOPEE_API_ENABLED", "true");
    vi.stubEnv("SHOPEE_PARTNER_ID", "fake-id");
    vi.stubEnv("SHOPEE_PARTNER_KEY", "fake-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    expect(() => new ShopeeProvider()).toThrow(/NOT_CONFIGURED/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
