/**
 * Owner's directive, 2026-11-21 ("Produtos Philco — aprovado com
 * restrições"): "não faça fusão automática de produtos canônicos apenas
 * por marca e modelo... utilize também os atributos necessários para
 * estabelecer equivalência inequívoca, incluindo variações relevantes
 * como voltagem, capacidade, cor, configuração e composição do kit...
 * se houver ambiguidade, mantenha os produtos separados e registre o
 * caso para revisão."
 *
 * Real root cause this exists for (confirmed live, 2026-11-21): Mercado
 * Livre assigned TWO different official catalogProductIds (MLB49652036,
 * MLB50269368) to what looked like the same physical product (same
 * brand="Philco", model="PSC3500") — but a live GET /products/{id} call
 * for both showed they are GENUINELY DIFFERENT commercial variants:
 * MLB49652036 is 127V, MLB50269368 is 220V (confirmed via each
 * product's real VOLTAGE attribute). A naive brand+model merge would
 * have wrongly fused two real, distinct, non-interchangeable offers —
 * exactly the mistake this module exists to prevent.
 *
 * VOLTAGE and COLOR are confirmed, live, broadly-present ML attribute
 * ids (seen on both the Philco hair-dryer family and the Tssaper spray
 * gun). Real ML "capacity" attributes are CATEGORY-SPECIFIC (e.g.
 * TANK_VOLUME for spray guns, not a universal "CAPACITY" id — confirmed
 * live against Tssaper's real catalog detail) — so this module treats
 * any attribute id in VARIANT_DEFINING_ATTRIBUTE_IDS as a potential
 * variant signal when present, rather than assuming one fixed "capacity"
 * key applies to every category.
 */

export interface MlAttributeLike {
  id: string;
  value_name: string | null;
}

/** Attribute ids that can distinguish two otherwise same-brand/model
 * listings into genuinely different, non-interchangeable commercial
 * variants. VOLTAGE, COLOR, and TANK_VOLUME are empirically confirmed
 * live (2026-11-21) against real ML catalog data for this project;
 * CAPACITY/NET_VOLUME/NET_WEIGHT/UNITS_PER_PACK/NUMBER_OF_PIECES/
 * PACKAGE_WEIGHT are included as standard Mercado Livre catalog taxonomy
 * ids covering capacity and kit-composition variants (the owner's other
 * named examples) but have not yet been individually confirmed against a
 * real product in this dataset — if one of these never actually appears
 * in real data, it simply never contributes a signal (harmless no-op),
 * consistent with this module's fail-safe-to-"ambiguous" design. */
export const VARIANT_DEFINING_ATTRIBUTE_IDS = [
  "VOLTAGE",
  "COLOR",
  "CAPACITY",
  "TANK_VOLUME",
  "NET_VOLUME",
  "NET_WEIGHT",
  "PACKAGE_WEIGHT",
  "UNITS_PER_PACK",
  "NUMBER_OF_PIECES",
] as const;

function normalizeIdentityToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

/** Picks out only the curated, variant-relevant attributes from a real
 * ML catalog detail's `attributes` array — never the full array (most
 * attributes, like PACKAGE_DATA_SOURCE or IS_FOLDABLE, say nothing about
 * whether two listings are the same commercial offer). */
export function extractVariantAttributes(
  attributes: MlAttributeLike[] | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!attributes) return result;
  for (const attr of attributes) {
    if (
      (VARIANT_DEFINING_ATTRIBUTE_IDS as readonly string[]).includes(attr.id) &&
      attr.value_name
    ) {
      result[attr.id] = attr.value_name;
    }
  }
  return result;
}

export interface EquivalenceCandidate {
  brand: string | null;
  model: string | null;
  variantAttributes: Record<string, string>;
}

export type EquivalenceDecision = "equivalent" | "distinct" | "ambiguous";

export interface EquivalenceVerdict {
  decision: EquivalenceDecision;
  /** Attribute ids present on both sides with the same value — the real
   * evidence behind an "equivalent" decision. */
  matchedAttributes: string[];
  /** Attribute ids present on both sides with DIFFERENT values — any
   * single entry here forces "distinct", never overridden. */
  conflictingAttributes: string[];
  reason: string;
}

/**
 * Pure, DB-free equivalence check between a candidate (a new, just-seen
 * real ML catalogProductId) and an existing CanonicalProduct. Never
 * mutates anything — the caller decides what to do with the verdict
 * (reuse the existing canonical, or log an ambiguous/distinct case for
 * human review via CanonicalProductMergeReview).
 *
 * Decision rules, safest-first:
 *  1. Brand or model missing/mismatched on either side → "ambiguous"
 *     (never assume; brand+model are the minimum bar even to consider
 *     equivalence).
 *  2. Any variant-defining attribute present on BOTH sides with a
 *     DIFFERENT value → "distinct", always — a confirmed real
 *     difference (e.g. 127V vs 220V) can never be overridden by
 *     anything else matching.
 *  3. At least one variant-defining attribute present on both sides,
 *     all of them matching, and no conflicts → "equivalent" — real,
 *     positive confirmation, not just "nothing contradicts it".
 *  4. Brand+model match but there is no shared variant-attribute data
 *     to confirm sameness either way → "ambiguous" — the owner's
 *     explicit instruction: no overlap means no confident merge, keep
 *     separate and record the case for review.
 */
export function evaluateCanonicalEquivalence(
  a: EquivalenceCandidate,
  b: EquivalenceCandidate,
): EquivalenceVerdict {
  const brandA = normalizeIdentityToken(a.brand);
  const brandB = normalizeIdentityToken(b.brand);
  const modelA = normalizeIdentityToken(a.model);
  const modelB = normalizeIdentityToken(b.model);

  if (!brandA || !brandB || !modelA || !modelB || brandA !== brandB || modelA !== modelB) {
    return {
      decision: "ambiguous",
      matchedAttributes: [],
      conflictingAttributes: [],
      reason: "Marca e/ou modelo ausentes ou diferentes — sem base mínima para considerar equivalência.",
    };
  }

  const matched: string[] = [];
  const conflicting: string[] = [];
  for (const attrId of VARIANT_DEFINING_ATTRIBUTE_IDS) {
    const valueA = a.variantAttributes[attrId];
    const valueB = b.variantAttributes[attrId];
    if (valueA === undefined || valueB === undefined) continue; // not present on both sides — no signal either way
    if (normalizeIdentityToken(valueA) === normalizeIdentityToken(valueB)) {
      matched.push(attrId);
    } else {
      conflicting.push(attrId);
    }
  }

  if (conflicting.length > 0) {
    return {
      decision: "distinct",
      matchedAttributes: matched,
      conflictingAttributes: conflicting,
      reason: `Mesma marca+modelo, mas ${conflicting.join(", ")} diverge(m) — variação comercial real e distinta (ex.: voltagem/cor diferente).`,
    };
  }

  if (matched.length > 0) {
    return {
      decision: "equivalent",
      matchedAttributes: matched,
      conflictingAttributes: [],
      reason: `Mesma marca+modelo e ${matched.join(", ")} coincide(m) — equivalência confirmada por atributo real, não só por marca+modelo.`,
    };
  }

  return {
    decision: "ambiguous",
    matchedAttributes: [],
    conflictingAttributes: [],
    reason: "Mesma marca+modelo, mas nenhum atributo de variação (voltagem/cor/capacidade/kit) disponível em ambos os lados para confirmar — mantido separado para revisão humana.",
  };
}
