/**
 * True when a GET request is Next.js (or a browser) warming up a link, not
 * a real navigation a visitor asked for. Found live, 2026-10-01: Meta's
 * crawler rendering a /produto/[slug] page was enough to trigger next/link's
 * automatic prefetch of the merchant CTA, and that GET request looked
 * exactly like a real affiliate click to the /go/ route handlers — 226 fake
 * clicks in about two hours, with zero real pageviews alongside them. The
 * CTA components no longer use <Link> for that href (see merchant-cta.tsx
 * and amazon-cta.tsx), which removes the trigger; this is the second layer,
 * independent of any component ever doing that again, or of some other
 * client sending the same signal.
 *
 * `next-router-prefetch`/`purpose`/`sec-purpose` are the real headers
 * browsers/Next.js send for a prefetch, not a click; `_rsc` is the query
 * param Next.js's own prefetch requests always carry.
 */
export function isPrefetchRequest(
  headers: Headers,
  searchParams: URLSearchParams,
): boolean {
  if (headers.has("next-router-prefetch")) return true;
  if (headers.get("purpose") === "prefetch") return true;
  if (headers.get("sec-purpose")?.includes("prefetch")) return true;
  if (searchParams.has("_rsc")) return true;
  return false;
}
