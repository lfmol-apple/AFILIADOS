import { prisma } from "@/lib/db";

/**
 * Compact, commercial demand terms for Shopee's keyword search, derived
 * from real Mercado Livre catalog products (Demand-Driven Discovery,
 * 2026-09-08 — project brief section 7: "brand + model... evitar termos
 * genéricos como celular, notebook, oferta"). Never a bare category word:
 * a term with no real brand+model is skipped outright rather than falling
 * back to something generic.
 */
const GENERIC_TERM_BLOCKLIST = new Set([
  "celular",
  "notebook",
  "oferta",
  "promoção",
  "promocao",
  "fone",
  "eletrônico",
  "eletronico",
  "acessório",
  "acessorio",
]);

export interface DemandTerm {
  term: string;
  canonicalProductId: string;
}

/**
 * Picks the top `limit` real ML canonical products by MonetizationScore
 * (already-computed real signal — never a new score) that have a genuine
 * brand+model, and builds a `"${brand} ${model}"` term for each. Skips
 * anything that would produce a blocklisted generic term or an
 * empty/too-short one — better to search fewer real terms than to waste a
 * Shopee call on something too broad to be useful.
 */
export async function pickDemandDrivenTerms(limit: number): Promise<DemandTerm[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      merchant: { code: "MERCADO_LIVRE" },
      active: true,
      canonicalProductId: { not: null },
      canonicalProduct: { is: { brand: { not: null }, model: { not: null } } },
    },
    include: { monetizationScore: true, canonicalProduct: { select: { id: true, brand: true, model: true } } },
    orderBy: { monetizationScore: { score: "desc" } },
    take: limit * 3, // over-fetch a bit — some will be filtered/deduped below.
  });

  const seenCanonical = new Set<string>();
  const terms: DemandTerm[] = [];

  for (const listing of listings) {
    if (terms.length >= limit) break;
    const canonical = listing.canonicalProduct;
    if (!canonical || seenCanonical.has(canonical.id)) continue;
    seenCanonical.add(canonical.id);

    const term = `${canonical.brand} ${canonical.model}`.trim();
    const normalized = term.toLowerCase();
    if (term.length < 4) continue;
    if (GENERIC_TERM_BLOCKLIST.has(normalized)) continue;

    terms.push({ term, canonicalProductId: canonical.id });
  }

  return terms;
}
