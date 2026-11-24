import {
  commissionToScore,
  ratingToScore,
  salesToScore,
} from "@/lib/services/shopee-cycle-collector";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import type { MonetizationScoreInput } from "@/types/monetization";

/**
 * The score a Mercado Livre product gets when it enters through the panel
 * queue. The public /ofertas feed ranks by the commission-free part of this
 * score (demand + offer quality); without a row the product sank to the last
 * pages (found 2026-09-25: 0 of 270 ML products had one, so /ofertas only
 * showed Shopee until page 12). Same mappings as the Shopee cycle, from what
 * the panel showed for that row: "+N vendidos" (a lower bound), the star
 * rating and the commission rate.
 */
export function panelPickScoreInput(pick: {
  sold: number;
  rating: number | null;
  rate: number;
}): MonetizationScoreInput {
  return {
    demandSignal:
      pick.sold > 0
        ? { value: salesToScore(pick.sold), quality: "OBSERVED" }
        : null,
    commissionSignal: {
      value: commissionToScore(pick.rate),
      quality: "OBSERVED",
    },
    trendSignal: null,
    historicalConversionSignal: null,
    offerQualitySignal:
      pick.rating !== null
        ? { value: ratingToScore(pick.rating), quality: "OBSERVED" }
        : null,
  };
}

export function scorePanelPick(pick: {
  sold: number;
  rating: number | null;
  rate: number;
}) {
  return calculateMonetizationScore(panelPickScoreInput(pick));
}
