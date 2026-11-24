/**
 * "Achados na Amazon" — curated Amazon.com.br product showcase (home section
 * and /amazon). Every entry was picked by hand from products the site owner
 * generated Associates links for, then verified (product/brand/ASIN, from
 * the official `productTitle` on the resolved page) before being added here.
 *
 * Links are the plain, normal product URL built from the ASIN plus the
 * configured Tracking ID (`https://www.amazon.com.br/dp/<ASIN>?tag=<tag>`),
 * so the Associate ID is visible to anyone reviewing the site — see
 * `getShowcaseHref()`. The tag is never hardcoded here; it comes from
 * AMAZON_BR_ASSOCIATE_TAG via lib/amazon/policy-guard.ts.
 *
 * Hard rules enforced by tests/amazon-br-showcase.test.tsx — do not violate
 * when editing this file:
 * - No price, discount, rating, review count, or availability claim here —
 *   this project has no authorized live feed for that data on this
 *   marketplace yet (see docs/AMAZON.md).
 * - No image is stored or shown (Amazon forbids caching images without the API).
 */

import { buildAmazonProductUrl } from "@/lib/amazon/policy-guard";

export type AmazonShowcaseCategory =
  "Tecnologia" | "Casa & Eletrodomésticos" | "Esporte & Fitness" | "Pet";

export interface AmazonShowcaseProduct {
  /** Stable key for React lists and tests — not shown to users. */
  id: string;
  /** Amazon ASIN, resolved from the product page. */
  asin: string;
  /** Official product title (from the resolved page), used for the card heading. */
  title: string;
  brand?: string;
  category: AmazonShowcaseCategory;
  /** 2-4 original sentences — what it is, who it suits, one buying criterion. */
  description: string;
}

// First screen — chosen for category diversity, not just top score.
export const AMAZON_SHOWCASE_FEATURED: AmazonShowcaseProduct[] = [
  {
    id: "echo-dot",
    asin: "B09B8VGCR8",
    title: "Echo Dot (Geração mais recente) com Alexa",
    brand: "Amazon",
    category: "Tecnologia",
    description:
      "Assistente de voz compacto que toca música, controla dispositivos compatíveis e responde perguntas do dia a dia. Boa porta de entrada pra quem ainda não tem nenhum aparelho com Alexa em casa. Vale mais a pena se você já pensa em conectar lâmpadas ou tomadas inteligentes por voz.",
  },
  {
    id: "frigobar-brastemp-retro",
    asin: "B0778W18KJ",
    title: "Frigobar Brastemp Retro 76 litros",
    brand: "Brastemp",
    category: "Casa & Eletrodomésticos",
    description:
      "Frigobar compacto com visual retrô, pensado pra quarto, escritório ou espaço pequeno onde uma geladeira full-size não cabe. Com 76 litros, dá pra bebidas e itens do dia a dia — não pra compra de mês inteira. Faz mais sentido como segunda geladeira da casa do que como principal.",
  },
  {
    id: "bike-caloi-vulcan",
    asin: "B07VDGJK8S",
    title: "Bicicleta Caloi Vulcan Aro 29, 21 Velocidades",
    brand: "Caloi",
    category: "Esporte & Fitness",
    description:
      "Bicicleta aro 29 com 21 velocidades, da Caloi, uma das marcas mais tradicionais do ciclismo no Brasil. Indicada pra quem pedala em trilhas leves ou ruas com relevo, não só em piso plano. Vale conferir o tamanho do quadro com atenção — bike no tamanho errado compromete o conforto e a postura.",
  },
  {
    id: "notebook-lenovo-ideapad",
    asin: "B086CCDMN5",
    title: "Notebook Lenovo IdeaPad S145, Ryzen 5, 12GB, 1TB",
    brand: "Lenovo",
    category: "Tecnologia",
    description:
      "Notebook com processador Ryzen 5, 12GB de RAM e 1TB de armazenamento, voltado a uso do dia a dia — estudo, trabalho de escritório, navegação. Não é indicado pra jogos pesados ou edição profissional de vídeo. Vale comparar a geração do processador com lançamentos mais recentes antes de decidir.",
  },
  {
    id: "cama-pet-grande",
    asin: "B07T2KCKBX",
    title: "Cama Para Cães Grande, Fábrica Pet",
    brand: "Fábrica Pet",
    category: "Pet",
    description:
      'Cama grande pra cães de porte médio a grande, pensada pro conforto no dia a dia do pet. Antes de comprar, vale conferir as medidas exatas do produto contra o tamanho real do seu cão — "grande" varia bastante de marca pra marca.',
  },
  {
    id: "smart-tv-semp-32",
    asin: "B07WSS9X1Z",
    title: 'Smart TV LED 32" HD Android, SEMP 32S5300',
    brand: "SEMP",
    category: "Tecnologia",
    description:
      "TV de 32 polegadas com Android, Wi-Fi, Bluetooth e Google Assistente — boa opção pra quarto, cozinha ou como segunda TV da casa. O tamanho compacto não substitui uma tela maior pensada pra sala de estar. Vale considerar a distância de visualização antes de escolher o tamanho ideal.",
  },
  {
    id: "tenis-olympikus-perfect-2",
    asin: "B08D7J53H7",
    title: "Tênis Olympikus Perfect 2 Masculino",
    brand: "Olympikus",
    category: "Esporte & Fitness",
    description:
      "Tênis esportivo da Olympikus, marca brasileira conhecida em corrida e caminhada. Opção pra treino do dia a dia sem pagar o preço de marcas internacionais. Vale conferir a tabela de numeração específica do modelo antes de comprar, já que pode variar entre linhas.",
  },
  {
    id: "geladeira-brastemp-inverse-443l",
    asin: "B079ZHBWKK",
    title: "Geladeira Frost Free Brastemp Inverse 443L Evox",
    brand: "Brastemp",
    category: "Casa & Eletrodomésticos",
    description:
      "Geladeira frost free de 443 litros, com acabamento Evox e portas invertidas — congelador embaixo, refrigerador em cima. Modelo grande, pensado pra família ou pra quem cozinha bastante em casa. Vale medir o espaço da cozinha com cuidado: geladeiras desse porte exigem folga extra pra abrir as portas.",
  },
  {
    id: "bike-ergometrica-kikos",
    asin: "B07G4KSC73",
    title: "Bicicleta Ergométrica Kikos KV8.7i Magnética",
    brand: "Kikos",
    category: "Esporte & Fitness",
    description:
      "Bicicleta ergométrica magnética e silenciosa, com monitor de frequência cardíaca por hand grip — útil pra treinar em casa sem incomodar quem está por perto. Indicada pra quem está começando uma rotina de exercícios em ambiente fechado. Vale considerar o espaço disponível: equipamentos desse tipo costumam ocupar mais lugar do que parece nas fotos.",
  },
  {
    id: "tigela-germanhart",
    asin: "B07ZSBW21Z",
    title: "Tigela Inox GermanHart Cutie 800ml",
    brand: "GermanHart",
    category: "Pet",
    description:
      "Tigela de inox pra cães, tamanho médio, com 800ml de capacidade — combina com quem já tem cama ou outros acessórios pet em casa. Inox costuma ser mais fácil de higienizar no dia a dia do que plástico. Complementa bem outros itens voltados a pets.",
  },
];

// Revealed via "Ver todos" — still curated (tier B), not the full 23.
export const AMAZON_SHOWCASE_MORE: AmazonShowcaseProduct[] = [
  {
    id: "echo-show-5",
    asin: "B09B2TSNNN",
    title: "Echo Show 5 (Geração mais recente) com Alexa",
    brand: "Amazon",
    category: "Tecnologia",
    description:
      "Versão do Echo com tela pequena, útil pra ver receitas, câmeras compatíveis ou lembretes enquanto o dispositivo toca música. Bom complemento pra quem já usa Alexa em outros cômodos da casa. Ocupa mais espaço numa mesa ou criado-mudo do que um Echo Dot comum — vale considerar isso antes de comprar.",
  },
  {
    id: "lava-loucas-brastemp-14",
    asin: "B07CKJSH5W",
    title: "Lava Louças Brastemp 14 Serviços, Ciclo Pesado",
    brand: "Brastemp",
    category: "Casa & Eletrodomésticos",
    description:
      "Lava-louças com capacidade pra 14 serviços e ciclo pesado, pensada pra famílias que acumulam louça suja ao longo do dia. Reduz tempo de cozinha, mas exige espaço e instalação próprios na bancada ou embutida. Vale confirmar a compatibilidade elétrica e hidráulica da sua cozinha antes de comprar.",
  },
  {
    id: "fogao-atlas-monaco",
    asin: "B0GWKFX6PN",
    title: "Fogão 4 Bocas Atlas Mônaco Top Glass",
    brand: "Atlas",
    category: "Casa & Eletrodomésticos",
    description:
      "Fogão de 4 bocas com mesa de vidro, bivolt, da Atlas — marca tradicional em fogões no Brasil. A mesa de vidro facilita a limpeza em comparação a mesas de inox ou esmaltadas comuns. Vale conferir se o bivolt é automático ou exige seleção manual de voltagem na instalação.",
  },
  {
    id: "lampada-wifi-positivo",
    asin: "B082FTRR76",
    title: "Smart Lâmpada Wi-Fi Positivo Casa Inteligente",
    brand: "Positivo",
    category: "Casa & Eletrodomésticos",
    description:
      "Lâmpada inteligente com luz branca e RGB, controlada por Wi-Fi e compatível com Alexa e Google Assistente. Boa porta de entrada pra quem quer testar automação residencial sem trocar toda a instalação elétrica. Funciona melhor combinada com um assistente de voz já existente em casa.",
  },
  {
    id: "tapete-yoga-muvin",
    asin: "B07FTTKR4Z",
    title: "Tapete Para Yoga em EVA Muvin Basics",
    brand: "Muvin",
    category: "Esporte & Fitness",
    description:
      "Tapete de EVA para yoga, pilates ou ginástica em casa, indicado pra quem está começando. Tamanho padrão (180cm x 60cm) atende a maioria das pessoas, mas vale conferir se cobre sua altura confortavelmente. Item de ticket baixo que complementa uma rotina de exercícios em casa.",
  },
  {
    id: "projetor-benq-th671st",
    asin: "B075JH2J42",
    title: "Projetor BenQ TH671ST DLP Full HD, Curta Distância",
    brand: "BenQ",
    category: "Casa & Eletrodomésticos",
    description:
      'Projetor de curta distância com 3000 lumens, pensado pra cinema em casa sem precisar de uma sala enorme. "Curta distância" significa que projeta uma imagem grande mesmo perto da parede — útil em ambientes menores. Vale considerar o nível de luz ambiente do cômodo antes de comprar, já que projetores rendem melhor com pouca luz.',
  },
];

export const AMAZON_SHOWCASE_ALL: AmazonShowcaseProduct[] = [
  ...AMAZON_SHOWCASE_FEATURED,
  ...AMAZON_SHOWCASE_MORE,
];

/** Normal Amazon product link with the configured Tracking ID, or null when
 * the marketplace/tag isn't configured — callers must then render no link
 * at all (never a tagless or guessed URL). */
export function getShowcaseHref(product: AmazonShowcaseProduct): string | null {
  try {
    return buildAmazonProductUrl(product.asin, "BR");
  } catch {
    return null;
  }
}
