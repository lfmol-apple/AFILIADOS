/**
 * Owner's directive, 2026-11-26 ("PROMPT MASTER — BLACK FRIDAY 2026",
 * section 6): the owner's own numbered list of 30 original Mercado Livre
 * links is now the authoritative source and "prevalece sobre a tabela
 * visual preliminar anteriormente apresentada". This script re-keys the
 * 30 BlackFridayProduct rows to that official numbering/naming, points
 * each at the correct already-imported creative group (never by file or
 * table order — every mapping below was decided by actually comparing
 * brand/model/price against the creative read in this session), and
 * leaves 2 slots with NO creative (Purificador Electrolux PE11B,
 * Parafusadeira 21V 46 peças unbranded) and 5 more with a creative
 * attached but NOT auto-selected because the match is uncertain (section
 * 7: "não presuma que existem 30 correspondências corretas").
 *
 * One-time re-keying by slotNumber: this is the ONE moment slotNumber's
 * MEANING itself changes (the preliminary table's numbering is replaced
 * by the official one), so facts/currentPrice/selectedCreativeId are
 * always (re)written here to the official mapping decided in this
 * session — a stale selection from the old provisional seed is exactly
 * the bug this fixes, not something to preserve. `affiliateUrl`/`status`
 * are never touched by this script at all (not even mentioned in its
 * upsert), which is the part owner's rule in section 11 ("não quero
 * gerar os 30 links duas vezes") actually protects — nothing the owner
 * pastes in the panel is ever at risk from this script.
 */
import { prisma } from "@/lib/db";

interface OfficialSlot {
  slot: number;
  name: string;
  brand: string | null;
  mlUrlOriginal: string;
  /** Direct product URL/id — set for every slot; for 1-23 it's the same
   * link the owner gave (already a direct product page), for 24-30 it's
   * what a read-only resolution fetch of the meli.la link found (see
   * this script's own log of that fetch, run once this session,
   * deterministic across 3 repeats each). */
  resolvedProductUrl: string;
  resolvedExternalId: string;
  resolvedTitle: string | null;
  /** The already-imported creative candidate group this slot's product
   * matches — null when NO creative was found for it at all. */
  groupKey: string | null;
  /** Set only when there is exactly one candidate AND it's a confident
   * match — the only case this script auto-selects a creative. Every
   * ambiguous (2-candidate) or low-confidence (brand/spec mismatch risk)
   * slot is left for the owner to resolve in the panel. */
  autoSelectConfident: boolean;
  reviewNote: string | null;
  /** Exactly what's printed on the matched creative — null only when
   * groupKey is null (no creative at all, nothing printed to report).
   * When 2 candidates print different prices, this is the first/primary
   * one; reviewNote always discloses the second. */
  advertisedPrice: number | null;
  /** Read-only-verified current listing price, only where a clearly
   * formatted (comma-decimal) price could be parsed from the resolved
   * page's own title — never a truncated/ambiguous figure. */
  currentPrice?: number;
}

const OFFICIAL_SLOTS: OfficialSlot[] = [
  {
    slot: 1, name: "Chuveiro Loren Shower Eletrônico 5500W", brand: "Lorenzetti",
    mlUrlOriginal: "https://www.mercadolivre.com.br/chuveiro-loren-shower-eletronico-5500w-lorenzetti-branco-127v/p/MLB68039511",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB68039511", resolvedExternalId: "MLB68039511", resolvedTitle: null,
    groupKey: "lorenzetti-shower", autoSelectConfident: true, reviewNote: null, advertisedPrice: 140.64,
  },
  {
    slot: 2, name: "Árvore de Natal Verde Premium 180cm 1000 galhos", brand: null,
    mlUrlOriginal: "https://www.mercadolivre.com.br/arvore-de-natal-verde-premium-180-cm-com-1000-galhos-cheios-e-pe-de-ferro-atelier-enovelada/p/MLB22234448",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB22234448", resolvedExternalId: "MLB22234448", resolvedTitle: null,
    groupKey: "arvore-natal", autoSelectConfident: true, reviewNote: null, advertisedPrice: 238.9,
  },
  {
    slot: 3, name: "Cadeira de Escritório Ergonômica Genebra B500", brand: "Luvinco",
    mlUrlOriginal: "https://www.mercadolivre.com.br/cadeira-escritorio-ergonomica-genebra-b500-nr-17-luvinco-cor-preto-com-suporte-lombar-estofado-mesh/p/MLB46220740",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB46220740", resolvedExternalId: "MLB46220740", resolvedTitle: null,
    groupKey: "geneva-b500", autoSelectConfident: true, reviewNote: null, advertisedPrice: 549.9,
  },
  {
    slot: 4, name: "Relógio Casio G-Shock DW-5600BB-1DR", brand: "Casio",
    mlUrlOriginal: "https://www.mercadolivre.com.br/relogio-casio-masculino-g-shock-digital-preto-dw-5600bb-1dr/up/MLBU1431955641",
    resolvedProductUrl: "https://www.mercadolivre.com.br/up/MLBU1431955641", resolvedExternalId: "MLBU1431955641", resolvedTitle: null,
    groupKey: "casio-g-shock", autoSelectConfident: false, advertisedPrice: 302.0,
    reviewNote: "2 arquivos de criativo quase idênticos para este relógio (mesmo preço R$ 302,00) — escolha 1 no painel antes de validar.",
  },
  {
    slot: 5, name: "Whey 100% Pure Chocolate 900g", brand: "Integralmédica",
    mlUrlOriginal: "https://www.mercadolivre.com.br/whey-100-pure-pouch-900g-chocolate-integralmedica/p/MLB18218400",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB18218400", resolvedExternalId: "MLB18218400", resolvedTitle: null,
    groupKey: "whey-integralmedica", autoSelectConfident: true, reviewNote: null, advertisedPrice: 150.35,
  },
  {
    slot: 6, name: "Kit 6 Cuecas Boxer", brand: "Lupo",
    mlUrlOriginal: "https://produto.mercadolivre.com.br/MLB-4824049721-kit-6-cuecas-boxer-lupo-algodo-lisa-cor-unica-premium-_JM",
    resolvedProductUrl: "https://produto.mercadolivre.com.br/MLB-4824049721-kit-6-cuecas-boxer-lupo-algodo-lisa-cor-unica-premium-_JM", resolvedExternalId: "MLB-4824049721", resolvedTitle: null,
    groupKey: "lupo-cuecas", autoSelectConfident: true, reviewNote: null, advertisedPrice: 176.61,
  },
  {
    slot: 7, name: "Chapinha Profissional Gloss", brand: "Taiff",
    mlUrlOriginal: "https://www.mercadolivre.com.br/chapinha-taiff-profissional-alisa-modela-e-hidrata-o-cabelo/up/MLBU3337151052",
    resolvedProductUrl: "https://www.mercadolivre.com.br/up/MLBU3337151052", resolvedExternalId: "MLBU3337151052", resolvedTitle: null,
    groupKey: "taiff-gloss", autoSelectConfident: true, reviewNote: null, advertisedPrice: 278.99,
  },
  {
    slot: 8, name: "Aparador e Barbeador OneBlade 5 em 1", brand: "Philips",
    mlUrlOriginal: "https://www.mercadolivre.com.br/philips-oneblade-aparador-e-barbeador-eletrico-com-pente-ajustavel-5-em-1-raspa-apara-e-contorna-uso-seco-e-molhado-100-prova-dagua-sem-fio-bivolt-qp142510/p/MLB64322156",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB64322156", resolvedExternalId: "MLB64322156", resolvedTitle: null,
    groupKey: "philips-oneblade", autoSelectConfident: true, reviewNote: null, advertisedPrice: 130.0,
  },
  {
    slot: 9, name: "Fotoprotetor Facial Fusion Water FPS 60", brand: "ISDIN",
    mlUrlOriginal: "https://www.mercadolivre.com.br/protetor-solar-facial-isdin-fusion-water-sem-cor-fps-60-30ml/p/MLB19508914",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB19508914", resolvedExternalId: "MLB19508914", resolvedTitle: null,
    groupKey: "isdin-fusion-water", autoSelectConfident: true, reviewNote: null, advertisedPrice: 59.9,
  },
  {
    slot: 10, name: "Kit de Ferramentas 110 Peças com Maleta", brand: "The Black Tools",
    mlUrlOriginal: "https://www.mercadolivre.com.br/kit-jogo-de-ferramentas-110-pecas-completa-com-maleta/up/MLBU2359971927",
    resolvedProductUrl: "https://www.mercadolivre.com.br/up/MLBU2359971927", resolvedExternalId: "MLBU2359971927", resolvedTitle: null,
    groupKey: "maleta-ferramentas", autoSelectConfident: false, advertisedPrice: 479.9,
    reviewNote: "Candidato único (creative 'maleta completa de ferramentas', R$ 479,90), mas a imagem não mostra a contagem de 110 peças impressa — confirme antes de selecionar.",
  },
  {
    slot: 11, name: "Câmera de Segurança IM5SC Wi-Fi Full HD", brand: "Intelbras",
    mlUrlOriginal: "https://www.mercadolivre.com.br/camera-inteligente-intelbras-im5sc-con-wi-fi-full-hd-branca/p/MLB27705742",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB27705742", resolvedExternalId: "MLB27705742", resolvedTitle: null,
    groupKey: "intelbras-camera", autoSelectConfident: false, advertisedPrice: 204.76,
    reviewNote: "ATENÇÃO — provável divergência de modelo: o criativo disponível mostra uma câmera bullet externa com 2 antenas; a IM5SC da Intelbras é tipicamente uma câmera smart compacta/indoor. Confirme com o Henrique antes de usar este criativo ou peça um novo.",
  },
  {
    slot: 12, name: "Parafusadeira de Impacto 21V 2 Baterias 46 Peças", brand: null,
    mlUrlOriginal: "https://www.mercadolivre.com.br/furadeira-parafusadeira-de-impacto-2-baterias-21v-46-pecas/up/MLBU3472399363",
    resolvedProductUrl: "https://www.mercadolivre.com.br/up/MLBU3472399363", resolvedExternalId: "MLBU3472399363", resolvedTitle: null,
    groupKey: null, autoSelectConfident: false, advertisedPrice: null,
    reviewNote: "Nenhum criativo correspondente encontrado entre os arquivos recebidos. O único criativo de furadeira 21V disponível já foi associado ao item 17 (The Black Tools TB-21PX) — pode ser o mesmo produto anunciado por outro vendedor, ou um produto diferente. Peça ao Henrique um criativo específico, ou confirme se é o mesmo físico do item 17.",
  },
  {
    slot: 13, name: "Jogo de Panelas Turim 10 Peças", brand: "Tramontina",
    mlUrlOriginal: "https://www.mercadolivre.com.br/jogo-de-panelas-turim-em-aluminio-com-revestimento-antiaderente-starflon-max-vermelho-10-pecas-tramontina/p/MLB32529104",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB32529104", resolvedExternalId: "MLB32529104", resolvedTitle: null,
    groupKey: "tramontina-panelas", autoSelectConfident: true, reviewNote: null, advertisedPrice: 339.14,
  },
  {
    slot: 14, name: "Purificador de Água Eletrônico Compacto PE11B", brand: "Electrolux",
    mlUrlOriginal: "https://www.mercadolivre.com.br/purificador-electrolux-eletronico-compacto-efficient-painel-digital-bivolt-branco-pe11b-bivolt/p/MLB29239223",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB29239223", resolvedExternalId: "MLB29239223", resolvedTitle: null,
    groupKey: null, autoSelectConfident: false, advertisedPrice: null,
    reviewNote: "Nenhum criativo correspondente entre os arquivos recebidos do Henrique — não há nenhuma imagem de purificador de água no lote. Peça o criativo antes de incluir este item.",
  },
  {
    slot: 15, name: "Escova e Secador de Cabelos PSC3500 4 em 1", brand: "Philco",
    mlUrlOriginal: "https://www.mercadolivre.com.br/secador-de-cabelos-philcopsc3500-4-em-1dobravelmotorbldc-prateado/p/MLB50269368",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB50269368", resolvedExternalId: "MLB50269368", resolvedTitle: null,
    groupKey: "secador-philco", autoSelectConfident: false, advertisedPrice: 441.6,
    reviewNote: "Confirmado: os 2 criativos candidatos citam o mesmo modelo PSC3500 (um enfatiza 'Profissional' R$ 441,60, outro '4 em 1' R$ 413,82) — escolha qual criativo usar no painel.",
  },
  {
    slot: 16, name: "Cicaplast Baume B5+ 40ml", brand: "La Roche-Posay",
    mlUrlOriginal: "https://www.mercadolivre.com.br/creme-multirreparador-pele-sensivel-cicaplast-baume-b5-la-roche-posay-40ml/p/MLB24326256",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB24326256", resolvedExternalId: "MLB24326256", resolvedTitle: null,
    groupKey: "cicaplast-b5", autoSelectConfident: true, reviewNote: null, advertisedPrice: 64.37,
  },
  {
    slot: 17, name: "Parafusadeira/Furadeira de Impacto TB-21PX 2 Baterias", brand: "The Black Tools",
    mlUrlOriginal: "https://www.mercadolivre.com.br/parafusadeira-furadeira-de-impacto-the-black-tools-profissional-tb-21px-2-baterias-com-maleta-60hz-amarelo/p/MLB30144703",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB30144703", resolvedExternalId: "MLB30144703", resolvedTitle: null,
    groupKey: "furadeira-black-tools-21v", autoSelectConfident: false, advertisedPrice: 199.0,
    reviewNote: "2 criativos para o mesmo preço (R$ 199,00): um mostra o kit completo de acessórios, outro a versão compacta — escolha qual criativo representa a oferta real.",
  },
  {
    slot: 18, name: "Lavadora de Alta Pressão EasyWash QWS1650 1650psi", brand: "Electrolux",
    mlUrlOriginal: "https://www.mercadolivre.com.br/lavadora-de-alta-pressao-electrolux-1650psi-1400w-de-potencia-com-engate-rapido-easywash-lava-jato-lava-car-qws1650/p/MLB38833473",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB38833473", resolvedExternalId: "MLB38833473", resolvedTitle: null,
    groupKey: "electrolux-easywash", autoSelectConfident: true, reviewNote: null, advertisedPrice: 263.12,
  },
  {
    slot: 19, name: "Pista de Carrinhos Lava-Rápido", brand: null,
    mlUrlOriginal: "https://www.mercadolivre.com.br/pista-de-carrinhos-brinquedo-infantil-corrida-lava-rapido-colorido/p/MLB30890350",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB30890350", resolvedExternalId: "MLB30890350", resolvedTitle: null,
    groupKey: "brinquedo-pista", autoSelectConfident: false, advertisedPrice: 64.9,
    reviewNote: "Possível divergência de tema: o criativo disponível mostra uma garagem/estacionamento de vários andares com posto de gasolina, o anúncio fala em 'lava-rápido' — confirme se é a mesma peça antes de selecionar.",
  },
  {
    slot: 20, name: "Kit Multi Ferramentas 4 em 1 48V (2 baterias)", brand: "Simake",
    mlUrlOriginal: "https://www.mercadolivre.com.br/kit-multi-ferramentas-4-em-1-48v-sem-fio-com-2-baterias-furadeira-parafusadeira-martelete-esmerilhadeira-chave-de-impacto-com-maleta-alta-potencia-uso-profissional-e-domestico-simake/p/MLB67462015",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB67462015", resolvedExternalId: "MLB67462015", resolvedTitle: null,
    groupKey: "kit-ferramentas-48v", autoSelectConfident: false, advertisedPrice: 699.56,
    reviewNote: "ATENÇÃO — divergência de marca: o anúncio é da marca Simake, os 2 criativos candidatos (R$ 699,56 e R$ 621,00) estão com a marca 'STRIKE' impressa. Pode ser revenda com marca diferente no criativo, ou produto errado — confirme antes de usar.",
  },
  {
    slot: 21, name: "Escova Elétrica Pro Series 1", brand: "Oral-B",
    mlUrlOriginal: "https://www.mercadolivre.com.br/escova-de-dente-eletrica-oral-b-pro-series-1-1-unidade/p/MLB24609499",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB24609499", resolvedExternalId: "MLB24609499", resolvedTitle: null,
    groupKey: "oral-b-pro1", autoSelectConfident: true, reviewNote: null, advertisedPrice: 101.08,
  },
  {
    slot: 22, name: "Cadeira de Escritório Ergonômica Begonia Mesh", brand: "Begonia",
    mlUrlOriginal: "https://www.mercadolivre.com.br/cadeira-escritorio-ergonomica-giratoria-oficial-begonia-mesh/up/MLBU4322516317",
    resolvedProductUrl: "https://www.mercadolivre.com.br/up/MLBU4322516317", resolvedExternalId: "MLBU4322516317", resolvedTitle: null,
    groupKey: "cadeira-preta", autoSelectConfident: false, advertisedPrice: 115.1,
    reviewNote: "O criativo disponível (cadeira preta) não imprime nenhuma marca visível — não dá pra confirmar se é realmente a 'Begonia Mesh' do anúncio. Confirme antes de selecionar.",
  },
  {
    slot: 23, name: "Fralda Pants Ajuste Total XXG 74 unidades", brand: "Pampers",
    mlUrlOriginal: "https://www.mercadolivre.com.br/fralda-pants-ajuste-total-tamanho-xxg-74-unidades-pampers/p/MLB69621080",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB69621080", resolvedExternalId: "MLB69621080", resolvedTitle: null,
    groupKey: "pampers-xxg", autoSelectConfident: true, reviewNote: null, advertisedPrice: 135.9,
  },
  {
    slot: 24, name: "Garrafa Térmica 800ml Inox Bico Duplo Canudo", brand: "Romantic Crown",
    mlUrlOriginal: "https://meli.la/1879Rbd",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB66699406", resolvedExternalId: "MLB66699406",
    resolvedTitle: "Garrafa Térmica 800ml Inox Bico Duplo Canudo Alça Esporte Azul - R$ 44,99",
    groupKey: "garrafa-termica", autoSelectConfident: true, reviewNote: null, currentPrice: 44.99, advertisedPrice: 44.99,
  },
  {
    slot: 25, name: "Robô Aspirador e Passa Pano D15 Plus 13000Pa", brand: "Dreame",
    mlUrlOriginal: "https://meli.la/1Hyy4d8",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB63752255", resolvedExternalId: "MLB63752255",
    resolvedTitle: "Dreame D15 Plus Robot Vacuum E Passa Pano, 13000 Pa, 127v - R$ 1.808",
    groupKey: "dreame-d15", autoSelectConfident: true, reviewNote: null, advertisedPrice: 1808.19,
  },
  {
    slot: 26, name: "Bicicleta Elétrica Dobrável 400W 48V Aro 14", brand: null,
    mlUrlOriginal: "https://meli.la/2TePchs",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB53624671", resolvedExternalId: "MLB53624671",
    resolvedTitle: "Bicicleta Bike Elétrica Dobrável 400w 48v 25km/h Aro 14 Preto 14 - R$ 2.240",
    groupKey: "bike-eletrica", autoSelectConfident: true, reviewNote: null, advertisedPrice: 2240.0,
  },
  {
    slot: 27, name: "Carrinho de Bebê Passeio 3 em 1 Reversível", brand: "Zavanese",
    mlUrlOriginal: "https://meli.la/2gs5vJV",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB24070645", resolvedExternalId: "MLB24070645",
    resolvedTitle: "Carrinho De Bebê Passeio 3 Em 1 Reversível Moisés Dobrável - R$ 597,81",
    groupKey: "zavanese-carrinho", autoSelectConfident: true, reviewNote: null, currentPrice: 597.81, advertisedPrice: 597.81,
  },
  {
    slot: 28, name: "Patinete Elétrico Dobrável GM5 P1", brand: "GM5",
    mlUrlOriginal: "https://meli.la/1DDJQmS",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB51757209", resolvedExternalId: "MLB51757209",
    resolvedTitle: "Patinete Elétrico GM5 P1 Preto Dobrável com Bluetooth, 25 Km/h e Autonomia de 22 Km - R$ 1.159",
    groupKey: "gm5-p1", autoSelectConfident: true, reviewNote: null, advertisedPrice: 1159.2,
  },
  {
    slot: 29, name: "Loção Hidratante Corporal 3 Ceramidas 473ml", brand: "CeraVe",
    mlUrlOriginal: "https://meli.la/2nMJtzZ",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB21361292", resolvedExternalId: "MLB21361292",
    resolvedTitle: "Loção Hidratante Corporal 3 Ceramidas Hidratação 120h CeraVe 473ml - R$ 79,90",
    groupKey: "cerave-locao", autoSelectConfident: true, advertisedPrice: 77.27,
    reviewNote: "Preço anunciado no criativo (R$ 77,27) diverge ligeiramente do preço atual lido na página do produto (R$ 79,90) — divergência pequena (~3,4%), mas registrada para acompanhamento.",
    currentPrice: 79.90,
  },
  {
    slot: 30, name: "Loção Hidratante Corporal e Facial Pele Sensível 1L", brand: "Cetaphil",
    mlUrlOriginal: "https://meli.la/2kPAo6Z",
    resolvedProductUrl: "https://www.mercadolivre.com.br/p/MLB55232692", resolvedExternalId: "MLB55232692",
    resolvedTitle: "Cetaphil Loção Hidratante Corporal e Facial para Pele Sensível, Normal a Seca 1L - Hidratação 48h - R$ 150,76",
    groupKey: "cetaphil-locao", autoSelectConfident: true, reviewNote: null, currentPrice: 150.76, advertisedPrice: 150.76,
  },
];

async function main() {
  const creativesByGroup = new Map<string, { id: string }[]>();
  const allCreatives = await prisma.blackFridayCreative.findMany();
  for (const c of allCreatives) {
    const list = creativesByGroup.get(c.groupKey) ?? [];
    list.push(c);
    creativesByGroup.set(c.groupKey, list);
  }

  for (const official of OFFICIAL_SLOTS) {
    const candidates = official.groupKey ? (creativesByGroup.get(official.groupKey) ?? []) : [];
    const selectedCreativeId =
      official.autoSelectConfident && candidates.length === 1 ? candidates[0]!.id : null;

    // advertisedPrice/name/brand/links/resolved fields are objective facts
    // tied to the official list + the creative mapping decided in this
    // session — always safe to refresh on every run, never user data.
    const facts = {
      name: official.name,
      brand: official.brand,
      advertisedPrice: official.advertisedPrice,
      mlUrlOriginal: official.mlUrlOriginal,
      resolvedProductUrl: official.resolvedProductUrl,
      resolvedExternalId: official.resolvedExternalId,
      resolvedTitle: official.resolvedTitle,
      resolvedAt: new Date(),
      creativeGroupKey: official.groupKey ?? `missing-${official.slot}`,
      reviewNote: official.reviewNote,
    };

    // This re-keys what each slotNumber MEANS (the product identity
    // itself changed from the preliminary table to the official list),
    // so selectedCreativeId/currentPrice from before this reconciliation
    // are stale guesses against the OLD meaning, never a real owner
    // confirmation in the new panel — always overwritten here, not
    // preserved. (The "don't clobber real progress" rule from section 11
    // protects affiliateUrl/status instead, which this script never
    // touches at all — see the upsert below.)
    await prisma.blackFridayProduct.upsert({
      where: { slotNumber: official.slot },
      update: {
        ...facts,
        currentPrice: official.currentPrice ?? null,
        selectedCreativeId,
      },
      create: {
        slotNumber: official.slot,
        ...facts,
        currentPrice: official.currentPrice ?? null,
        selectedCreativeId,
      },
    });
  }

  console.log(`Reconciled ${OFFICIAL_SLOTS.length} official slots.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
