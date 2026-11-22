import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner's authorization, 2026-11-22 ("Frente B — Pixel Meta do
 * Henrique", B9: testes automatizados). lib/analytics/meta-pixel-client.ts
 * is tested directly (mocked window.fbq, mocked consent) — zero network,
 * zero real Meta call, matching the project's own established pattern
 * for consent-gated side effects (components/analytics-beacon.tsx has no
 * equivalent test today, so this is the first of its kind here).
 */

vi.mock("@/lib/privacy/consent-client", () => ({
  readCachedConsent: vi.fn(),
}));

import { readCachedConsent } from "@/lib/privacy/consent-client";
import { trackViewContent, trackAffiliateOutboundClick } from "@/lib/analytics/meta-pixel-client";

const product = { merchantListingId: "vs-real-123", title: "Secador De Cabelos Philco", price: 149.9 };

// This suite runs in vitest's "node" environment (project-wide config) —
// there is no real browser `window`. A minimal EventTarget-based stub
// gives lib/analytics/meta-pixel-client.ts's `typeof window !== "undefined"`
// check and `.fbq` property access somewhere real to land on, without
// touching the project's global test environment.
function stubWindow(): EventTarget & { fbq?: ReturnType<typeof vi.fn> } {
  const stub = new EventTarget() as EventTarget & { fbq?: ReturnType<typeof vi.fn> };
  vi.stubGlobal("window", stub);
  return stub;
}

describe("trackViewContent — consent-gated, never fabricates a price", () => {
  beforeEach(() => {
    vi.mocked(readCachedConsent).mockReset();
    stubWindow().fbq = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires fbq ViewContent with the real product identity when marketing consent is granted", () => {
    vi.mocked(readCachedConsent).mockReturnValue({ analytics: "DENIED", marketing: "GRANTED" });
    trackViewContent(product);
    expect(window.fbq).toHaveBeenCalledWith("track", "ViewContent", {
      content_ids: ["vs-real-123"],
      content_name: "Secador De Cabelos Philco",
      value: 149.9,
      currency: "BRL",
      content_type: "product",
    });
  });

  it("never fires when marketing consent is DENIED", () => {
    vi.mocked(readCachedConsent).mockReturnValue({ analytics: "GRANTED", marketing: "DENIED" });
    trackViewContent(product);
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("never fires when consent was never decided (UNSET)", () => {
    vi.mocked(readCachedConsent).mockReturnValue(null);
    trackViewContent(product);
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("never fires when the pixel script never loaded (window.fbq absent — e.g. blocked by an ad blocker)", () => {
    delete window.fbq;
    vi.mocked(readCachedConsent).mockReturnValue({ analytics: "GRANTED", marketing: "GRANTED" });
    expect(() => trackViewContent(product)).not.toThrow();
  });

  it("never fires when the real price is unknown — never sends a fabricated value", () => {
    vi.mocked(readCachedConsent).mockReturnValue({ analytics: "GRANTED", marketing: "GRANTED" });
    trackViewContent({ ...product, price: null });
    expect(window.fbq).not.toHaveBeenCalled();
  });
});

describe("trackAffiliateOutboundClick — a custom event, never AddToCart", () => {
  beforeEach(() => {
    vi.mocked(readCachedConsent).mockReset();
    stubWindow().fbq = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires fbq trackCustom AffiliateOutboundClick, never 'track' AddToCart, when consent is granted", () => {
    vi.mocked(readCachedConsent).mockReturnValue({ analytics: "DENIED", marketing: "GRANTED" });
    trackAffiliateOutboundClick(product);
    expect(window.fbq).toHaveBeenCalledWith(
      "trackCustom",
      "AffiliateOutboundClick",
      expect.objectContaining({ content_ids: ["vs-real-123"] }),
    );
    expect(window.fbq).not.toHaveBeenCalledWith("track", "AddToCart", expect.anything());
  });

  it("never fires when marketing consent is DENIED — the outbound link itself must still work (verified separately in affiliate-outbound-link.test.tsx)", () => {
    vi.mocked(readCachedConsent).mockReturnValue({ analytics: "GRANTED", marketing: "DENIED" });
    expect(() => trackAffiliateOutboundClick(product)).not.toThrow();
    expect(window.fbq).not.toHaveBeenCalled();
  });
});
