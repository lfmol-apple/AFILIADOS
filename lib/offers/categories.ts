/**
 * Category taxonomy for the /ofertas sidebar. The database has NO category
 * data for these offers (the Category table is empty, Shopee listings only
 * store a product name), so categories are derived deterministically here:
 *
 * 1. Mercado Livre: the catalog product's own `domainId` (a real signal
 *    from ML, e.g. MLB-CELLPHONES) mapped through DOMAIN_TO_CATEGORY.
 * 2. Everything else (Shopee, Amazon, unmapped ML domains): ordered keyword
 *    rules over the title.
 * 3. Anything that matches nothing is "Outros" — never guessed.
 *
 * This is presentation-only grouping. It never touches scoring, ranking or
 * commission, and a wrong bucket only means an offer shows under a
 * different sidebar entry.
 */

export interface OfferCategory {
  slug: string;
  label: string;
}

export const OFFER_CATEGORIES: readonly OfferCategory[] = [
  { slug: "esporte-suplementos", label: "Esporte e Suplementos" },
  { slug: "celulares", label: "Celulares e Acessórios" },
  { slug: "audio-games", label: "Áudio, TV e Games" },
  { slug: "informatica", label: "Informática e Impressão 3D" },
  { slug: "eletrodomesticos", label: "Eletrodomésticos" },
  { slug: "casa", label: "Casa e Decoração" },
  { slug: "limpeza", label: "Limpeza e Papel" },
  { slug: "beleza", label: "Beleza e Cuidados" },
  { slug: "bebe", label: "Bebê" },
  { slug: "pet", label: "Pet" },
  { slug: "ferramentas", label: "Ferramentas e Jardim" },
  { slug: "moda", label: "Moda e Acessórios" },
  { slug: "outros", label: "Outros" },
] as const;

const SLUGS = new Set(OFFER_CATEGORIES.map((c) => c.slug));

export function isOfferCategorySlug(value: string): boolean {
  return SLUGS.has(value);
}

export function offerCategoryLabel(slug: string): string {
  return OFFER_CATEGORIES.find((c) => c.slug === slug)?.label ?? "Outros";
}

/** Mercado Livre domainId (without the "MLB-" prefix) -> category slug. */
const DOMAIN_GROUPS: Record<string, string[]> = {
  "esporte-suplementos": ["SUPPLEMENTS", "STATIONARY_BICYCLES", "JUMP_ROPES"],
  celulares: ["CELLPHONES", "MOBILE_DEVICE_CHARGERS", "CELL_BATTERIES"],
  "audio-games": [
    "HEADPHONES",
    "GAMEPADS_AND_JOYSTICKS",
    "VIDEO_GAME_PREPAID_CARDS",
    "GAME_CONSOLES",
    "SMART_SPEAKERS",
    "MICROPHONES",
    "AM_FM_SW_RADIOS",
    "STREAMING_MEDIA_DEVICES",
    "TELEVISIONS",
    "TV_AND_MONITOR_STANDS_AND_WALL_HANGERS",
    "TV_REMOTE_CONTROLS",
    "TV_ANTENNAS",
    "SURVEILLANCE_CAMERAS",
    "AUDIO_AND_VIDEO_CABLES_AND_ADAPTERS",
  ],
  informatica: [
    "3D_PRINTER_FILAMENTS",
    "COMPUTER_MICE",
    "NETWORK_CABLES",
    "PRINTERS",
    "PRINTER_INKS",
    "MEMORY_CARDS",
    "HARD_DRIVES_AND_SSDS",
    "WIRELESS_ANTENNAS_AND_ADAPTERS",
    "LAPTOP_STANDS",
    "SCHOOL_AND_OFFICE_PAPERS",
  ],
  eletrodomesticos: [
    "FANS",
    "VACUUM_AND_STEAM_CLEANERS",
    "BLENDERS",
    "HAND_BLENDERS",
    "MIXERS",
    "ELECTRIC_JUGS",
    "ELECTRIC_SQUEEZERS",
    "ELECTRIC_SANDWICH_MAKERS",
    "ELECTRIC_COFFEE_MAKERS",
    "ELECTRIC_LUNCHBOXES",
    "MICROWAVES",
    "AIR_FRYERS",
    "PORTABLE_EVAPORATIVE_AIR_COOLERS",
    "ELECTRIC_SHOWER_HEADS",
    "IRONS",
    "COOKING_SCALES",
    "WATER_PURIFIER_FILTERS_REPLACEMENTS",
  ],
  casa: [
    "BED_SHEETS",
    "MATTRESS_COVERS",
    "DECORATIVE_CARPETS",
    "MANUAL_INDOOR_CURTAINS_AND_BLINDS",
    "QUILTS_AND_COVERLETS",
    "AIR_MATTRESSES",
    "FLATWARE_KITS",
    "FOOD_STORAGE_CONTAINERS",
    "THERMAL_CUPS_AND_TUMBLERS",
    "CLOTHES_HANGERS",
  ],
  limpeza: [
    "TOILET_PAPERS",
    "KITCHEN_PAPER_TOWELS",
    "LAUNDRY_DETERGENTS",
    "DISHWASHING_DETERGENTS",
    "MULTIPURPOSE_CLEANERS_AND_DISINFECTANTS",
    "SODIUM_BICARBONATE",
    "HOUSEHOLD_CLEANING_WET_WIPES",
  ],
  beleza: [
    "SUNSCREENS",
    "LIQUID_HAND_AND_BODY_SOAPS",
    "BAR_SOAPS",
    "PERFUMES",
    "FACIAL_SKIN_CARE_PRODUCTS",
    "BODY_SKIN_CARE_PRODUCTS",
    "SKIN_CARE_KITS",
    "HAIR_SHAMPOOS_AND_CONDITIONERS",
    "HAIR_TREATMENTS",
    "ELECTRIC_HAIR_BRUSHES",
    "HAIR_STRAIGHTENERS",
    "HAIR_DRYERS",
    "HAIR_CLIPPERS_ELECTRIC_SHAVERS_AND_HAIR_TRIMMERS",
    "RAZOR_CARTRIDGES",
    "HAIRDRESSING_CAPS",
    "COTTON_SWABS",
    "ADULT_DIAPERS",
    "HYGIENIC_WET_WIPES",
  ],
  bebe: [
    "DISPOSABLE_BABY_DIAPERS",
    "BABY_BOTTLES",
    "BABY_CHANGING_PADS",
    "BABY_PLAY_AND_FOAM_MATS",
    "BREAST_PUMPS",
    "WET_BABY_WIPES",
    "BABY_HIGH_CHAIRS",
    "BABY_CREAMS_AND_OINTMENTS",
    "BALANCE_BICYCLES",
  ],
  pet: [
    "NON_PRESCRIPTION_PET_ANTIPARASITICS",
    "CAT_AND_DOG_FOODS",
    "DOG_POTTY_PADS",
    "CAT_AND_DOG_BEDS",
    "CATS_LITTER",
    "CAT_AND_DOG_DRINKERS_AND_FEEDERS",
  ],
  ferramentas: [
    "ELECTRIC_DRILLS",
    "WRENCHES",
    "ELECTRIC_SCREWDRIVERS_AND_IMPACT_WRENCHES",
    "ELECTRIC_PRESSURE_WASHERS",
    "LIGHT_BULBS",
    "AIR_COMPRESSORS",
    "VISES",
    "POWER_GRINDERS",
    "MANUAL_CONCRETE_SAWS_AND_WALL_CHASERS",
    "WATER_HOSES",
    "GARDEN_SPRAYERS",
    "ELECTRIC_BLOWERS",
  ],
};

const DOMAIN_TO_CATEGORY: Map<string, string> = new Map(
  Object.entries(DOMAIN_GROUPS).flatMap(([slug, domains]) =>
    domains.map((d) => [d, slug] as const),
  ),
);

/** Ordered: the first matching rule wins, so more specific groups (pet,
 * baby) come before generic ones (cleaning, beauty). Matched against the
 * lower-cased, accent-stripped title. */
const KEYWORD_RULES: readonly (readonly [string, RegExp])[] = [
  [
    "pet",
    /\b(antipulga|carrapato|cachorro|cachorros|cao|caes|gato|gatos|pet|pets|racao|coleira|cercadinho|adestramento|tosador|dog chow|nexgard|simparic|bravecto|frontline)\b/,
  ],
  [
    "bebe",
    /\b(bebe|baby|maternidade|fralda|fraldas|mamadeira|berco|infantil)\b/,
  ],
  [
    "celulares",
    /\b(celular|celulares|smartphone|iphone|galaxy|moto g|power bank|carregador|carregadores|tipo-c|lightning)\b/,
  ],
  [
    "audio-games",
    /\b(fone|fones|headphone|headset|caixa de som|caixinha de som|soundbar|joystick|gamepad|videogame|playstation|xbox|nintendo|ps4|ps5|smart tv|televisao|controle remoto)\b/,
  ],
  [
    "informatica",
    /\b(mouse|teclado|filamento|impressora|impressao 3d|ssd|pendrive|notebook|webcam|cabo de rede|roteador)\b/,
  ],
  [
    "moda",
    /\b(tenis|sapato|sapatos|bolsa|bolsas|vestido|moletom|chinelo|slide|short|shorts|bermuda|legging|top|camiseta|regata|macaquinho|conjunto|guarda-chuva|guarda chuva|capa de chuva|oculos|mochila)\b/,
  ],
  [
    "esporte-suplementos",
    /\b(creatina|whey|suplemento|pre treino|pre-workout|melatonina|vitamina|colageno|proteina|fitness|academia|treino|corda de pular|ergometrica|spinning|halter|biotina)\b/,
  ],
  [
    "eletrodomesticos",
    /\b(ventilador|aspirador|liquidificador|batedeira|mixer|processador|umidificador|air fryer|fritadeira|chuveiro|ducha|cafeteira|micro-ondas|microondas|purificador|filtro para agua|refil filtro|cozedor|espremedor|chaleira|ferro de passar|sanduicheira|loren shower|resistencia)\b/,
  ],
  [
    "limpeza",
    /\b(sabao|detergente|omo|alvejante|percarbonato|papel higienico|lenco|lenco umedecido|lencos umedecidos|toalha umedecida|toalhas umedecidas|desinfetante|mop|esfregao|amaciante|multiuso|escova de limpeza|snow foam)\b/,
  ],
  [
    "beleza",
    /\b(protetor solar|sabonete|shampoo|condicionador|creme|serum|perfume|body splash|cabelo|cabelos|capilar|secador|facial|leave-in|cilios|oleo|oleos|escova de dente|hidratante|retinal|pele|seringa|pressao arterial|pad)\b/,
  ],
  [
    "ferramentas",
    /\b(parafusadeira|furadeira|chave catraca|ferramenta|ferramentas|lampada|lampadas|serra|alicate|mangueira|compressor)\b/,
  ],
  [
    "casa",
    /\b(lencol|colcha|cobertor|coberdrom|edredom|edredon|tapete|cortina|espelho|tacas|marmita|marmitas|potes|toalha de banho|travesseiro|colchao|talheres|faqueiro|organizador|balanca|tapioqueira|armazenamento)\b/,
  ],
];

function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function classifyOffer(input: {
  title: string;
  mlDomainId?: string | null;
}): string {
  if (input.mlDomainId) {
    const fromDomain = DOMAIN_TO_CATEGORY.get(
      input.mlDomainId.replace(/^MLB-/, ""),
    );
    if (fromDomain) return fromDomain;
  }
  const text = normalizeTitle(input.title);
  for (const [slug, pattern] of KEYWORD_RULES) {
    if (pattern.test(text)) return slug;
  }
  return "outros";
}
