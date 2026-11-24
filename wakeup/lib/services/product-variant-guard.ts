/**
 * Variant-confusion guard for ProductMatcher's heuristic tiers
 * (BRAND_MODEL, TEXTUAL_CANDIDATE) — project brief, ProductMatcher Shadow
 * Mode, 2026-09-08: "extremo cuidado com armazenamento, RAM, voltagem...
 * Galaxy A17 128GB ≠ automaticamente Galaxy A17 256GB". Confirmed as a
 * REAL risk in this app's own production data, not hypothetical: two
 * real CanonicalProduct rows share `model: "Galaxy A17"` while one is
 * "128GB...Cinza" and the other "128GB...Preto Black" (same capacity,
 * different color — fine), and separately two real `model: "iPhone 17"`
 * rows are "512 GB" vs "256 GB" (different capacity — exactly the
 * scenario this guard exists to block).
 *
 * Deliberately NOT applied to GTIN/MANUFACTURER_ID: a real-world
 * identifier already encodes the exact variant (a different capacity is
 * a different real GTIN) — second-guessing it with a text heuristic
 * would be backwards. Only the two heuristic tiers, which infer identity
 * from brand/model strings or raw title similarity, need this.
 *
 * Scope, deliberately conservative in both directions:
 *  - Storage capacity and voltage: if BOTH titles expose an extractable
 *    value and they differ, the pair is incompatible — these are
 *    unambiguous numeric facts, safe to compare directly.
 *  - Tier words (Pro/Plus/Ultra/Max/Mini/SE): incompatible whenever the
 *    two titles' sets of tier words differ AT ALL — including a tier
 *    word present on only one side (project brief's own example:
 *    "iPhone 16 ≠ iPhone 16 Pro"). This can occasionally miss a genuine
 *    same-tier match whose title happens to omit the word — accepted,
 *    per this phase's explicit precision-over-coverage principle (a
 *    missed CANDIDATE costs nothing; a wrongly-blended Pro/non-Pro pair
 *    would be exactly the false positive this guard exists to prevent).
 *  - Color is deliberately NOT checked here — "mesmo modelo, cor
 *    diferente" is a legitimate CANDIDATE-level relationship this system
 *    still wants to surface (never CONFIRMED without a real identifier
 *    either way), not a false positive to suppress.
 */

// RAM ("4GB Ram") appears alongside storage ("128GB") in real titles —
// taking the MAX gb-equivalent value in a title is the correct capacity
// signal in every real sample observed (storage is always the larger
// number: "128GB 4GB Ram", "256GB 12GB (4GB RAM+8GB Ram Boost)").
function extractStorageGb(title: string): number | null {
  const matches = [...title.matchAll(/(\d+(?:[.,]\d+)?)\s*(gb|tb)\b/gi)];
  if (matches.length === 0) return null;
  const values = matches.map(([, num, unit]) => {
    const n = Number(num!.replace(",", "."));
    return unit!.toLowerCase() === "tb" ? n * 1024 : n;
  });
  return Math.max(...values);
}

function extractVoltage(title: string): number | null {
  const match = title.match(/\b(110|115|120|127|220|230|240)\s*v\b/i);
  return match ? Number(match[1]) : null;
}

const TIER_PATTERN = /\b(pro\s*max|ultra|plus|pro|max|mini|se)\b/gi;

function extractTierWords(title: string): Set<string> {
  const found = new Set<string>();
  for (const match of title.matchAll(TIER_PATTERN)) {
    found.add(match[1]!.toLowerCase().replace(/\s+/g, " "));
  }
  return found;
}

export interface VariantConflict {
  conflict: boolean;
  reason?: "STORAGE" | "VOLTAGE" | "TIER";
  detail?: Record<string, unknown>;
}

export function detectVariantConflict(titleA: string, titleB: string): VariantConflict {
  const capA = extractStorageGb(titleA);
  const capB = extractStorageGb(titleB);
  if (capA !== null && capB !== null && capA !== capB) {
    return { conflict: true, reason: "STORAGE", detail: { capacityGbA: capA, capacityGbB: capB } };
  }

  const voltA = extractVoltage(titleA);
  const voltB = extractVoltage(titleB);
  if (voltA !== null && voltB !== null && voltA !== voltB) {
    return { conflict: true, reason: "VOLTAGE", detail: { voltageA: voltA, voltageB: voltB } };
  }

  const tierA = extractTierWords(titleA);
  const tierB = extractTierWords(titleB);
  if (tierA.size > 0 || tierB.size > 0) {
    const sameSet = tierA.size === tierB.size && [...tierA].every((t) => tierB.has(t));
    if (!sameSet) {
      // Includes the case where only one side mentions a tier word at all
      // — e.g. "iPhone 16" vs "iPhone 16 Pro" (project brief's own
      // example). A real product line's base tier and its "Pro"/"Plus"
      // variant are different real products; treating "no tier word
      // mentioned" as equivalent to "confirmed base tier" would be the
      // false positive, not this stricter rule's occasional false
      // negative (missing a same-tier match whose title just omits the
      // word) — precision over coverage (project brief section 3).
      return {
        conflict: true,
        reason: "TIER",
        detail: { tierWordsA: [...tierA], tierWordsB: [...tierB] },
      };
    }
  }

  return { conflict: false };
}
