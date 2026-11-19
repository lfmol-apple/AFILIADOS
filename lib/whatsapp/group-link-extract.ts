/**
 * Pure helpers for the WhatsApp group harvester (owner's brief,
 * 2026-11-18): piggyback on promo groups the paired number is a member
 * of, pull out any Shopee/Mercado Livre product link, and ignore
 * everything else ("limpar ruídos" — stickers, plain chat, unrelated
 * domains). No side effects here — network calls (redirect resolution)
 * and persistence live in lib/services/whatsapp-group-harvest.ts, so
 * this file stays trivially testable.
 */

const URL_PATTERN = /https?:\/\/[^\s)>\]]+/gi;

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_PATTERN)].map((m) => m[0]);
}

const SHOPEE_HOST = /(^|\.)shopee\.com\.br$/i;
const SHOPEE_SHORT_HOST = /(^|\.)s\.shopee\.com\.br$|^shp\.ee$/i;
const ML_HOST = /(^|\.)mercadolivre\.com(\.br)?$|^meli\.la$/i;
// "link.amazon" (seen live, 2026-11-18, forwarded from the SeuLinkAki
// channel) isn't a real Amazon-owned domain — it's a third-party
// coupon/deal shortener branding itself after Amazon. amzn.to/a.co ARE
// Amazon's own. All three only ever carry a short link that still needs
// resolving — the real amazon.com.br/dp/ASIN destination is never in the
// short URL itself.
const AMAZON_HOST = /(^|\.)amazon\.com\.br$/i;
const AMAZON_SHORT_HOST = /^amzn\.to$|^a\.co$|^link\.amazon$/i;

export type HarvestMerchant = "SHOPEE" | "MERCADO_LIVRE" | "AMAZON";

/** Hostname-only classification — a shortened Shopee/Amazon link still
 * needs lib/services/whatsapp-group-harvest.ts to resolve it before a
 * real item id/ASIN can be read, but it's still correctly classified
 * here. */
export function classifyMerchantUrl(url: string): HarvestMerchant | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  if (SHOPEE_HOST.test(hostname) || SHOPEE_SHORT_HOST.test(hostname)) return "SHOPEE";
  if (ML_HOST.test(hostname)) return "MERCADO_LIVRE";
  if (AMAZON_HOST.test(hostname) || AMAZON_SHORT_HOST.test(hostname)) return "AMAZON";
  return null;
}

/** True for a link that needs an HTTP redirect-follow before its real
 * product id can be read (shortened Shopee links never carry the
 * `-i.{shopId}.{itemId}` pattern themselves). */
export function isShortenedShopeeUrl(url: string): boolean {
  try {
    return SHOPEE_SHORT_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Same idea for Amazon's own (amzn.to/a.co) and third-party
 * ("link.amazon") short links — none carry a real ASIN until resolved. A
 * real amazon.com.br URL, by contrast, almost always already has it. */
export function isShortenedAmazonUrl(url: string): boolean {
  try {
    return AMAZON_SHORT_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Shopee product URLs end in `-i.{shopId}.{itemId}` — confirmed shape,
 * same one lib/providers/shopee-provider.ts's toNormalizedProduct relies
 * on for `offer.itemId`. Returns null for anything else (a shop's own
 * storefront link, a category link, a still-shortened link). */
export function extractShopeeItemId(url: string): number | null {
  const match = url.match(/-i\.\d+\.(\d+)(?:[/?#]|$)/);
  if (!match) return null;
  const itemId = Number(match[1]);
  return Number.isInteger(itemId) ? itemId : null;
}

/** Mercado Livre catalog ids ("MLB" + digits) — same normalization
 * lib/services/ml-panel-register.ts's extractCatalogProductId uses, kept
 * independent here since that one is tuned for the affiliate panel's
 * repeated-mentions HTML, not a single chat URL. */
export function extractMlCatalogId(url: string): string | null {
  const match = url.match(/MLB-?(\d{6,})/i);
  return match ? `MLB${match[1]}` : null;
}

const ASIN_IN_URL_PATTERN = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i;

/** A real amazon.com.br product URL always has the ASIN in one of these
 * path shapes — lib/amazon/policy-guard.ts's own ASIN_PATTERN (10
 * alphanumeric chars) decides what counts as valid, reused here rather
 * than duplicated so the two can never silently disagree. */
export function extractAmazonAsinFromUrl(url: string): string | null {
  const match = url.match(ASIN_IN_URL_PATTERN);
  return match ? match[1]!.toUpperCase() : null;
}

/**
 * Two real BRL amounts in the message text — the coupon format seen live
 * ("de ~R$ 62,99~ por *R$ 30,10*") always states both. Returns the LOWER
 * one as the sale price (never guessed — if only one amount is found,
 * that's the sale price with no "original" to compare against; if the
 * text's own two numbers don't form a real discount, callers decide what
 * to do, this function only ever reports what's literally written).
 */
export function extractPriceHints(text: string): { salePrice: number; originalPrice: number | null } | null {
  const matches = [...text.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map((m) =>
    Number(m[1]!.replace(/\./g, "").replace(",", ".")),
  );
  const real = matches.filter((n) => Number.isFinite(n) && n > 0);
  if (real.length === 0) return null;
  if (real.length === 1) return { salePrice: real[0]!, originalPrice: null };
  const sorted = [...real].sort((a, b) => a - b);
  return { salePrice: sorted[0]!, originalPrice: sorted[sorted.length - 1]! };
}

/**
 * A short, honest title from the message text — the first real line
 * (coupon posts always lead with the product name, e.g. "SHAMPOO DE
 * GLICERINA *JOHNSON'S BABY* 750ML 🫧"), with markdown emphasis and
 * emoji stripped. Never invents a title when the text has nothing usable
 * — callers must treat null as "skip, no honest title available."
 */
export function extractTitleHint(text: string): string | null {
  const firstLine = text.split("\n")[0] ?? "";
  const cleaned = firstLine
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[*_~]/g, "")
    .trim();
  return cleaned.length >= 5 ? cleaned : null;
}
