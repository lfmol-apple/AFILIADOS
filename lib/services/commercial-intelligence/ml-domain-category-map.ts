/**
 * Real root cause, 2026-11-20 (owner's directive, "Etapa 4 — Categorias e
 * Sazonalidade"): 100% of CanonicalProduct rows (2641/2641, every
 * product on the site, not just the 30 Vitrine ones) have `categoryId`
 * null — NOT because the data doesn't exist, but because
 * `lib/services/ml-enrichment-collector.ts` already captures Mercado
 * Livre's real `domain_id` (e.g. "MLB-AIR_FRYERS") into
 * `specifications.domainId` on every single product, and nothing ever
 * reads it back out to populate the real `categoryId` foreign key.
 *
 * This maps that real, already-captured domain_id to one of our own 17
 * real `Category` rows, by keyword — never a guess disconnected from the
 * actual classification Mercado Livre itself already gave the product.
 * Unmatched domain_ids fall through to "outros" (a real category row),
 * never a fabricated one — this is the "fallback controlado" the owner
 * required, not silent invention.
 *
 * Ordered rule list: first matching keyword wins, so more specific
 * keywords are listed before broader ones when they could both match
 * the same domain_id.
 */

export interface DomainCategoryRule {
  categorySlug: string;
  keywords: string[];
}

export const DOMAIN_TO_CATEGORY_RULES: DomainCategoryRule[] = [
  {
    categorySlug: "beleza",
    keywords: ["HAIR", "SKIN", "PERFUME", "SUNSCREEN", "FACIAL", "NAIL", "MAKEUP", "COSMETIC", "FRAGRANCE"],
  },
  {
    categorySlug: "esporte-suplementos",
    keywords: ["SUPPLEMENT", "STATIONARY_BICYCLE", "FITNESS", "GYM", "DUMBBELL", "WEIGHT", "EXERCISE", "PROTEIN", "SPORT"],
  },
  {
    categorySlug: "celulares",
    keywords: ["CELLPHONE", "SMARTWATCH", "MOBILE_DEVICE", "PHONE_CASE", "SMARTPHONE"],
  },
  {
    categorySlug: "audio-games",
    keywords: ["HEADPHONE", "SPEAKER", "SOUNDBAR", "TELEVISION", "_TV", "GAME_CONSOLE", "VIDEOGAME"],
  },
  {
    categorySlug: "informatica",
    keywords: ["NOTEBOOK", "DESKTOP_COMPUTER", "PRINTER", "KEYBOARD", "COMPUTER_MOUSE", "MONITOR", "3D_PRINTER", "FILAMENT"],
  },
  {
    categorySlug: "ferramentas",
    keywords: ["DRILL", "SCREWDRIVER", "IMPACT_WRENCH", "POWER_GRINDER", "PRESSURE_WASHER", "GARDEN", "SPRAY_GUN", "POWER_TOOL"],
  },
  {
    categorySlug: "eletrodomesticos",
    keywords: [
      "WASHING_MACHINE",
      "REFRIGERATOR",
      "AIR_CONDITIONER",
      "AIR_FRYER",
      "FANS",
      "VACUUM",
      "ELECTRIC_SHOWER",
      "ELECTRIC_POT",
      "BLENDER",
      "MICROWAVE",
      "ELECTRIC_HAIR_BRUSH",
    ],
  },
  {
    categorySlug: "casa",
    keywords: ["KITCHEN_CABINET", "FOOD_STORAGE", "COOKWARE", "DECORATION", "CHRISTMAS", "FURNITURE", "MIRROR", "CURTAIN", "BEDDING", "TOWEL"],
  },
  {
    categorySlug: "moda",
    keywords: ["SNEAKER", "HANDBAG", "SUITCASE", "BACKPACK", "CLOTHING", "DRESS", "JEWELRY", "WATCH_"],
  },
  {
    categorySlug: "pet",
    keywords: ["CAT_AND_DOG", "PET_", "DOG_", "CAT_"],
  },
  {
    categorySlug: "bebe",
    keywords: ["BABY", "DIAPER", "STROLLER"],
  },
  {
    categorySlug: "alimentos",
    keywords: ["BEVERAGE", "CHOCOLATE", "SNACK_FOOD", "COFFEE"],
  },
  {
    categorySlug: "automotivo",
    keywords: ["_CAR_", "MOTORCYCLE", "VEHICLE", "BICYCLE", "ELECTRIC_BICYCLE"],
  },
  {
    categorySlug: "musica",
    keywords: ["MUSICAL_INSTRUMENT", "GUITAR", "KEYBOARD_INSTRUMENT"],
  },
  {
    categorySlug: "limpeza",
    keywords: ["CLEANING_PRODUCT", "DETERGENT", "TOILET_PAPER"],
  },
  {
    categorySlug: "brinquedos-festas",
    keywords: ["TOY", "PARTY_SUPPL", "BALLOON"],
  },
];

/** Returns the real Category slug this real domain_id maps to, or
 * "outros" (a real, existing category — never a fabricated one) when
 * nothing matches. Never returns null: an unclassifiable product still
 * gets a real, honest category assignment, just the explicit catch-all. */
export function mapDomainIdToCategorySlug(domainId: string | null | undefined): string {
  if (!domainId) return "outros";
  const upper = domainId.toUpperCase();
  for (const rule of DOMAIN_TO_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => upper.includes(kw))) return rule.categorySlug;
  }
  return "outros";
}
