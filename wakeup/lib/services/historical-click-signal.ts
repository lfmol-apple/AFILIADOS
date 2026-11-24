import { prisma } from "@/lib/db";

/**
 * MonetizationScore's historicalConversion component (docs/MONETIZATION_SCORE.md:
 * "vem do próprio histórico do PreçoCaindo (clique/conversão)") has never
 * been wired to real data — every collector passes
 * historicalConversionSignal: null, so this component stays UNKNOWN
 * forever, capping confidence at ~35% even for listings observed for
 * months. Real conversion (purchase) data doesn't exist yet (no
 * marketplace conversionReport is implemented — see docs/AFFILIATE_LINK_
 * REGISTRY.md), but real CLICK data already does: every /go/ redirect
 * writes an AffiliateClick row. Click volume is an honest, if imperfect,
 * proxy for "someone is genuinely interested in this listing" — the best
 * evidence available today, not a fabricated one.
 *
 * quality is always HISTORICAL_INTERNAL when clicks exist (never
 * OBSERVED/DERIVED_FROM_OBSERVED — this is PreçoCaindo's own internal
 * history, not a marketplace-observed fact), and null (never 0) when
 * there's no click yet — same "absence of evidence is not zero evidence"
 * rule every other component already follows.
 */

/** Below this many real clicks, a single stray click shouldn't move the
 * score — same "evidence, not noise" bar the rest of the engine holds
 * itself to. */
const MIN_CLICKS_FOR_SIGNAL = 1;

/** Clicks at or above this count max out the signal (value=100), linear
 * below it. A documented, conservative judgment call — revisit once real
 * conversion data (not just clicks) exists to calibrate against. */
const CLICKS_FOR_MAX_SIGNAL = 10;

export async function getHistoricalClickSignal(
  merchantListingId: string,
): Promise<{ value: number; quality: "HISTORICAL_INTERNAL" } | null> {
  const clicks = await prisma.affiliateClick.count({ where: { merchantListingId } });
  if (clicks < MIN_CLICKS_FOR_SIGNAL) return null;
  const value = Math.min(100, Math.round((clicks / CLICKS_FOR_MAX_SIGNAL) * 100));
  return { value, quality: "HISTORICAL_INTERNAL" };
}
