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
  /** Real root cause fixed, 2026-11-21 (PR #17 review, "equivalência
   * canônica — pode ser insuficiente quando há atributos comerciais
   * relevantes presentes somente em um dos produtos"): attribute ids
   * known on exactly ONE side — e.g. side A's real ML attributes include
   * CAPACITY but side B's don't, for whatever reason (a real gap in the
   * catalog detail response, an attribute ML hasn't filled in yet for
   * that specific catalogProductId, etc.). Any entry here means genuine
   * variant-relevant information exists that could NOT be cross-checked
   * — this alone blocks "equivalent", even when every SHARED attribute
   * matches with zero conflicts. */
  asymmetricAttributes: string[];
  reason: string;
}

/**
 * Pure, DB-free equivalence check between a candidate (a new, just-seen
 * real ML catalogProductId) and an existing CanonicalProduct. Never
 * mutates anything — the caller decides what to do with the verdict
 * (reuse the existing canonical, or log an ambiguous/distinct case for
 * human review via CanonicalProductMergeReview).
 *
 * Decision rules, safest-first (conservative by construction: every rule
 * below either confirms "distinct" or requires POSITIVE evidence for
 * "equivalent" — the default on any doubt is always "ambiguous"):
 *  1. Brand or model missing/mismatched on either side → "ambiguous"
 *     (never assume; brand+model are the minimum bar even to consider
 *     equivalence).
 *  2. Any variant-defining attribute present on BOTH sides with a
 *     DIFFERENT value → "distinct", always — a confirmed real
 *     difference (e.g. 127V vs 220V) can never be overridden by
 *     anything else matching.
 *  3. Real root cause fixed, 2026-11-21 (PR #17 review): any variant-
 *     defining attribute known on only ONE side (asymmetric coverage) →
 *     "ambiguous", even if every attribute that IS shared matches with
 *     no conflict. A real, commercially-relevant attribute present on
 *     only one of the two real catalogProductIds is exactly the kind of
 *     case a naive "ignore what's not shared" rule would wrongly wave
 *     through — the side missing it might simply never have had that
 *     attribute filled in by ML yet, not necessarily because it doesn't
 *     apply; equivalence can never be confidently demonstrated while
 *     that gap exists.
 *  4. At least one variant-defining attribute present on BOTH sides
 *     (and, by rule 3, no attribute present on only one side), all
 *     shared attributes matching, and no conflicts → "equivalent" —
 *     real, positive, SYMMETRIC confirmation, not just "nothing
 *     contradicts it".
 *  5. Brand+model match but there is no shared variant-attribute data
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
      asymmetricAttributes: [],
      reason: "Marca e/ou modelo ausentes ou diferentes — sem base mínima para considerar equivalência.",
    };
  }

  const matched: string[] = [];
  const conflicting: string[] = [];
  const asymmetric: string[] = [];
  for (const attrId of VARIANT_DEFINING_ATTRIBUTE_IDS) {
    const valueA = a.variantAttributes[attrId];
    const valueB = b.variantAttributes[attrId];
    if (valueA === undefined && valueB === undefined) continue; // not present on either side — no signal either way
    if (valueA === undefined || valueB === undefined) {
      // Real root cause fixed, 2026-11-21 (PR #17 review): known on only
      // ONE side — a real, commercially-relevant gap, never silently
      // ignored. Blocks "equivalent" below regardless of what else matches.
      asymmetric.push(attrId);
      continue;
    }
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
      asymmetricAttributes: asymmetric,
      reason: `Mesma marca+modelo, mas ${conflicting.join(", ")} diverge(m) — variação comercial real e distinta (ex.: voltagem/cor diferente).`,
    };
  }

  if (asymmetric.length > 0) {
    return {
      decision: "ambiguous",
      matchedAttributes: matched,
      conflictingAttributes: [],
      asymmetricAttributes: asymmetric,
      reason: `Mesma marca+modelo${matched.length > 0 ? ` e ${matched.join(", ")} coincide(m)` : ""}, mas ${asymmetric.join(", ")} só está disponível em um dos dois produtos — equivalência não pode ser demonstrada com cobertura de atributos incompleta, mantido separado para revisão humana.`,
    };
  }

  if (matched.length > 0) {
    return {
      decision: "equivalent",
      matchedAttributes: matched,
      conflictingAttributes: [],
      asymmetricAttributes: [],
      reason: `Mesma marca+modelo e ${matched.join(", ")} coincide(m), sem nenhum atributo de variação assimétrico — equivalência confirmada por atributo real, não só por marca+modelo.`,
    };
  }

  return {
    decision: "ambiguous",
    matchedAttributes: [],
    conflictingAttributes: [],
    asymmetricAttributes: [],
    reason: "Mesma marca+modelo, mas nenhum atributo de variação (voltagem/cor/capacidade/kit) disponível em ambos os lados para confirmar — mantido separado para revisão humana.",
  };
}
