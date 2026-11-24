import { describe, expect, it } from "vitest";
import { withRetry, isRetryableError } from "@/lib/jobs/retry";

// ---------------------------------------------------------------------
// lib/jobs/retry.ts — pure classification + backoff behavior.
//
// The ML_DEMAND / ML_ENRICHMENT / SHOPEE_REFRESH / ML_SHOPEE_CYCLE job
// tests that used to live in this file were removed 2026-11-24 (owner's
// decision: the organic public price-comparison site, and the jobs that
// only ever fed it, went dormant — see git tag
// archive/preco-caindo-organico-2026-11-24 for the full pre-pivot state,
// including this file's previous version). retry.ts itself is still real,
// shared infrastructure (used by the kept Vitrine/campaign jobs too), so
// its own tests stay.
// ---------------------------------------------------------------------
describe("retry.ts — error classification", () => {
  it("classifies 429/5xx and network failures as retryable", () => {
    expect(isRetryableError(new Error("Foo failed: HTTP 429"))).toBe(true);
    expect(isRetryableError(new Error("Foo failed: HTTP 500"))).toBe(true);
    expect(isRetryableError(new Error("Foo failed: HTTP 503"))).toBe(true);
    expect(isRetryableError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableError(new Error("connect ETIMEDOUT 1.2.3.4:443"))).toBe(true);
  });

  it("classifies 401/400/404 and unexpected-schema errors as NOT retryable — a human needs to look, not a loop", () => {
    expect(isRetryableError(new Error("Foo failed: HTTP 401"))).toBe(false);
    expect(isRetryableError(new Error("Foo failed: HTTP 400"))).toBe(false);
    expect(isRetryableError(new Error("Foo failed: HTTP 404"))).toBe(false);
    expect(isRetryableError(new Error("Unexpected token < in JSON at position 0"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries a transient failure and succeeds once the underlying call recovers", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("HTTP 503");
        return "ok";
      },
      { baseDelayMs: 1 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gives up after the configured attempt count — never an infinite loop", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("HTTP 500");
        },
        { attempts: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow(/HTTP 500/);
    expect(calls).toBe(3);
  });

  it("never retries a non-retryable error — fails on the first attempt", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new Error("HTTP 401");
      }),
    ).rejects.toThrow(/HTTP 401/);
    expect(calls).toBe(1);
  });
});
