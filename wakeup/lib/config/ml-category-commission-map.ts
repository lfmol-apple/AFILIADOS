/**
 * Maps the 13 real Mercado Livre category ids this project already scans
 * (lib/config/ml-demand-categories.ts) to lib/config/ml-commission-tiers.ts's
 * local `/ofertas` category slugs, by matching the two category NAMES by
 * inspection (never guessed) — this is the only bridge between the two,
 * since CanonicalProduct.categoryId (a LOCAL Category table id) is
 * confirmed null for every single ML listing in production (found during
 * the 2026-11-19 audit), so there is no live FK path from an MLB category
 * id to a commission-tier slug.
 *
 * Deliberately bounded to these 13 — a category discovered outside this
 * set (e.g. via the broader category-tree crawl for promotional events)
 * has no tier mapping and must report commission as unknown, never a
 * guessed category.
 */
export const ML_CATEGORY_TO_COMMISSION_TIER_SLUG: Readonly<Record<string, string>> = {
  MLB1051: "celulares", // Celulares e Telefones
  MLB1648: "informatica", // Informática
  MLB1000: "audio-games", // Eletrônicos, Áudio e Vídeo
  MLB5726: "eletrodomesticos", // Eletrodomésticos
  MLB1574: "casa", // Casa, Móveis e Decoração
  MLB1246: "beleza", // Beleza e Cuidado Pessoal
  MLB263532: "ferramentas", // Ferramentas
  MLB1276: "esporte-suplementos", // Esportes e Fitness
  MLB1071: "pet", // Animais
  MLB1384: "bebe", // Bebês
  MLB1144: "audio-games", // Games
  MLB5672: "automotivo", // Acessórios para Veículos
  MLB1430: "moda", // Calçados, Roupas e Bolsas
};
