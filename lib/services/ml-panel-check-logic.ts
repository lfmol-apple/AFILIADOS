/**
 * Pure helpers for the live check that runs when the owner pastes an
 * affiliate link on /admin/fila-links: does the link lead to the product of
 * that row? No database, no network — see ml-panel-check.ts for the part that
 * opens the link.
 */

export interface ExpectedIds {
  /** Catalog product id (/p/MLB123), the one the pasted link should lead to. */
  catalogId: string | null;
  /** Listing id from pdp_filters=item_id:MLB456 (not comparable to a catalog id). */
  itemId: string | null;
}

/** What the panel card's generic address says the product is. */
export function expectedIdsFromProductUrl(url?: string): ExpectedIds {
  if (!url) return { catalogId: null, itemId: null };
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    // keep the raw text
  }
  const catalog = /\/p\/(MLB\d{6,})/i.exec(decoded);
  const item = /item_id:(MLB\d{6,})/i.exec(decoded);
  return {
    catalogId: catalog ? catalog[1]!.toUpperCase() : null,
    itemId: item ? item[1]!.toUpperCase() : null,
  };
}

/** The product title of a Mercado Livre page (og:title, else <title>). */
export function pageTitleFromHtml(html: string): string | null {
  const og =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(
      html,
    ) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(
      html,
    );
  const raw = og?.[1] ?? /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1];
  if (!raw) return null;
  const text = raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const cleaned = text.replace(/\s*[|\-–]\s*Mercado\s*Livre.*$/i, "").trim();
  return cleaned || null;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2);
}

/**
 * Share (0..1) of the panel title's first six significant words that also
 * appear in the page title. Words are matched by prefix of 5 letters so
 * "retratil"/"retratil" and small plural/suffix differences still count.
 */
export function titleSimilarity(panelTitle: string, pageTitle: string): number {
  const need = words(panelTitle).slice(0, 6);
  if (need.length === 0) return 0;
  const have = words(pageTitle);
  const hit = need.filter((w) =>
    have.some((h) => h === w || (w.length >= 5 && h.startsWith(w.slice(0, 5)))),
  ).length;
  return hit / need.length;
}

export type LinkCheckVerdict = "match" | "likely" | "mismatch" | "unknown";

/**
 * match    = the link leads to the very catalog product of the row (same id).
 * likely   = same product by title (ids not comparable or they changed).
 * mismatch = a different product: do not save without an explicit override.
 * unknown  = could not read the link's product.
 */
export function decideVerdict(input: {
  expectedCatalogId: string | null;
  resolvedCatalogId: string | null;
  similarity: number | null;
}): LinkCheckVerdict {
  const { expectedCatalogId, resolvedCatalogId, similarity } = input;
  if (expectedCatalogId && resolvedCatalogId) {
    if (expectedCatalogId === resolvedCatalogId) return "match";
    if (similarity !== null && similarity >= 0.6) return "likely";
    return "mismatch";
  }
  if (similarity === null) return "unknown";
  if (similarity >= 0.6) return "likely";
  if (similarity <= 0.2) return "mismatch";
  return "unknown";
}

/** The affiliate profile / tracking tag the owner's links must carry. */
export const AFFILIATE_PROFILE_MARKERS = [
  "matt_word=precocaindo",
  "matt_tool=85497435",
  "matt_tool_id=85497435",
  "/social/mohe4109227",
] as const;

/** True when the opened link shows the owner's affiliate profile/tag. */
export function carriesOwnerProfile(finalUrlAndHtml: string): boolean {
  let text = finalUrlAndHtml;
  try {
    text = decodeURIComponent(finalUrlAndHtml);
  } catch {
    // keep raw
  }
  return AFFILIATE_PROFILE_MARKERS.some((m) => text.includes(m));
}
