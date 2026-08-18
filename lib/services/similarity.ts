import { createHash } from "node:crypto";

/**
 * Text similarity/deduplication without an LLM (project brief Part G:
 * "Criar métricas de similaridade/deduplicação sem depender necessariamente
 * de LLM"). Used to catch scaled content abuse — pages that are the same
 * template with only the product name swapped.
 */

function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(tokens: string[], size = 3): Set<string> {
  if (tokens.length === 0) return new Set();
  if (tokens.length < size) return new Set([tokens.join(" ")]);
  const result = new Set<string>();
  for (let i = 0; i <= tokens.length - size; i++) {
    result.add(tokens.slice(i, i + size).join(" "));
  }
  return result;
}

/** 0 = completely different, 1 = identical (as sets of 3-word shingles). */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = shingles(tokenize(a));
  const setB = shingles(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const shingle of setA) {
    if (setB.has(shingle)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Highest similarity between `body` and any text in `corpus`, for flagging
 * near-duplicate scaled content against already-published pages. */
export function maxSimilarityAgainstCorpus(body: string, corpus: string[]): number {
  let max = 0;
  for (const other of corpus) {
    const score = jaccardSimilarity(body, other);
    if (score > max) max = score;
  }
  return max;
}

/** Deterministic hash of the normalized body — cheap exact/near-exact
 * duplicate detection via a DB index, before ever computing similarity. */
export function contentHash(body: string): string {
  const normalized = tokenize(body).join(" ");
  return createHash("sha256").update(normalized).digest("hex");
}
