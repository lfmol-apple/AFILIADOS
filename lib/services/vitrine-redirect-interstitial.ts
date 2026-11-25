/**
 * Owner's directive, 2026-11-25 ("PIXEL DA META – AJUSTE NA VITRINE
 * PRECOCAINDO", reaffirmed same day: "não dispare AddToCart
 * artificialmente... preserve AffiliateOutboundClick como evento
 * oficial de intenção comercial de saída"). Pure HTML string builder —
 * extracted from app/go/vitrine/[merchant]/[externalId]/route.ts so
 * it's unit-testable without a request/DB (same reasoning every other
 * pure-logic extraction in this project already uses). The real
 * redirect ALWAYS happens after ~400ms regardless of consent/price; the
 * Pixel events are gated inside the generated page's own script, never
 * server-side, since consent is a client-side cookie this handler never
 * reads itself.
 *
 * Fires exactly two events, the SAME two this project already fires on
 * a product page (ViewContent on open, AffiliateOutboundClick on the
 * buy click, lib/analytics/meta-pixel-client.ts) — compressed into one
 * page because viewing and clicking happen together on a Meta-catalog
 * click. Never AddToCart (no cart exists) and never a duplicate of
 * either event — each fires at most once per real page load, and a
 * visitor who lands here never also triggers the product page's own
 * beacons for the same click (different routes, no shared state).
 */

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Any value JSON.stringify'd straight into an inline `<script>` block
 * is vulnerable to a real, well-known injection: the HTML tokenizer
 * looks for a literal `</script` INSIDE the script's raw text, before
 * any JS parsing happens — a product title containing that substring
 * (e.g. a title echoing back something like `</script><script>...`)
 * would close the real script tag early and let the rest of the
 * "already JSON-escaped" string run as raw HTML. Replacing `<` with its
 * unicode escape is the standard mitigation (valid inside a JS string
 * literal, and `</script` can then never appear literally in the
 * output) — caught by this module's own test suite before ever
 * shipping, not a hypothetical. */
function jsonForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export interface VitrineRedirectInterstitialInput {
  pixelId: string;
  /** The exact merchantListingId the Meta catalog feed publishes as
   * `g:id` — never a different id (see lib/services/vitrine-redirect.ts). */
  merchantListingId: string;
  title: string;
  /** Null only when genuinely unknown — the generated page then never
   * fires ViewContent/AffiliateOutboundClick, same "never send a
   * guessed value" rule every other Pixel event in this project
   * follows. */
  price: number | null;
  destination: string;
}

export function renderVitrineRedirectInterstitial(input: VitrineRedirectInterstitialInput): string {
  const safeTitle = escapeHtml(input.title);
  const safeDestination = escapeHtml(input.destination);
  const eventPayload = jsonForInlineScript({
    content_ids: [input.merchantListingId],
    content_name: input.title,
    value: input.price,
    currency: "BRL",
    content_type: "product",
  });

  // Owner's directive, 2026-11-25 ("o redirecionamento deve funcionar
  // mesmo quando... o navegador bloquear scripts"): a <meta
  // http-equiv="refresh"> in <head> is pure HTML, parsed and acted on
  // by the browser regardless of whether ANY script on the page runs —
  // unlike the <noscript> fallback below (which only helps when
  // scripting is fully disabled), this also covers a blocker that
  // strips or kills just this page's inline <script> tag while leaving
  // JS enabled generally. Set to 1200ms specifically so it NEVER wins
  // the race against the normal 400ms JS redirect in the common case —
  // it only ever fires as the fallback for that one scenario.
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="refresh" content="1.2;url=${safeDestination}">
<title>Redirecionando…</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#333}p{font-size:.95rem}</style>
</head>
<body>
<p>Redirecionando para ${safeTitle} no Mercado Livre… <a id="fallback-link" href="${safeDestination}">Clique aqui se não for redirecionado automaticamente.</a></p>
<script>
(function () {
  var DESTINATION = ${jsonForInlineScript(input.destination)};
  function goNow() { window.location.replace(DESTINATION); }

  try {
    var raw = document.cookie.match(/(?:^|; )pc_consent=([^;]*)/);
    var consent = raw ? JSON.parse(decodeURIComponent(raw[1])) : null;
    var hasMarketingConsent = !!(consent && consent.marketing === "GRANTED");
    var price = ${input.price === null ? "null" : JSON.stringify(input.price)};

    if (hasMarketingConsent && price !== null) {
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', ${jsonForInlineScript(input.pixelId)});
      fbq('track', 'PageView');
      var eventPayload = ${eventPayload};
      fbq('track', 'ViewContent', eventPayload);
      fbq('trackCustom', 'AffiliateOutboundClick', eventPayload);
    }
  } catch (e) {
    // Never let a Pixel/consent-parsing error block the real redirect.
  }

  setTimeout(goNow, 400);
})();
</script>
<noscript><meta http-equiv="refresh" content="0;url=${safeDestination}"></noscript>
</body>
</html>`;
}
