/**
 * Real GTIN/EAN validation (ProductMatcher Shadow Mode, 2026-09-08 —
 * project brief: "Não considerar qualquer sequência numérica como GTIN").
 * Before this file, product-matcher.ts treated any two equal strings as a
 * GTIN match — a typo, a placeholder, or an unrelated numeric code shared
 * by coincidence would silently produce a CONFIRMED match, the strongest
 * status this system can ever emit. Pure and deterministic, no network,
 * no database — the standard GS1 mod-10 check digit algorithm, valid for
 * GTIN-8/12/13/14 (UPC-A is GTIN-12, EAN-13 is GTIN-13).
 */

/** Digits only, trimmed — never treats "789-123..." or padded values as
 * automatically different from "789123...", but never invents digits
 * either (a value with letters mixed in is left as-is and will simply
 * fail the length/digit-only check below, which is correct: a real GTIN
 * is numeric). */
export function normalizeGtin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

const VALID_LENGTHS = new Set([8, 12, 13, 14]);

/** GS1 standard check-digit algorithm: from the digit immediately left of
 * the check digit, moving left, weights alternate 3,1,3,1,... The check
 * digit itself is `(10 - (sum % 10)) % 10`. Works uniformly for GTIN-8/
 * 12/13/14 (the alternating pattern is defined relative to the check
 * digit, not a fixed length). */
function computeCheckDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  let weight = 3;
  for (let i = digitsWithoutCheck.length - 1; i >= 0; i--) {
    sum += Number(digitsWithoutCheck[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** True only for a numeric string of a real GTIN length (8/12/13/14) whose
 * final digit is the correct GS1 check digit for the rest. Rejects
 * anything else outright — including something that merely "looks like"
 * a barcode (wrong length, non-digit characters, wrong check digit) —
 * never guessed or relaxed to produce a match. */
export function isValidGtin(value: string | null | undefined): boolean {
  const normalized = normalizeGtin(value);
  if (!normalized) return false;
  if (!/^\d+$/.test(normalized)) return false;
  if (!VALID_LENGTHS.has(normalized.length)) return false;
  const body = normalized.slice(0, -1);
  const checkDigit = Number(normalized.slice(-1));
  return computeCheckDigit(body) === checkDigit;
}

/**
 * Two listings' GTIN values are treated as the same real-world product
 * ONLY when both individually pass `isValidGtin` AND are equal once
 * normalized (currently just trimmed — GTINs from different sources are
 * not zero-padded to a common length here, since forcing that would risk
 * conflating a real GTIN-12 with an unrelated GTIN-13 that merely shares
 * digits). Two invalid-looking values that happen to be textually equal
 * are deliberately NOT a match — equal garbage is still garbage, never
 * promoted to the strongest evidence tier this system has.
 */
export function gtinsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!isValidGtin(a) || !isValidGtin(b)) return false;
  return normalizeGtin(a) === normalizeGtin(b);
}
