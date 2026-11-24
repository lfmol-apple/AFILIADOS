import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureAll = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queries/public-product", () => ({
  ensurePublicSlugsForAllEligibleListings: ensureAll,
}));

async function load(secret: string) {
  vi.resetModules();
  vi.stubEnv("CRON_SECRET", secret);
  return import("@/app/api/internal/seo-maintenance/route");
}
const post = (headers: Record<string, string> = {}) =>
  new Request("http://x/api/internal/seo-maintenance", {
    method: "POST",
    headers,
  });

beforeEach(() => {
  ensureAll.mockReset();
  ensureAll.mockResolvedValue({
    canonicalProductsProcessed: 3,
    canonicalProductsSlugGenerated: 3,
    shopeeListingsProcessed: 1,
    shopeeListingsSlugGenerated: 1,
  });
  vi.unstubAllEnvs();
});

describe("POST /api/internal/seo-maintenance", () => {
  it("is disabled (404) when no CRON_SECRET is configured", async () => {
    const { POST } = await load("");
    const res = await POST(post({ "x-cron-secret": "anything" }));
    expect(res.status).toBe(404);
    expect(ensureAll).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong secret", async () => {
    const { POST } = await load("s3cret-value");
    expect((await POST(post())).status).toBe(401);
    expect((await POST(post({ "x-cron-secret": "s3cret-valuX" }))).status).toBe(
      401,
    );
    expect((await POST(post({ "x-cron-secret": "short" }))).status).toBe(401);
    expect(ensureAll).not.toHaveBeenCalled();
  });

  it("runs the idempotent slug catch-up and reports the summary when the secret matches", async () => {
    const { POST } = await load("s3cret-value");
    const res = await POST(post({ "x-cron-secret": "s3cret-value" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.canonicalProductsSlugGenerated).toBe(3);
    expect(ensureAll).toHaveBeenCalledTimes(1);
  });

  it("does not accept the secret from the query string", async () => {
    const { POST } = await load("s3cret-value");
    const res = await POST(
      new Request(
        "http://x/api/internal/seo-maintenance?x-cron-secret=s3cret-value",
        { method: "POST" },
      ),
    );
    expect(res.status).toBe(401);
  });
});
