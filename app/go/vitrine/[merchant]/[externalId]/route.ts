import { NextResponse } from "next/server";
import { resolveVitrineRedirect } from "@/lib/services/vitrine-redirect";
import { renderVitrineRedirectInterstitial } from "@/lib/services/vitrine-redirect-interstitial";
import { isOwnerRequest } from "@/lib/admin/owner-traffic";
import { isPrefetchRequest } from "@/lib/http/is-prefetch-request";
import { isKnownBotRequest } from "@/lib/http/is-bot-request";
import { isBurstRequest } from "@/lib/http/is-burst-request";
import { env } from "@/lib/config/env";

/**
 * Owner's directive, 2026-11-25 ("PIXEL DA META – AJUSTE NA VITRINE
 * PRECOCAINDO"): this route used to be a pure server-side 302 — no HTML
 * ever reached the browser, so the Meta Pixel (a client-side script)
 * never had a chance to fire ViewContent/AddToCart for a Meta-catalog
 * click. Real humans now get a minimal, fast interstitial HTML page
 * (lib/services/vitrine-redirect-interstitial.ts) that loads the Pixel,
 * fires both events with the REAL product identity (content_ids is the
 * exact merchantListingId the catalog feed publishes as `g:id` — see
 * lib/services/vitrine-redirect.ts's own doc comment), then forwards to
 * the real affiliate URL after ~400ms.
 *
 * Bots/prefetches/bursts (same detection this route already used) skip
 * the interstitial entirely and get the old plain 302 — there is no
 * real visitor there to show a page to, and resolveVitrineRedirect
 * already skips writing the AffiliateClick for them too.
 *
 * The AffiliateClick write happens exactly where it always did — inside
 * resolveVitrineRedirect, before this route ever runs — unchanged.
 */

export async function GET(
  request: Request,
  context: { params: Promise<{ merchant: string; externalId: string }> },
) {
  const { merchant, externalId } = await context.params;
  const url = new URL(request.url);
  const isPrefetch =
    isPrefetchRequest(request.headers, url.searchParams) ||
    isKnownBotRequest(request.headers) ||
    isBurstRequest(request.headers);

  const result = await resolveVitrineRedirect({
    merchant,
    externalId,
    searchParams: url.searchParams,
    isOwner: await isOwnerRequest(request),
    isPrefetch,
  });

  if (result.status === "error") {
    return NextResponse.json(
      { error: result.errorMessage },
      { status: result.errorStatus },
    );
  }

  // Bots/prefetches/bursts: no real visitor to show an interstitial to
  // — same plain, immediate 302 this route always used.
  if (isPrefetch || !env.META_PIXEL_ID) {
    return NextResponse.redirect(result.destination, { status: 302 });
  }

  const html = renderVitrineRedirectInterstitial({
    pixelId: env.META_PIXEL_ID,
    merchantListingId: result.merchantListingId,
    title: result.title,
    price: result.currentPrice,
    destination: result.destination,
  });
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
