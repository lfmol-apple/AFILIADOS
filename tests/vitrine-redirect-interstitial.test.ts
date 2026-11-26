import { describe, expect, it } from "vitest";
import { renderVitrineRedirectInterstitial, escapeHtml } from "@/lib/services/vitrine-redirect-interstitial";

/**
 * Owner's directive, 2026-11-25 ("PIXEL DA META – AJUSTE NA VITRINE
 * PRECOCAINDO", reaffirmed same day: "não dispare AddToCart
 * artificialmente... preserve AffiliateOutboundClick como evento
 * oficial de intenção comercial de saída"): proves the generated page
 * carries the real Pixel base snippet, fires ViewContent + the custom
 * AffiliateOutboundClick event (never the standard AddToCart — no cart
 * exists) with content_ids equal to the exact merchantListingId (never
 * the ML externalId), gates both on real consent read from the real
 * cookie this project already uses, never fires with an unknown price,
 * and ALWAYS redirects regardless.
 */
describe("renderVitrineRedirectInterstitial", () => {
  const baseInput = {
    pixelId: "1718278203328773",
    merchantListingId: "cmwjnyrpl0008pf01cyhwi12o",
    title: "Secador De Cabelos Philco PSC3500",
    price: 498.9,
    destination: "https://mercadolivre.com/sec/abc123",
    merchantProductUrl: "https://www.mercadolivre.com.br/p/MLB49652036",
  };

  it("includes the real Pixel init + PageView base snippet with the real pixel id", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain("fbq('init', \"1718278203328773\")");
    expect(html).toContain("fbq('track', 'PageView')");
  });

  it("fires ViewContent and the custom AffiliateOutboundClick with content_ids equal to the exact merchantListingId, never the ML id", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain("fbq('track', 'ViewContent', eventPayload)");
    expect(html).toContain("fbq('trackCustom', 'AffiliateOutboundClick', eventPayload)");
    expect(html).toContain('"content_ids":["cmwjnyrpl0008pf01cyhwi12o"]');
    // content_ids itself must never carry the ML item id — the real ML id
    // DOES legitimately appear elsewhere now, inside content_url (next test).
    expect(html).not.toContain('"content_ids":["MLB');
  });

  it("includes the real Mercado Livre product URL as content_url — never event_source_url, never faked", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain('"content_url":"https://www.mercadolivre.com.br/p/MLB49652036"');
  });

  it("never fires the standard AddToCart event — PreçoCaindo has no cart", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).not.toContain("AddToCart");
  });

  it("carries the real price and currency, never a placeholder", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain('"value":498.9');
    expect(html).toContain('"currency":"BRL"');
  });

  it("gates firing on the real pc_consent cookie (marketing GRANTED), the same cookie every other Pixel event in this project reads", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain("pc_consent=");
    expect(html).toContain('consent.marketing === "GRANTED"');
  });

  it("never fires when price is null — redirect still happens unconditionally", () => {
    const html = renderVitrineRedirectInterstitial({ ...baseInput, price: null });
    expect(html).toContain("var price = null;");
    expect(html).toContain("if (hasMarketingConsent && price !== null)");
    // The unconditional redirect (outside the try/if guard) is still present.
    expect(html).toContain("setTimeout(goNow, 400)");
  });

  it("the redirect timer and the noscript fallback are never inside the consent/price guard", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    const guardStart = html.indexOf("if (hasMarketingConsent && price !== null)");
    const guardEnd = html.indexOf("} catch (e)");
    const setTimeoutIndex = html.indexOf("setTimeout(goNow, 400)");
    expect(setTimeoutIndex).toBeGreaterThan(guardEnd);
    expect(guardStart).toBeGreaterThan(-1);
  });

  it("escapes a title containing HTML-significant characters, never breaking out of the visible text", () => {
    const html = renderVitrineRedirectInterstitial({ ...baseInput, title: `<script>alert("x")</script>` });
    expect(html).not.toContain("<script>alert(");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapeHtml escapes all 4 significant characters", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });

  it("the real destination appears as the fallback link href and as the JS redirect target, both escaped/serialized safely", () => {
    const html = renderVitrineRedirectInterstitial({ ...baseInput, destination: `https://mercadolivre.com/sec/a&b"c` });
    expect(html).toContain('href="https://mercadolivre.com/sec/a&amp;b&quot;c"');
    expect(html).toContain(JSON.stringify("https://mercadolivre.com/sec/a&b\"c"));
  });

  it("marks the page noindex,nofollow — this is a tracking redirect, never meant to be indexed", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
  });

  it("carries a head-level meta-refresh fallback that works even if a blocker strips the inline <script> while JS stays enabled", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain('<meta http-equiv="refresh" content="1.2;url=https://mercadolivre.com/sec/abc123">');
    // It must never win the race against the normal path: strictly
    // slower than the 400ms JS timer.
    const metaRefreshSeconds = parseFloat(html.match(/content="([\d.]+);url=/)![1]);
    expect(metaRefreshSeconds * 1000).toBeGreaterThan(400);
  });

  it("the noscript fallback still redirects immediately (0s) for fully JS-disabled browsers", () => {
    const html = renderVitrineRedirectInterstitial(baseInput);
    expect(html).toContain(`<noscript><meta http-equiv="refresh" content="0;url=${baseInput.destination}"></noscript>`);
  });
});
