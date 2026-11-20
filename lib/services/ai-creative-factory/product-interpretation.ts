/**
 * Owner's requirement, 2026-11-20 ("Evolução da Fábrica de Criativos
 * para Direção de Arte Inteligente"): "Não permita que a IA comece a
 * desenhar antes de compreender o produto." A real, mandatory
 * interpretation stage — never invented copy, every claim traces to a
 * real, already-verified source (the product's own real title, as
 * written by the seller, or a real field from MerchantListingFacts via
 * loadPublicMerchantProduct). No LLM call here: a deterministic,
 * reviewable extractor, so the SAME product always gets the SAME
 * profile and a human can audit exactly why a claim is on screen.
 *
 * "Benefícios comprovados" are extracted two ways, both traceable:
 *  1. Real technical specs the SELLER already wrote in the real title
 *     (capacity, wattage, SPF, volume, battery life, etc.) — quoting
 *     the seller's own words is not inventing a fact.
 *  2. Real marketplace signals: a confirmed discount (referencePrice/
 *     discountPercent) and a real rating (rating/reviewCount).
 * Never free-text marketing claims, never anything not traceable to one
 * of these two sources.
 */

export interface CreativeBenefit {
  text: string;
  /** Exactly what in the real data produced this line — shown in the
   * homologation review, never hidden. */
  source: string;
}

export interface CreativeProfile {
  visualCategory: string;
  mainMessage: string;
  /** Up to 4, ordered by commercial strength (confirmed discount >
   * real rating > extracted real specs) — owner's explicit cap. */
  benefits: CreativeBenefit[];
  hierarchy: ("produto" | "beneficios" | "preco" | "cta")[];
  backgroundStyle: string;
  colorPalette: string;
  ambientation: string;
  productPositioning: string;
  graphicElements: string[];
  priceStrategy: string;
  communicationRestrictions: string[];
  sources: string[];
}

export interface ProductInterpretationInput {
  title: string;
  brand: string | null;
  categoryHint: string | null;
  currentPrice: number;
  referencePrice: number | null;
  hasConfirmedDiscount: boolean;
  rating: number | null;
  reviewCount: number | null;
  isSeasonalEvent: string | null;
}

/** Category → visual direction, extended from the original single-string
 * map (prompt-builder.ts's predecessor) into separate background/
 * palette/ambientation fields, per the owner's structured-profile
 * requirement. Falls back to a neutral direction for anything not
 * explicitly recognized — never guesses a theme. */
const CATEGORY_VISUAL_DIRECTION: Record<
  string,
  { background: string; palette: string; ambientation: string; graphicElements: string[] }
> = {
  beleza: {
    background: "superfície lisa e clara, textura sutil (mármore claro, tecido acetinado ou vidro fosco)",
    palette: "tons claros e suaves, com um acento de cor alinhado à embalagem real do produto",
    ambientation: "iluminação suave e difusa, estética delicada e sofisticada",
    graphicElements: ["ícones discretos de benefício (gota, escudo, estrela) quando houver benefício real correspondente"],
  },
  eletronicos: {
    background: "fundo escuro com reflexos sutis, superfície tecnológica",
    palette: "tons escuros e metálicos, com um acento de cor da marca do produto quando identificável",
    ambientation: "composição tecnológica e moderna, sensação premium",
    graphicElements: ["destaque numérico de especificação técnica real (ex: potência, capacidade) quando disponível"],
  },
  ferramentas: {
    background: "ambiente de oficina ou bancada real, textura industrial",
    palette: "cores neutras e fortes (cinza, preto, laranja/amarelo de segurança)",
    ambientation: "robustez e funcionalidade, sensação de resistência",
    graphicElements: ["selo de especificação técnica real quando disponível"],
  },
  esportes: {
    background: "ambiente dinâmico (academia, área externa) sugerido, nunca pessoas reais ou modelos humanos",
    palette: "cores de alta energia (preto, vermelho, tons vibrantes)",
    ambientation: "sensação de movimento e performance",
    graphicElements: ["destaque numérico real (peso, capacidade) quando disponível"],
  },
  casa: {
    background: "contextualização doméstica realista (cozinha, sala) adequada ao uso real do produto",
    palette: "tons quentes e aconchegantes",
    ambientation: "ambiente organizado e convidativo",
    graphicElements: ["destaque numérico real de capacidade/potência quando disponível"],
  },
  decoracao: {
    background: "composição elegante que valoriza a textura e o design do objeto",
    palette: "paleta sóbria, alinhada à ocasião (ex: tons dourados/vermelhos para Natal, quando aplicável)",
    ambientation: "estética refinada, foco total no objeto",
    graphicElements: [],
  },
  brinquedos: {
    background: "fundo colorido e lúdico, nunca fotorrealista demais",
    palette: "cores vivas e alegres",
    ambientation: "energia positiva, sem elementos que sugiram promessas sobre a criança usuária",
    graphicElements: [],
  },
  saude: {
    background: "ambiente clínico-clean, tons claros",
    palette: "branco, azul claro, verde suave — sensação de confiabilidade",
    ambientation: "limpo e confiável",
    graphicElements: ["selo de característica real (ex: hipoalergênico) somente se literalmente presente no título do anúncio"],
  },
};

const NEUTRAL_DIRECTION = {
  background: "fundo neutro e profissional, estúdio fotográfico",
  palette: "tons neutros, com acento de cor da marca quando identificável",
  ambientation: "composição limpa, foco total no produto real",
  graphicElements: [] as string[],
};

function pickVisualDirection(categoryHint: string | null) {
  if (!categoryHint) return { key: "indeterminado", ...NEUTRAL_DIRECTION };
  const normalized = categoryHint.toLowerCase();
  for (const [key, direction] of Object.entries(CATEGORY_VISUAL_DIRECTION)) {
    if (normalized.includes(key)) return { key, ...direction };
  }
  return { key: "indeterminado", ...NEUTRAL_DIRECTION };
}

/** Real specs the SELLER already wrote in the title — quoting the
 * seller's own words, never an invented claim. Each pattern captures
 * the literal matched substring as its own source quote. Ordered so the
 * most commercially persuasive real specs (protection/power/capacity)
 * are found first — the caller still caps at 4 total benefits across
 * ALL sources, discount/rating included. */
const SPEC_PATTERNS: { regex: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { regex: /FPS\s*(\d+)/i, label: (m) => `Proteção solar real FPS ${m[1]}` },
  { regex: /(\d+[.,]?\d*)\s*w\b/i, label: (m) => `${m[1]}W de potência` },
  { regex: /(\d+[.,]?\d*)\s*l\b(?!b)/i, label: (m) => `${m[1]}L de capacidade` },
  { regex: /(\d+)\s*h(?:s|oras)?\s*(?:de bateria|de autonomia)?/i, label: (m) => `${m[1]}h de autonomia` },
  { regex: /(\d+[.,]?\d*)\s*kg\b/i, label: (m) => `Até ${m[1]}kg` },
  { regex: /(\d+)\s*em\s*1\b/i, label: (m) => `${m[1]} funções em 1 produto` },
  { regex: /(\d+[.,]?\d*)\s*(?:g|ml)\b/i, label: (m) => `${m[1]}${m[0].match(/ml/i) ? "ml" : "g"} reais no anúncio` },
  { regex: /sem sabor/i, label: () => "Sem sabor" },
  { regex: /hipoalerg[eê]nic[oa]/i, label: () => "Hipoalergênico (conforme descrito pelo vendedor)" },
  { regex: /dobr[aá]vel/i, label: () => "Dobrável" },
];

function extractSpecBenefits(title: string): CreativeBenefit[] {
  const found: CreativeBenefit[] = [];
  for (const { regex, label } of SPEC_PATTERNS) {
    const match = title.match(regex);
    if (match) found.push({ text: label(match), source: `Texto real do anúncio: "${match[0]}"` });
  }
  return found;
}

export function interpretProduct(input: ProductInterpretationInput): CreativeProfile {
  const direction = pickVisualDirection(input.categoryHint);

  const benefits: CreativeBenefit[] = [];
  const sources: string[] = [];

  if (input.hasConfirmedDiscount && input.referencePrice !== null) {
    const percent = Math.round((1 - input.currentPrice / input.referencePrice) * 100);
    benefits.push({
      text: `${percent}% de desconto real (de R$ ${input.referencePrice.toFixed(2)} para R$ ${input.currentPrice.toFixed(2)})`,
      source: "Preço de referência e preço atual — dado confirmado pelo vendedor no Mercado Livre.",
    });
    sources.push("Desconto confirmado pelo vendedor (MerchantListingFacts.referencePrice/discountPercent).");
  }
  if (input.rating !== null && input.reviewCount !== null && input.reviewCount > 0) {
    benefits.push({
      text: `Avaliação real ${input.rating.toFixed(1)}/5 (${input.reviewCount} avaliações)`,
      source: "Dado real do Mercado Livre — nota e contagem de avaliações do anúncio.",
    });
    sources.push("Avaliação e nº de avaliações reais do Mercado Livre.");
  }
  for (const b of extractSpecBenefits(input.title)) {
    benefits.push(b);
    sources.push(b.source);
  }
  const cappedBenefits = benefits.slice(0, 4);

  const mainMessage = cappedBenefits.length > 0
    ? `${input.title.split(/[-–]/)[0]!.trim()} — ${cappedBenefits[0]!.text.toLowerCase()}`
    : input.title;

  const hierarchy: CreativeProfile["hierarchy"] = ["produto"];
  if (cappedBenefits.length > 0) hierarchy.push("beneficios");
  hierarchy.push("preco", "cta");

  return {
    visualCategory: direction.key,
    mainMessage,
    benefits: cappedBenefits,
    hierarchy,
    backgroundStyle: direction.background,
    colorPalette: direction.palette,
    ambientation: input.isSeasonalEvent ? `${direction.ambientation}, com sugestão sutil de ${input.isSeasonalEvent} sem poluir a composição` : direction.ambientation,
    productPositioning: "produto grande e centralizado, ocupando a maior parte vertical da composição, nunca disputando espaço com texto",
    graphicElements: [...direction.graphicElements, ...(input.hasConfirmedDiscount ? ["selo de desconto real"] : [])],
    priceStrategy: input.hasConfirmedDiscount
      ? "preço atual em destaque máximo, preço anterior riscado menor ao lado, percentual real em selo"
      : "preço atual em destaque máximo, sem preço anterior (nenhum desconto confirmado a mostrar)",
    communicationRestrictions: [
      "nunca inventar avaliação, quantidade vendida ou certificação não confirmada",
      "nunca usar urgência artificial (ex: 'últimas unidades') sem dado real",
      "nunca alegar 'melhor do mercado' sem comprovação",
      "nunca alterar marca, embalagem, cor ou modelo do produto real",
    ],
    sources: sources.length > 0 ? sources : ["Nenhum benefício adicional confirmável além do título do anúncio — nenhum foi inventado."],
  };
}
