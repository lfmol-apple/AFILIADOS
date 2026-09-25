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

/**
 * Share (0..1) of ALL significant words the two titles have in common (Jaccard).
 * >= 0.9 means the titles are practically the same text.
 */
export function titleJaccard(a: string, b: string): number {
  const setA = new Set(words(a));
  const setB = new Set(words(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let common = 0;
  for (const w of setA) if (setB.has(w)) common += 1;
  return common / (setA.size + setB.size - common);
}

/** Titles this alike count as the same product when ids can't be compared. */
export const EXACT_TITLE_JACCARD = 0.9;

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
  /** Titles practically identical (see EXACT_TITLE_JACCARD). */
  exactTitle?: boolean;
}): LinkCheckVerdict {
  const { expectedCatalogId, resolvedCatalogId, similarity } = input;
  if (expectedCatalogId && resolvedCatalogId) {
    if (expectedCatalogId === resolvedCatalogId) return "match";
    if (similarity !== null && similarity >= 0.6) return "likely";
    return "mismatch";
  }
  if (input.exactTitle) return "match";
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

export interface MatchablePick {
  id: string;
  title: string;
  productUrl?: string;
}

export interface LinkMatch {
  pickId: string | null;
  /**
   * id = same catalog product id; title-exact = ids not comparable but the
   * titles are practically identical; title = only the title roughly agrees.
   */
  how: "id" | "title-exact" | "title" | null;
}

/**
 * Which queue row does an opened link belong to? By catalog id first (exact),
 * else by title (identical text, then similarity >= 0.7). `picks` are in queue
 * order, so ties keep the earlier row.
 */
export function matchOpenedLinkToPick(
  opened: { catalogId: string | null; title: string | null },
  picks: readonly MatchablePick[],
): LinkMatch {
  if (opened.catalogId) {
    const byId = picks.find(
      (p) =>
        expectedIdsFromProductUrl(p.productUrl).catalogId === opened.catalogId,
    );
    if (byId) return { pickId: byId.id, how: "id" };
  }
  if (opened.title) {
    let best: { id: string; jaccard: number; score: number } | null = null;
    for (const p of picks) {
      const score = titleSimilarity(p.title, opened.title);
      const jaccard = titleJaccard(p.title, opened.title);
      if (score < 0.7 && jaccard < EXACT_TITLE_JACCARD) continue;
      if (
        !best ||
        jaccard > best.jaccard ||
        (jaccard === best.jaccard && score > best.score)
      )
        best = { id: p.id, jaccard, score };
    }
    if (best)
      return {
        pickId: best.id,
        how: best.jaccard >= EXACT_TITLE_JACCARD ? "title-exact" : "title",
      };
  }
  return { pickId: null, how: null };
}

/** Splits pasted text into unique http(s) links, in order. */
export function parseBatchLinks(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const link = raw
      .trim()
      .replace(/^[("'<]+/, "")
      .replace(/[)"'>,.;]+$/, "");
    if (!/^https?:\/\//i.test(link) || seen.has(link)) continue;
    seen.add(link);
    out.push(link);
  }
  return out;
}
