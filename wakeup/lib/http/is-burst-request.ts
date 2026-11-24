/**
 * True when the same IP has hit too many /go/* links in the last few
 * seconds to be a person clicking — found live, 2026-11-10: a single IP
 * with a plain desktop-Chrome User-Agent (Mozilla/5.0 (X11; Linux
 * x86_64)... Chrome/131 — indistinguishable from a real browser, so
 * isKnownBotRequest's pattern never catches it) crawled /ofertas and
 * followed all 40 outbound affiliate links it found (31 Shopee, 7
 * Mercado Livre, 2 Amazon) within an 11-second visit — each one recorded
 * as a real AffiliateClick and pushed to the owner's phone.
 *
 * A User-Agent string can never close this gap: any scraper can claim to
 * be Chrome. This is a behavioral check instead — no real person clicks
 * more than a handful of /go/ links within a few seconds, crawling the
 * whole site does.
 *
 * In-memory, per-process — same tradeoff as lib/seo/indexable-product-
 * links.ts's cache. Acceptable because a burst is, by definition, over in
 * seconds; a process restart just means the next one gets caught again
 * from scratch, never a real bypass. Bounded cleanup keeps the map from
 * growing unbounded across a long-running process's real day-to-day
 * traffic.
 */
const WINDOW_MS = 5_000;
const MAX_HITS_IN_WINDOW = 3;
const MAX_TRACKED_IPS = 5_000;

const g = globalThis as unknown as { __goLinkHitsByIp?: Map<string, number[]> };
const hitsByIp = (g.__goLinkHitsByIp ??= new Map<string, number[]>());

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

export function isBurstRequest(headers: Headers, now: number = Date.now()): boolean {
  const ip = getClientIp(headers);
  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hitsByIp.set(ip, recent);

  if (hitsByIp.size > MAX_TRACKED_IPS) {
    for (const [key, timestamps] of hitsByIp) {
      if (timestamps.every((t) => now - t >= WINDOW_MS)) hitsByIp.delete(key);
    }
  }

  return recent.length > MAX_HITS_IN_WINDOW;
}

/** Test hook — clears every IP's recorded hits between test cases. */
export function resetBurstTrackingForTest(): void {
  hitsByIp.clear();
}
