/**
 * Owner's finding, 2026-11-20 ("Auditoria Contínua", section 1/4): a
 * title in Spanish ("Taza Termica Portácil De 32oz /color Vaca Lechera")
 * or entirely in English ("Warm Snow Boots And Cotton Shoes For Women
 * 2026 A Khaki 36 Eu") reached the Vitrine — a real commercial risk for
 * ads aimed at a Brazilian audience (confusing buyers, looking like a
 * cross-border/dropship listing, undermining the creative's credibility),
 * never checked before now.
 *
 * Deliberately a heuristic, word-list-based detector, not a language
 * model — cheap, deterministic, reviewable, and honest about being
 * approximate. Flags only on >=2 distinct STRONG markers (words with no
 * legitimate standalone use in a Brazilian Portuguese product title) to
 * keep false positives low on a title that merely shares one ambiguous
 * word. This is evidence (a real pattern found live), not an invented
 * universal rule — see vitrine-selection.ts for how it gates entry.
 */

// Deliberately excludes any word that also has a legitimate standalone
// meaning in Portuguese after diacritics are stripped — "años"/"anos",
// "más"/"mas", "aquí"/"aqui", "está"/"esta", "que", "como", "vaca" and
// "días"/"dias" were all in an earlier draft and every one of them
// collides with a real Portuguese word, which would have flagged
// legitimate pt-BR titles. Only words with NO such standalone Portuguese
// meaning survive here.
const STRONG_SPANISH_MARKERS = [
  "lechera",
  "taza",
  "sin",
  "muy",
  "bano",
  "baño",
  "tambien",
  "segun",
  "según",
  "mejor",
  "ahora",
  "pero",
  "ningun",
  "ningún",
];

const STRONG_ENGLISH_MARKERS = [
  "the",
  "and",
  "for",
  "with",
  "shoes",
  "boots",
  "women",
  "men",
  "snow",
  "warm",
  "cotton",
  "size",
  "color",
  "free",
  "shipping",
  "new",
  "best",
  "high",
  "quality",
];

export interface DescriptionQualityResult {
  quality: "adequada" | "inadequada";
  matchedMarkers: string[];
  language: "pt" | "es" | "en" | "indeterminado";
}

function normalizeWords(title: string): string[] {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function countMatches(words: string[], markers: string[]): string[] {
  const normalizedMarkers = new Set(
    markers.map((m) =>
      m
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase(),
    ),
  );
  return words.filter((w) => normalizedMarkers.has(w));
}

const MIN_STRONG_MARKERS_TO_FLAG = 2;

export function evaluateDescriptionQuality(title: string): DescriptionQualityResult {
  const words = normalizeWords(title);
  const spanishHits = countMatches(words, STRONG_SPANISH_MARKERS);
  const englishHits = countMatches(words, STRONG_ENGLISH_MARKERS);

  const distinctSpanish = new Set(spanishHits).size;
  const distinctEnglish = new Set(englishHits).size;

  if (distinctSpanish >= MIN_STRONG_MARKERS_TO_FLAG && distinctSpanish >= distinctEnglish) {
    return { quality: "inadequada", matchedMarkers: [...new Set(spanishHits)], language: "es" };
  }
  if (distinctEnglish >= MIN_STRONG_MARKERS_TO_FLAG) {
    return { quality: "inadequada", matchedMarkers: [...new Set(englishHits)], language: "en" };
  }
  return { quality: "adequada", matchedMarkers: [], language: "pt" };
}
