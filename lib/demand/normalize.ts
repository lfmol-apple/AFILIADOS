/** Normalizes a raw keyword/query for grouping and deduplication — not a
 * slug (keeps spaces), just case/whitespace/accent normalization. */
export function normalizeKeyword(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
