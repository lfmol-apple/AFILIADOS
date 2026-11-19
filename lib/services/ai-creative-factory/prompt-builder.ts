/**
 * Builds the AI image-edit prompt from REAL, already-verified product
 * data only (owner's explicit rule, 2026-11-19: "nunca invente preços,
 * avaliações, benefícios, descontos ou quantidades vendidas"). Every
 * value accepted here must already trace to a real source elsewhere in
 * this codebase (MerchantListingFacts, VitrineScoreResult,
 * evaluateAdPotentialHypothesis) — this module never queries anything on
 * its own, so it can never silently invent a fact that doesn't exist.
 *
 * Category-aware creative direction (owner's section 4: "a inteligência
 * deverá decidir individualmente qual composição tem maior potencial") —
 * a real, reviewable mapping from the product's own real category/domain
 * signal to an environment/mood direction, never a random/LLM-improvised
 * choice at request time (so the SAME category always gets a consistent
 * creative direction, auditable and adjustable here, in code).
 */

export interface CreativePromptInputs {
  title: string;
  brand: string | null;
  categoryHint: string | null; // real domain_id/category name, when known
  currentPrice: number;
  referencePrice: number | null; // real "before" price, only when a drop is confirmed
  hasConfirmedDiscount: boolean;
  rating: number | null; // real, only when the marketplace actually exposes it
  soldQuantityLabel: string | null; // real bucket label (e.g. "+1000 vendidos"), never invented
  impulseFit: "alto" | "moderado" | "baixo" | "indeterminado";
  isSeasonalEvent: string | null; // real matched event name, e.g. "Natal" — null otherwise
}

/** Real, auditable category → environment/mood mapping (owner's
 * examples, section 4). Falls back to a neutral, product-focused
 * direction for any category not explicitly listed — never guesses a
 * theme for a category it doesn't recognize. */
const CATEGORY_DIRECTION: Record<string, string> = {
  beleza: "ambiente sofisticado, iluminação suave e difusa, tons claros, destaque aos benefícios reais do produto",
  eletronicos: "composição tecnológica e moderna, fundo escuro com reflexos sutis, sensação premium",
  ferramentas: "ambiente robusto e funcional, textura industrial, cores neutras e fortes",
  casa: "contextualização doméstica realista, ambiente aconchegante e organizado",
  cozinha: "contextualização doméstica realista, ambiente aconchegante e organizado",
  brinquedos: "composição alegre, colorida e lúdica, energia positiva",
  decoracao: "valorização estética do produto, composição elegante, foco na textura e no design",
  esportes: "ambiente dinâmico, sensação de movimento e energia",
  saude: "ambiente limpo, confiável, tons claros, sensação de bem-estar",
};

const SEASONAL_DIRECTION: Record<string, string> = {
  Natal: "ambientação natalina emocional e aconchegante, sem exagerar em elementos decorativos que distraiam do produto",
  "Réveillon": "ambientação festiva de virada de ano, elegante, tons claros e dourados sutis",
  "Black Friday": "composição que comunica urgência e oportunidade, sem poluir visualmente",
};

function pickDirection(categoryHint: string | null, seasonalEvent: string | null): string {
  if (seasonalEvent && SEASONAL_DIRECTION[seasonalEvent]) return SEASONAL_DIRECTION[seasonalEvent];
  if (categoryHint) {
    const normalized = categoryHint.toLowerCase();
    for (const [key, direction] of Object.entries(CATEGORY_DIRECTION)) {
      if (normalized.includes(key)) return direction;
    }
  }
  return "composição profissional e limpa, fundo neutro adequado ao tipo de produto, foco total no produto real";
}

/** The literal prompt sent to the image-edit API. NEVER includes price,
 * discount text, CTA or logo — those are added programmatically, with
 * pixel precision, by compositor.ts. This keeps the AI step responsible
 * only for environment/composition/lighting, exactly as the owner's
 * hybrid-architecture requirement (section 5) specifies. */
export function buildCreativePrompt(input: CreativePromptInputs): string {
  const direction = pickDirection(input.categoryHint, input.isSeasonalEvent);

  const realFactsLines: string[] = [];
  if (input.brand) realFactsLines.push(`Marca real: ${input.brand}.`);
  if (input.rating !== null) realFactsLines.push(`Avaliação real do produto: ${input.rating.toFixed(1)}/5 — pode ser sugerida apenas como elemento visual discreto (estrelas), nunca inventada.`);
  if (input.soldQuantityLabel) realFactsLines.push(`Popularidade real: ${input.soldQuantityLabel}.`);

  return [
    `Fotografia publicitária profissional do produto real fornecido na imagem de entrada: "${input.title}".`,
    "REGRA ABSOLUTA: preserve exatamente a embalagem, cor, marca, modelo, formato e aparência do produto da imagem original. Não altere, não redesenhe, não substitua o produto — apenas recomponha o ambiente ao redor dele.",
    `Direção criativa: ${direction}.`,
    "O produto deve ser o elemento central e dominante da composição, grande e bem iluminado.",
    "NÃO inclua texto, preço, números, logotipos, marcas de outras empresas, pessoas ou modelos humanos na imagem.",
    "NÃO inclua nenhuma sobreposição gráfica — a composição final (preço, texto, chamada para ação) será adicionada separadamente por outro processo.",
    realFactsLines.length > 0 ? realFactsLines.join(" ") : "",
    "Formato de anúncio para redes sociais, qualidade fotográfica profissional, iluminação de estúdio.",
  ]
    .filter(Boolean)
    .join(" ");
}
