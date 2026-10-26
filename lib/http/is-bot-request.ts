/**
 * True when a GET request's User-Agent identifies it as a crawler/bot, not
 * a person clicking. Found live, 2026-10-26: /ofertas affiliate clicks went
 * +1283% week over week (498) while real pageviews barely moved (13, +44%)
 * — and the top-clicked list was ~15+ unrelated products (skincare, a chair,
 * a volleyball, a t-shirt, a perfume...) each with exactly 2 clicks within
 * the same hour. That shape is a crawler walking every outbound link on the
 * offers list, not a visitor. isPrefetchRequest only catches next/link's own
 * prefetch signal (the 2026-10-01 incident); a crawler issuing a plain GET
 * straight at a /go/ URL carries neither that header nor the `_rsc` param,
 * so it needs its own check.
 *
 * Deliberately broad: anything identifying itself as a bot/spider/crawler
 * (search engines included — Googlebot indexing a page is not a click
 * either), plus the non-browser HTTP clients scrapers are commonly built
 * on, plus a missing User-Agent, which no real browser ever sends.
 */
const BOT_USER_AGENT_PATTERN =
  /bot|spider|crawl(er)?|slurp|curl|wget|python-requests|python-urllib|go-http-client|okhttp|node-fetch|axios|scrapy|libwww-perl|headlesschrome|phantomjs|facebookexternalhit|meta-externalagent/i;

export function isKnownBotRequest(headers: Headers): boolean {
  const userAgent = headers.get("user-agent");
  if (!userAgent) return true;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}
