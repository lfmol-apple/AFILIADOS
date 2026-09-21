/**
 * Mercado Livre affiliate commission, per /ofertas category, as OBSERVED in
 * the owner's affiliate panel ("Perfil de afiliado > Produtos selecionados")
 * on 2026-09-21. ML exposes no commission in any API this project uses, so
 * this is an estimate for choosing WHICH links to register next — it never
 * touches public ranking (commission-free by rule) and is not a contract
 * rate. Temporary "Ganhos extras" campaigns (up to 62% on single items) are
 * deliberately NOT encoded: they expire, so they must be read from the panel.
 *
 * `null` = not observed yet; those categories are shown as "sem dado" rather
 * than guessed. Extend it as more panel pages are read.
 */
export interface CommissionTier {
  rate: number | null;
  evidence: string;
}

export const ML_COMMISSION_TIERS: Readonly<Record<string, CommissionTier>> = {
  "esporte-suplementos": { rate: 0.16, evidence: "creatina 16%" },
  beleza: { rate: 0.16, evidence: "escova secadora e prancha 16%" },
  moda: { rate: 0.16, evidence: "tênis 16% (relógio 12%)" },
  casa: { rate: 0.12, evidence: "canecas, bowls 12%" },
  ferramentas: { rate: 0.12, evidence: "parafusadeira, kit de lavagem 12%" },
  eletrodomesticos: {
    rate: 0.05,
    evidence: "air fryer, geladeira, fogão, cafeteira 5%",
  },
  celulares: { rate: 0.05, evidence: "Moto G06 5%, pilhas 5%" },
  "audio-games": {
    rate: null,
    evidence: "só campanhas extras vistas (PS5 20%, câmeras 16%)",
  },
  informatica: { rate: null, evidence: "não observado" },
  bebe: { rate: null, evidence: "não observado" },
  pet: { rate: null, evidence: "não observado" },
  limpeza: { rate: null, evidence: "não observado" },
  outros: { rate: null, evidence: "não observado" },
};

/**
 * Observed outside the site's current categories (panel, 2026-09-21):
 * Supermercado / Alimentos e Bebidas — 21 products, ALL under "Ganhos
 * extras", from 4% to 20%, median 10% (most 8-16%; e.g. protein 4%, aloe
 * 20%). Not in ML_GENERAL_SCAN_CATEGORY_GROUPS and not an /ofertas category
 * yet, so nothing in the catalog covers it today.
 */
export const ML_OBSERVED_FOOD_COMMISSION = { min: 0.04, median: 0.1, max: 0.2, sample: 21 } as const;

export function estimatedCommissionRate(categorySlug: string): number | null {
  return ML_COMMISSION_TIERS[categorySlug]?.rate ?? null;
}
