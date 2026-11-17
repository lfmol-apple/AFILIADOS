import { getOffersPool } from "@/lib/queries/offers-feed";
import { selectTopUnifiedOffers, type UnifiedOfferCard } from "@/lib/queries/unified-offers";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";
import { buildTelegramPostCandidate } from "@/lib/services/price-drop-digest";

/** Owner's brief, 2026-11-17: "aproximadamente 8 a 12 produtos... Não
 * exiba produtos sem preço válido nem force uma quantidade mínima quando
 * não houver produtos qualificados." */
export const HOME_OFFERS_TARGET = 12;

/**
 * "Melhores oportunidades agora" — the home page's new commercial block.
 * Reuses the exact same cached, ranked, price-filtered pool /ofertas
 * already serves (getOffersPool/selectTopUnifiedOffers, unchanged) —
 * never a second ranking system. The only new work here is checking
 * each of the small number of selected cards (never the whole pool) for
 * a real, Radar-verified price drop, the same detectPriceDrop +
 * buildTelegramPostCandidate the Telegram channel and the new WhatsApp
 * tier already trust — cheap here specifically because the set is
 * bounded to HOME_OFFERS_TARGET, unlike the full /ofertas grid.
 */
export async function loadHomeOffers(
  limit: number = HOME_OFFERS_TARGET,
): Promise<UnifiedOfferCard[]> {
  const pool = await getOffersPool();
  const top = selectTopUnifiedOffers(pool, limit);

  return Promise.all(
    top.map(async (card): Promise<UnifiedOfferCard> => {
      try {
        const facts = await loadMerchantListingFactsByListingId(card.id);
        if (!facts) return card;
        const candidate = buildTelegramPostCandidate(facts);
        if (!candidate) return card;
        return {
          ...card,
          verifiedDrop: {
            dropPercent: candidate.dropPercent,
            isAllTimeLow: candidate.isAllTimeLow,
          },
        };
      } catch {
        return card; // ambiguous evidence is never grounds to claim a drop
      }
    }),
  );
}
