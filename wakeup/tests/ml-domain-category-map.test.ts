import { describe, expect, it } from "vitest";
import { mapDomainIdToCategorySlug } from "@/lib/services/commercial-intelligence/ml-domain-category-map";

/**
 * Real root cause, 2026-11-20: 100% of CanonicalProduct rows had
 * categoryId null, even though Mercado Livre's real domain_id was
 * already captured for every one of them. These assertions use the
 * TOP real domain_id values actually observed in production (confirmed
 * via a direct query, not guessed), so this suite fails loudly if a
 * real, common category stops mapping correctly.
 */
describe("mapDomainIdToCategorySlug — real ML domain_id → our 17 real categories", () => {
  it("maps real, high-volume domain_ids to the correct category (observed in production)", () => {
    expect(mapDomainIdToCategorySlug("MLB-PERFUMES")).toBe("beleza");
    expect(mapDomainIdToCategorySlug("MLB-HAIR_TREATMENTS")).toBe("beleza");
    expect(mapDomainIdToCategorySlug("MLB-FACIAL_SKIN_CARE_PRODUCTS")).toBe("beleza");
    expect(mapDomainIdToCategorySlug("MLB-SUNSCREENS")).toBe("beleza");
    expect(mapDomainIdToCategorySlug("MLB-SUPPLEMENTS")).toBe("esporte-suplementos");
    expect(mapDomainIdToCategorySlug("MLB-STATIONARY_BICYCLES")).toBe("esporte-suplementos");
    expect(mapDomainIdToCategorySlug("MLB-CELLPHONES")).toBe("celulares");
    expect(mapDomainIdToCategorySlug("MLB-SMARTWATCHES")).toBe("celulares");
    expect(mapDomainIdToCategorySlug("MLB-HEADPHONES")).toBe("audio-games");
    expect(mapDomainIdToCategorySlug("MLB-ELECTRIC_DRILLS")).toBe("ferramentas");
    expect(mapDomainIdToCategorySlug("MLB-ELECTRIC_PRESSURE_WASHERS")).toBe("ferramentas");
    expect(mapDomainIdToCategorySlug("MLB-POWER_GRINDERS")).toBe("ferramentas");
    expect(mapDomainIdToCategorySlug("MLB-AIR_FRYERS")).toBe("eletrodomesticos");
    expect(mapDomainIdToCategorySlug("MLB-WASHING_MACHINES")).toBe("eletrodomesticos");
    expect(mapDomainIdToCategorySlug("MLB-REFRIGERATORS")).toBe("eletrodomesticos");
    expect(mapDomainIdToCategorySlug("MLB-FANS")).toBe("eletrodomesticos");
    expect(mapDomainIdToCategorySlug("MLB-VACUUM_AND_STEAM_CLEANERS")).toBe("eletrodomesticos");
    expect(mapDomainIdToCategorySlug("MLB-KITCHEN_CABINETS")).toBe("casa");
    expect(mapDomainIdToCategorySlug("MLB-SUITCASES")).toBe("moda");
    expect(mapDomainIdToCategorySlug("MLB-BACKPACKS")).toBe("moda");
    expect(mapDomainIdToCategorySlug("MLB-SNEAKERS")).toBe("moda");
    expect(mapDomainIdToCategorySlug("MLB-HANDBAGS")).toBe("moda");
    expect(mapDomainIdToCategorySlug("MLB-CAT_AND_DOG_FOODS")).toBe("pet");
    expect(mapDomainIdToCategorySlug("MLB-BICYCLES")).toBe("automotivo");
  });

  it("never fabricates a category for something that doesn't genuinely fit one of the 17 — falls through to the real 'outros' category", () => {
    expect(mapDomainIdToCategorySlug("MLB-BOOKS")).toBe("outros");
    expect(mapDomainIdToCategorySlug("MLB-SOME_FUTURE_DOMAIN_WE_HAVE_NEVER_SEEN")).toBe("outros");
  });

  it("never returns null/undefined, even for missing input — every product gets a real, honest category assignment", () => {
    expect(mapDomainIdToCategorySlug(null)).toBe("outros");
    expect(mapDomainIdToCategorySlug(undefined)).toBe("outros");
    expect(mapDomainIdToCategorySlug("")).toBe("outros");
  });
});
