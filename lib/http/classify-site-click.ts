/**
 * Decides whether a /go/* hit is a real click made on this site's own page,
 * and whether it deserves a push to the owner.
 *
 * Found live, 2026-11-20 (nginx log vs AffiliateClick): of 321 non-Meta /go/
 * hits only 10 carried the Referer of the product page they claimed to come
 * from (/produto/<slug>). The rest — ~190 with Referer "/" (the home page,
 * which has no product buttons), ~105 with none, 17 from /ofertas — came from
 * a distributed scraper: rotating cloud IPs (Alibaba Singapore etc.), spoofed
 * Chrome/Firefox User-Agents of every version, one hit every 20–60 min round
 * the clock. User-Agent and per-IP burst checks can't catch that; the
 * Referer can, because a person pressing the button on /produto/<slug> always
 * sends exactly that page as Referer (same-origin → full URL), and a bot that
 * harvested the link from HTML never visited the page.
 *
 * Policy:
 *  - pageType=product  → counted only if Referer is /produto/<pageSlug> on
 *    our own host. Otherwise: redirect the visitor, record nothing, notify
 *    nobody.
 *  - pageType=ofertas  → counted only if Referer is on /ofertas, and now
 *    DOES notify (owner's request, 2026-11-27: a product click must
 *    notify regardless of which page it came from — most of today's real
 *    clicks are on /ofertas, not individual /produto pages, so "product
 *    clicks only" was silencing nearly everything) — same Referer check
 *    and dedupe window as pageType=product, so this doesn't reopen the
 *    2026-11-20 scraper problem (that one forged a fake /produto/<slug>
 *    referer; it never bothered faking /ofertas).
 *  - anything else (telegram, whatsapp, radar, admin...) → counted as before
 *    (those legitimately arrive from outside the site), never notifies.
 */
const OWN_HOSTS = new Set(["precocaindo.com.br", "www.precocaindo.com.br"]);

const NOTIFY_DEDUPE_MS = 10 * 60_000;
const MAX_TRACKED = 5_000;

const g = globalThis as unknown as { __clickNotifySeen?: Map<string, number> };
const seen = (g.__clickNotifySeen ??= new Map<string, number>());

export type SiteClickVerdict = { record: boolean; notify: boolean };

function refererPath(headers: Headers): string | null {
  const referer = headers.get("referer");
  if (!referer) return null;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return null;
  }
  const requestHosts = [headers.get("x-forwarded-host"), headers.get("host")]
    .filter((h): h is string => Boolean(h))
    .map((h) => h.split(":")[0]!.toLowerCase());
  const host = url.hostname.toLowerCase();
  if (!OWN_HOSTS.has(host) && !requestHosts.includes(host)) return null;
  return url.pathname.replace(/\/+$/, "") || "/";
}

function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function classifySiteClick(
  headers: Headers,
  searchParams: URLSearchParams,
  now: number = Date.now(),
  /** The actual product identifier (externalId/asin) being redirected to.
   * pageSlug is a constant ("ofertas") for every /ofertas click, so
   * without this the dedupe key collapsed every different product from
   * the same IP into one bucket — found live, 2026-11-27: clicking a
   * second, different product within the 10min window silently looked
   * like a repeat of the first and never notified. Optional/unused for
   * pageType=product, where pageSlug is already the real product slug. */
  productKey?: string,
): SiteClickVerdict {
  const pageType = searchParams.get("pageType");
  const pageSlug = searchParams.get("pageSlug");

  if (pageType === "product") {
    const path = refererPath(headers);
    if (!pageSlug || path !== `/produto/${pageSlug}`) {
      return { record: false, notify: false };
    }
    const key = `${clientIp(headers)}|${pageSlug}`;
    const last = seen.get(key);
    seen.set(key, now);
    if (seen.size > MAX_TRACKED) {
      for (const [k, t] of seen) if (now - t >= NOTIFY_DEDUPE_MS) seen.delete(k);
    }
    const duplicate = last !== undefined && now - last < NOTIFY_DEDUPE_MS;
    return { record: true, notify: !duplicate };
  }

  if (pageType === "ofertas") {
    const path = refererPath(headers);
    const fromOfertas = path === "/ofertas" || path?.startsWith("/ofertas/");
    if (!fromOfertas) return { record: false, notify: false };
    const key = `${clientIp(headers)}|ofertas|${productKey ?? pageSlug ?? "unknown"}`;
    const last = seen.get(key);
    seen.set(key, now);
    if (seen.size > MAX_TRACKED) {
      for (const [k, t] of seen) if (now - t >= NOTIFY_DEDUPE_MS) seen.delete(k);
    }
    const duplicate = last !== undefined && now - last < NOTIFY_DEDUPE_MS;
    return { record: true, notify: !duplicate };
  }

  return { record: true, notify: false };
}

/** Test hook. */
export function resetClickNotifyTrackingForTest(): void {
  seen.clear();
}
