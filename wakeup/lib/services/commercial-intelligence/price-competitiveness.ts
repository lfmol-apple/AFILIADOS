import { detectPriceDrop } from "@/lib/services/radar";
import type { SiblingOffer } from "@/lib/services/commercial-intelligence/sibling-offers";

/**
 * Real price-competitiveness evidence (owner's authorization, 2026-11-19,
 * section 5): "já possuímos múltiplas ofertas de vendedores diferentes
 * para produtos equivalentes... compare preços... selecione ofertas
 * efetivamente competitivas." Takes pre-fetched real sibling offers
 * (lib/services/commercial-intelligence/sibling-offers.ts) — never
 * queries on its own, so this and the eligibility gate always see the
 * exact same real data from one query.
 *
 * Discount/drop evidence reuses detectPriceDrop (lib/services/radar.ts) —
 * the exact same detector the public site, Telegram channel and WhatsApp
 * digest already require for a "promoção" claim, never a second,
 * competing definition of what counts as a real discount.
 */

export interface PriceCompetitivenessEvidence {
  /** 0..100 — 100 = cheapest among real sibling offers found; null when
   * fewer than 2 real offers exist to compare (nothing to rank against). */
  competitivenessScore: number | null;
  siblingOfferCount: number;
  cheapestPrice: number | null;
  thisPrice: number | null;
  /** True only when lib/services/radar.ts's detectPriceDrop confirms a
   * real drop against this listing's own price history — never inferred
   * from the sibling comparison alone. */
  hasConfirmedPriceDrop: boolean;
  priceDropHeadline: string | null;
  detail: string;
}

export function evaluatePriceCompetitiveness(input: {
  merchantListingId: string;
  siblingOffers: readonly SiblingOffer[];
  thisPrice: number | null;
  priceHistory: Array<{ price: number; observedAt: Date }>;
}): PriceCompetitivenessEvidence {
  const siblingPrices = input.siblingOffers.map((o) => o.price);
  const priceDrop = detectPriceDrop(input.merchantListingId, input.priceHistory);

  if (siblingPrices.length === 0 || input.thisPrice === null) {
    return {
      competitivenessScore: null,
      siblingOfferCount: siblingPrices.length,
      cheapestPrice: siblingPrices.length > 0 ? Math.min(...siblingPrices) : null,
      thisPrice: input.thisPrice,
      hasConfirmedPriceDrop: priceDrop !== null,
      priceDropHeadline: priceDrop?.headline ?? null,
      detail:
        siblingPrices.length === 0
          ? "Nenhuma outra oferta real do mesmo produto de catálogo encontrada para comparar preço."
          : "Preço deste anúncio ainda não confirmado — sem base para comparar.",
    };
  }

  const allPrices = [...siblingPrices, input.thisPrice].sort((a, b) => a - b);
  const rank = allPrices.indexOf(input.thisPrice); // 0 = cheapest
  const competitivenessScore = Math.round(((allPrices.length - 1 - rank) / (allPrices.length - 1)) * 100);

  return {
    competitivenessScore,
    siblingOfferCount: siblingPrices.length,
    cheapestPrice: allPrices[0]!,
    thisPrice: input.thisPrice,
    hasConfirmedPriceDrop: priceDrop !== null,
    priceDropHeadline: priceDrop?.headline ?? null,
    detail: `Preço comparado a ${siblingPrices.length} outra(s) oferta(s) real(is) do mesmo produto de catálogo — posição ${rank + 1}ª de ${allPrices.length} (1ª = mais barata).`,
  };
}
