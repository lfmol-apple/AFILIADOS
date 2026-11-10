import { detectPriceDrop } from "@/lib/services/radar";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

export interface TelegramPostCandidate {
  merchantListingId: string;
  title: string;
  merchantSlug: "mercado-livre" | "shopee";
  externalId: string;
  currentPrice: number;
  previousPrice: number;
  dropPercent: number;
  /** True only when currentPrice is the lowest ever observed for this
   * listing — never claimed unless the full history actually supports it
   * (project rule: never a claim the data can't back up). */
  isAllTimeLow: boolean;
}

const MERCHANT_SLUG: Record<MerchantListingFacts["merchant"], "mercado-livre" | "shopee"> = {
  MERCADO_LIVRE: "mercado-livre",
  SHOPEE: "shopee",
};

/**
 * Pure: turns one listing's already-assembled facts into a post candidate,
 * or null when there's no real price drop to report — the exact same
 * detectPriceDrop (lib/services/radar.ts) the Radar feed and the
 * publication gate already use, so this channel can never claim a drop
 * the rest of the site wouldn't also recognize as real.
 */
export function buildTelegramPostCandidate(
  facts: MerchantListingFacts,
): TelegramPostCandidate | null {
  const event = detectPriceDrop(facts.merchantListingId, facts.priceHistory);
  if (!event) return null;

  // detectPriceDrop always populates all three together when it returns a
  // non-null event — RadarEvidence's fields are optional only because
  // other event types populate different ones.
  const currentPrice = event.evidence.currentPrice!;
  const previousPrice = event.evidence.previousPrice!;
  const dropPercent = event.evidence.dropPercent!;
  const lowestEver = Math.min(...facts.priceHistory.map((p) => p.price));

  return {
    merchantListingId: facts.merchantListingId,
    title: facts.title,
    merchantSlug: MERCHANT_SLUG[facts.merchant],
    externalId: facts.externalId,
    currentPrice,
    previousPrice,
    dropPercent,
    isAllTimeLow: currentPrice <= lowestEver,
  };
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MERCHANT_LABEL: Record<"mercado-livre" | "shopee", string> = {
  "mercado-livre": "Mercado Livre",
  shopee: "Shopee",
};

/**
 * One Telegram message per candidate. The honesty rule from the owner's
 * own brief (2026-11-10): never claim "menor preço histórico" unless it
 * really is — otherwise say "entre os menores" instead. siteUrl's /go/
 * link goes straight to the store, never to our own site, by design (the
 * channel exists to deliver the deal with zero extra clicks; the site's
 * own URL is attribution only, in the signature, never the destination).
 */
export function buildTelegramMessage(
  candidate: TelegramPostCandidate,
  siteUrl: string,
): string {
  const dropLine = candidate.isAllTimeLow
    ? `📉 Nunca esteve tão barato por aqui — menor preço já registrado`
    : `📉 Caiu ${Math.round(candidate.dropPercent * 100)}% — estava em ${formatBRL(candidate.previousPrice)}`;

  const link = `${siteUrl}/go/${candidate.merchantSlug}/${encodeURIComponent(candidate.externalId)}?pageType=telegram&source=telegram`;

  return [
    `🔻 *${candidate.title}*`,
    "",
    `💰 ${formatBRL(candidate.currentPrice)} no ${MERCHANT_LABEL[candidate.merchantSlug]}`,
    dropLine,
    `🔗 ${link}`,
    "",
    `_dados: precocaindo.com.br_`,
  ].join("\n");
}
