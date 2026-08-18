/**
 * A single short, honest line describing today's price relative to its
 * 30-day average — used by both the product card and the product page's
 * ScorePanel so they never say something the underlying stats don't
 * support. Returns null whenever there isn't enough data to say anything
 * (no avg30d yet, or the price is close enough to the average that
 * "abaixo"/"acima" would be a rounding artifact, not a real signal).
 */
export function priceEvidenceLine(
  currentPrice: number,
  avg30d: number | null,
): string | null {
  if (avg30d === null || avg30d <= 0) return null;
  const diffPercent = ((currentPrice - avg30d) / avg30d) * 100;
  if (Math.abs(diffPercent) < 1) return null;
  return diffPercent < 0
    ? "Abaixo da média de 30 dias"
    : "Acima da média de 30 dias";
}
