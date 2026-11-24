import { afterEach, describe, expect, it, vi } from "vitest";
import { submitConsent, CONSENT_CHANGED_EVENT } from "@/lib/privacy/consent-client";

/**
 * Owner's authorization, 2026-11-22 ("Frente B — Pixel Meta do
 * Henrique"): components/meta-pixel.tsx needs to react the instant
 * consent is granted, without a page reload — this proves submitConsent
 * actually dispatches the event it relies on, with the real choice as
 * its detail.
 */
describe("submitConsent — dispatches CONSENT_CHANGED_EVENT for live listeners (e.g. the Pixel loader)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // This suite runs in vitest's "node" environment (project-wide config)
  // — there is no real browser `window`. A minimal EventTarget stub gives
  // consent-client.ts's `typeof window !== "undefined"` check and the
  // dispatch/listen calls somewhere real to land on.
  function stubWindow(): EventTarget {
    const stub = new EventTarget();
    vi.stubGlobal("window", stub);
    return stub;
  }

  it("dispatches the event with the submitted consent as detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    stubWindow();
    const handler = vi.fn();
    window.addEventListener(CONSENT_CHANGED_EVENT, handler);

    await submitConsent({ analytics: "GRANTED", marketing: "GRANTED" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0] as CustomEvent;
    expect(event.detail).toEqual({ analytics: "GRANTED", marketing: "GRANTED" });

    vi.unstubAllGlobals();
  });

  it("dispatches even when marketing is explicitly DENIED — a listener must be able to react to a revoke too", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    stubWindow();
    const handler = vi.fn();
    window.addEventListener(CONSENT_CHANGED_EVENT, handler);

    await submitConsent({ analytics: "GRANTED", marketing: "DENIED" });

    expect((handler.mock.calls[0]![0] as CustomEvent).detail).toEqual({ analytics: "GRANTED", marketing: "DENIED" });

    vi.unstubAllGlobals();
  });
});
