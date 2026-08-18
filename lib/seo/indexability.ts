/**
 * Shared bar for "does this product page have enough real content to
 * deserve indexing" — used identically by the product page's robots
 * metadata and by the sitemap, so the two can never disagree (project
 * brief Part Y: "Sitemap deve conter somente URLs canônicas e
 * publicáveis"). A page can still exist and be viewed even when this
 * returns false — it just isn't offered to crawlers.
 */
export function isProductPageIndexable(input: {
  coverageDays: number;
  hasDescription: boolean;
  specCount: number;
}): boolean {
  return input.coverageDays >= 2 || input.hasDescription || input.specCount > 0;
}
