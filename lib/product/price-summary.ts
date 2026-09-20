export interface PriceObservation {
  price: number;
  observedAt: Date;
}

export interface PriceSummary {
  observations: number;
  min: number;
  max: number;
  first: Date;
  last: Date;
  /** Current price relative to the observed range. */
  position: "at-low" | "near-low" | "middle" | "near-high" | "at-high" | "flat";
}

/**
 * Summarises ONLY what the collector actually observed. Returns null with
 * fewer than two observations — one point is not a history and we never
 * pad it.
 */
export function summarizePriceHistory(
  history: PriceObservation[],
  currentPrice: number | null,
): PriceSummary | null {
  const valid = history.filter((h) => Number.isFinite(h.price) && h.price > 0);
  if (valid.length < 2) return null;
  const prices = valid.map((h) => h.price);
  const times = valid.map((h) => h.observedAt.getTime());
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const price = currentPrice ?? valid[valid.length - 1]!.price;

  let position: PriceSummary["position"];
  if (max === min) {
    position = "flat";
  } else {
    const ratio = (price - min) / (max - min);
    if (price <= min) position = "at-low";
    else if (price >= max) position = "at-high";
    else if (ratio <= 0.25) position = "near-low";
    else if (ratio >= 0.75) position = "near-high";
    else position = "middle";
  }
  return {
    observations: valid.length,
    min,
    max,
    first: new Date(Math.min(...times)),
    last: new Date(Math.max(...times)),
    position,
  };
}

export const PRICE_POSITION_TEXT: Record<PriceSummary["position"], string> = {
  "at-low": "O preço atual é o menor que já registramos para este produto.",
  "near-low": "O preço atual está perto do menor valor que já registramos.",
  middle: "O preço atual está no meio da faixa que já registramos.",
  "near-high": "O preço atual está perto do maior valor que já registramos.",
  "at-high": "O preço atual é o maior que já registramos para este produto.",
  flat: "O preço não variou nas vezes em que conferimos.",
};
