import { afterEach, describe, expect, it } from "vitest";
import {
  isBurstRequest,
  resetBurstTrackingForTest,
} from "@/lib/http/is-burst-request";

function headers(ip = "203.0.113.1"): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

describe("isBurstRequest", () => {
  afterEach(() => {
    resetBurstTrackingForTest();
  });

  it("a person clicking a few links within seconds is never flagged", () => {
    const h = headers();
    const t0 = 1_000_000;
    expect(isBurstRequest(h, t0)).toBe(false);
    expect(isBurstRequest(h, t0 + 500)).toBe(false);
    expect(isBurstRequest(h, t0 + 1_000)).toBe(false);
  });

  it("the shape found live 2026-11-10 — a crawler following every outbound link in seconds — is flagged after a few hits", () => {
    const h = headers();
    const t0 = 2_000_000;
    for (let i = 0; i < 3; i++) {
      expect(isBurstRequest(h, t0 + i * 100)).toBe(false);
    }
    // The 4th hit within the same 5s window is the burst.
    expect(isBurstRequest(h, t0 + 400)).toBe(true);
    expect(isBurstRequest(h, t0 + 450)).toBe(true);
  });

  it("different IPs never share a bucket", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 3; i++) {
      expect(isBurstRequest(headers("203.0.113.1"), t0 + i * 10)).toBe(false);
    }
    // A different IP starts its own, empty window.
    expect(isBurstRequest(headers("203.0.113.2"), t0 + 20)).toBe(false);
  });

  it("the window expires — real hits more than 5s apart never accumulate", () => {
    const h = headers();
    const t0 = 4_000_000;
    expect(isBurstRequest(h, t0)).toBe(false);
    expect(isBurstRequest(h, t0 + 1_000)).toBe(false);
    expect(isBurstRequest(h, t0 + 2_000)).toBe(false);
    // Past the 5s window: the first 3 hits have aged out, so this is only
    // the first hit of a fresh window, not the 4th of the old one.
    expect(isBurstRequest(h, t0 + 6_000)).toBe(false);
  });

  it("a missing X-Forwarded-For falls back to a shared 'unknown' bucket, which is strictly more restrictive, not a bypass", () => {
    const h = new Headers();
    const t0 = 5_000_000;
    expect(isBurstRequest(h, t0)).toBe(false);
    expect(isBurstRequest(h, t0 + 10)).toBe(false);
    expect(isBurstRequest(h, t0 + 20)).toBe(false);
    expect(isBurstRequest(h, t0 + 30)).toBe(true);
  });
});
