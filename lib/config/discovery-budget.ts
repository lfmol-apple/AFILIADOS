/**
 * Call budget for the General Market Scanner / Demand-Driven Discovery
 * (2026-09-08 — project brief section 20: "implementar orçamento por
 * ciclo... configurar conservadoramente"). Every value here is a real,
 * explicit constant a human can change without touching job logic —
 * never inferred from load or hardcoded inline where it'd be easy to miss.
 */

/** ML categories scanned per cycle — see
 * lib/config/ml-demand-categories.ts's rotation groups (4-5 categories
 * each); this is documentation of that choice's real cost, not a second
 * knob (the groups themselves are already sized to this). */
export const ML_CATEGORIES_PER_CYCLE = 4;

/** How many real ML canonical products' brand+model become Shopee
 * keyword searches per cycle. Small on purpose: each term is a real
 * GraphQL call, and this path is complementary to Shopee's own general
 * discovery, not a replacement for it. */
export const SHOPEE_DEMAND_TERMS_PER_CYCLE = 5;

/** Results requested per demand-driven keyword search — kept small since
 * only the top few results of a keyword search are ever going to be the
 * actual product (see docs/DEMAND_DRIVEN_DISCOVERY.md's real finding:
 * accessories dominate past the first handful anyway). */
export const SHOPEE_DEMAND_RESULTS_PER_TERM = 5;
