/**
 * Inteligência de potencial publicitário (owner's authorization,
 * 2026-11-19, "Autorizo a construção integral dessa camada agora",
 * section 1): "compra por impulso, faixa de preço, apelo visual,
 * facilidade de compreensão da oferta, comissão potencial em reais e
 * adequação à publicidade em redes sociais."
 *
 * Every field here is explicitly a HYPOTHESIS, never performance — the
 * strategic review the same day established that visual appeal, impulse
 * fit and conversion propensity cannot be predicted from catalog data
 * alone; they can only be CONFIRMED by real ad delivery (CTR/CPA), which
 * is what lib/services/commercial-intelligence/ad-performance.ts (once
 * real campaign data exists) is for. This module never claims to predict
 * outcomes — it only flags which commercial archetype a candidate fits,
 * as a reviewable, falsifiable guess, with its own reasoning attached.
 * Owner's explicit rule: "não considere categorias inteiras inadequadas
 * sem evidências" — every category starts neutral; only real signals
 * (price band, confirmed discount) move the hypothesis, never a
 * hardcoded category blocklist.
 */

export type ImpulseFitHypothesis = "alto" | "moderado" | "baixo" | "indeterminado";

export interface AdPotentialHypothesis {
  impulseFit: ImpulseFitHypothesis;
  /** Always present — the hypothesis without its reasoning is exactly
   * what the owner's rule forbids presenting as if it were a fact. */
  impulseFitReason: string;
  /** Owner's requirement: "facilidade de compreensão da oferta" — a
   * title that is extremely long/cluttered (common in ML SEO-stuffed
   * titles) is genuinely harder to grasp in a 1-second ad glance than a
   * short, clear one. A real, measurable proxy (character count),
   * never a subjective read of the title's quality. */
  offerClarity: "clara" | "poluida" | "indeterminado";
  offerClarityReason: string;
  /** Real, confirmed discount (reuses detectPriceDrop's own output,
   * never a second definition) is the one ad-creative-relevant signal
   * this module can state as fact, not hypothesis. */
  hasVisibleDiscountHook: boolean;
  /** Owner's explicit instruction: this is a HYPOTHESIS layer, so it
   * never produces a final verdict — only a note for a human or a future
   * real-performance signal to confirm or refute. */
  note: string;
}

const LOW_PRICE_IMPULSE_THRESHOLD = 150; // R$ — classic cold-traffic impulse-buy ceiling
const MID_PRICE_THRESHOLD = 400;
const CLUTTERED_TITLE_CHAR_THRESHOLD = 90; // real ML titles above this are keyword-stuffed, not descriptive

export function evaluateAdPotentialHypothesis(input: {
  title: string;
  currentPrice: number | null;
  hasConfirmedPriceDrop: boolean;
}): AdPotentialHypothesis {
  let impulseFit: ImpulseFitHypothesis;
  let impulseFitReason: string;

  if (input.currentPrice === null) {
    impulseFit = "indeterminado";
    impulseFitReason = "Sem preço confirmado — impossível avaliar faixa de preço.";
  } else if (input.currentPrice <= LOW_PRICE_IMPULSE_THRESHOLD) {
    impulseFit = "alto";
    impulseFitReason = `Preço (R$ ${input.currentPrice.toFixed(2)}) está na faixa clássica de decisão de compra rápida (<= R$ ${LOW_PRICE_IMPULSE_THRESHOLD}) — hipótese, nunca desempenho comprovado.`;
  } else if (input.currentPrice <= MID_PRICE_THRESHOLD) {
    impulseFit = "moderado";
    impulseFitReason = `Preço (R$ ${input.currentPrice.toFixed(2)}) exige mais consideração que uma compra por impulso típica, mas ainda é acessível.`;
  } else {
    impulseFit = "baixo";
    impulseFitReason = `Preço (R$ ${input.currentPrice.toFixed(2)}) é alto o suficiente para favorecer compra racional/pesquisada — tráfego frio de rede social tende a converter pior aqui, por hipótese.`;
  }

  const titleLength = input.title.trim().length;
  const offerClarity = titleLength === 0 ? "indeterminado" : titleLength <= CLUTTERED_TITLE_CHAR_THRESHOLD ? "clara" : "poluida";
  const offerClarityReason =
    offerClarity === "poluida"
      ? `Título com ${titleLength} caracteres — títulos muito longos (comuns no ML por SEO) são mais difíceis de entender num anúncio de rolagem rápida.`
      : offerClarity === "clara"
        ? `Título com ${titleLength} caracteres — direto o suficiente para um anúncio de rolagem rápida.`
        : "Título vazio — não avaliável.";

  return {
    impulseFit,
    impulseFitReason,
    offerClarity,
    offerClarityReason,
    hasVisibleDiscountHook: input.hasConfirmedPriceDrop,
    note: "Hipótese comercial, não desempenho comprovado — só a entrega real do anúncio (CTR/CPA) confirma ou refuta isso.",
  };
}
