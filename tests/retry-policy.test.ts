import { describe, expect, it, vi } from "vitest";
import {
  isRetryableStatus,
  shouldRetry,
  computeBackoffDelayMs,
  withRetry,
  RetryableError,
  DEFAULT_RETRY_POLICY,
} from "@/lib/http/retry-policy";

describe("isRetryableStatus", () => {
  it("treats 429 and 5xx as retryable", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
  });

  it("treats other 4xx as not retryable", () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
});

describe("shouldRetry", () => {
  it("stops once maxAttempts is reached", () => {
    expect(shouldRetry(4, { status: 500 }, { ...DEFAULT_RETRY_POLICY, maxAttempts: 4 })).toBe(false);
  });

  it("retries on timeout", () => {
    expect(shouldRetry(1, { timedOut: true })).toBe(true);
  });

  it("never retries infinitely", () => {
    const config = { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 };
    const attempt = 10;
    expect(shouldRetry(attempt, { status: 500 }, config)).toBe(false);
  });
});

describe("computeBackoffDelayMs", () => {
  it("grows exponentially with the attempt number, capped at maxDelayMs", () => {
    const config = { maxAttempts: 10, baseDelayMs: 100, maxDelayMs: 1000 };
    const alwaysMax = () => 0.999999;
    expect(computeBackoffDelayMs(1, config, alwaysMax)).toBeLessThanOrEqual(100);
    expect(computeBackoffDelayMs(5, config, alwaysMax)).toBeLessThanOrEqual(1000);
    expect(computeBackoffDelayMs(10, config, alwaysMax)).toBeLessThanOrEqual(1000);
  });

  it("applies jitter (0 -> zero delay)", () => {
    expect(computeBackoffDelayMs(3, DEFAULT_RETRY_POLICY, () => 0)).toBe(0);
  });
});

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, DEFAULT_RETRY_POLICY, async () => {});
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable error and eventually succeeds", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new RetryableError("temporary", { status: 503 });
      return "recovered";
    });
    const result = await withRetry(fn, { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 5 }, async () => {});
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops retrying and throws after maxAttempts", async () => {
    const fn = vi.fn(async () => {
      throw new RetryableError("always fails", { status: 500 });
    });
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 }, async () => {}),
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("propagates a non-retryable error immediately without retrying", async () => {
    const fn = vi.fn(async () => {
      throw new Error("not our retryable type");
    });
    await expect(withRetry(fn, DEFAULT_RETRY_POLICY, async () => {})).rejects.toThrow(
      "not our retryable type",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 4xx that isn't 429", async () => {
    const fn = vi.fn(async () => {
      throw new RetryableError("bad request", { status: 400 });
    });
    await expect(withRetry(fn, DEFAULT_RETRY_POLICY, async () => {})).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
