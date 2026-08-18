export type QualityVerdict = "PASS" | "FAIL" | "REVIEW";

export interface QualityCheckInput {
  title: string;
  metaTitle: string;
  metaDescription: string;
  body: string;
  /** Length of the raw marketplace title+description this content is based
   * on, when applicable. Used to reject pages that add no editorial value
   * beyond the catalog listing (project brief section 49). */
  sourceDescriptionLength?: number;
  /** Number of non-null fields in the facts payload used to generate this
   * content. Higher means more claims are actually grounded in real data
   * (dataSupport dimension) — 0/undefined means we can't verify grounding
   * and dataSupport is scored conservatively. */
  sourceFactCount?: number;
  /** 0-1 similarity (see lib/services/similarity.ts) against the most
   * similar already-published page of the same type. High values flag
   * scaled/templated content — the same page with only the product name
   * swapped (project brief Part G). */
  similarityToExistingContent?: number;
}

export interface QualityDimensions {
  /** Adds value beyond the marketplace listing and isn't a copy. */
  originality: number;
  /** Claims are backed by real supplied facts, not filler. */
  dataSupport: number;
  /** Structured enough to actually help a reader decide. */
  usefulness: number;
  /** 0 = no risk, 100 = near-duplicate of existing content. */
  duplicationRisk: number;
  /** Doesn't misrepresent PreçoCaindo as the seller / hide the affiliate
   * relationship. */
  commercialTransparency: number;
}

export interface QualityCheckResult {
  verdict: QualityVerdict;
  reasons: string[];
  qualityScore: number;
  dimensions: QualityDimensions;
}

const MIN_BODY_LENGTH = 600;
const MIN_HEADINGS = 3;
const MIN_META_TITLE = 15;
const MAX_META_TITLE = 70;
const MIN_META_DESCRIPTION = 50;
const MAX_META_DESCRIPTION = 160;
const MIN_VALUE_ADD_RATIO = 1.5;
const DUPLICATION_RISK_FAIL_THRESHOLD = 0.75;
const DUPLICATION_RISK_REVIEW_THRESHOLD = 0.5;

// Phrases that would misrepresent PreçoCaindo as the seller/checkout
// (project brief sections 12/45 and Part I: "PreçoCaindo é editorial/
// affiliate. Ele NÃO processa checkout."). Matched case-insensitively.
const SELLER_MISREPRESENTATION_PATTERNS = [
  /compr(a|e|ar)\s+agora\s+no\s+pre[çc]ocaindo/i,
  /adicionar\s+ao\s+carrinho/i,
  /finalizar\s+(a\s+)?compra\s+(aqui|no\s+pre[çc]ocaindo)/i,
  /pre[çc]ocaindo\s+vende/i,
];

function countHeadings(body: string): number {
  return (body.match(/^#{2,3}\s+.+$/gm) ?? []).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findSellerMisrepresentation(body: string): string | null {
  for (const pattern of SELLER_MISREPRESENTATION_PATTERNS) {
    if (pattern.test(body)) return pattern.source;
  }
  return null;
}

/**
 * Structural gate for automatically generated pages: PASS/FAIL/REVIEW.
 * Conservative by design (project brief section 13) — it only checks what
 * can be verified mechanically (length, structure, value-add over the raw
 * listing, data grounding, duplication risk, commercial transparency). It
 * does not, and cannot, verify factual accuracy; that responsibility stays
 * with ContentGenerator's no-hallucination rule and the VerifiedFacts
 * contract (see docs/CONTENT_ENGINE.md).
 */
export function evaluateContentQuality(
  input: QualityCheckInput,
): QualityCheckResult {
  const hardFailures: string[] = [];
  const softIssues: string[] = [];

  const title = input.title.trim();
  const body = input.body.trim();

  if (title.length < 10) {
    hardFailures.push("Título ausente ou muito curto");
  }

  if (input.metaTitle.trim().length < MIN_META_TITLE) {
    hardFailures.push("Meta título muito curto");
  } else if (input.metaTitle.trim().length > MAX_META_TITLE) {
    softIssues.push("Meta título acima do recomendado para SEO");
  }

  if (
    input.metaDescription.trim().length < MIN_META_DESCRIPTION ||
    input.metaDescription.trim().length > MAX_META_DESCRIPTION
  ) {
    softIssues.push(
      "Meta description fora da faixa recomendada (50-160 caracteres)",
    );
  }

  if (body.length < MIN_BODY_LENGTH) {
    hardFailures.push(
      `Conteúdo muito curto (${body.length} caracteres, mínimo ${MIN_BODY_LENGTH})`,
    );
  }

  const headingCount = countHeadings(body);
  if (headingCount < MIN_HEADINGS) {
    softIssues.push(
      `Estrutura editorial insuficiente (${headingCount} seções, mínimo ${MIN_HEADINGS})`,
    );
  }

  let valueAddRatio: number | null = null;
  if (input.sourceDescriptionLength && input.sourceDescriptionLength > 0) {
    valueAddRatio = body.length / input.sourceDescriptionLength;
    if (valueAddRatio < MIN_VALUE_ADD_RATIO) {
      hardFailures.push(
        "Conteúdo não agrega valor suficiente além da ficha do marketplace (possível duplicação)",
      );
    }
  }

  if (body.length > 0 && body.slice(0, 80) === title.slice(0, 80)) {
    hardFailures.push("Corpo começa como cópia literal do título");
  }

  const misrepresentation = findSellerMisrepresentation(body);
  if (misrepresentation) {
    hardFailures.push(
      "Conteúdo dá a entender que o PreçoCaindo vende o produto ou processa checkout",
    );
  }

  const similarity = input.similarityToExistingContent ?? 0;
  if (similarity >= DUPLICATION_RISK_FAIL_THRESHOLD) {
    hardFailures.push(
      `Conteúdo quase idêntico a uma página já existente (similaridade ${(similarity * 100).toFixed(0)}%)`,
    );
  } else if (similarity >= DUPLICATION_RISK_REVIEW_THRESHOLD) {
    softIssues.push(
      `Similaridade elevada com conteúdo existente (${(similarity * 100).toFixed(0)}%)`,
    );
  }

  const verdict: QualityVerdict =
    hardFailures.length > 0
      ? "FAIL"
      : softIssues.length > 0
        ? "REVIEW"
        : "PASS";

  const penalty = hardFailures.length * 30 + softIssues.length * 10;
  const qualityScore = Math.max(0, Math.min(100, 100 - penalty));

  const dimensions: QualityDimensions = {
    originality: clamp(
      valueAddRatio !== null
        ? ((valueAddRatio - 1) / (MIN_VALUE_ADD_RATIO - 1)) * 60 + 40
        : 70,
      0,
      100,
    ),
    dataSupport: clamp(((input.sourceFactCount ?? 0) / 8) * 100, 0, 100),
    usefulness: clamp(
      (headingCount / (MIN_HEADINGS + 2)) * 70 +
        (body.length >= MIN_BODY_LENGTH ? 30 : 0),
      0,
      100,
    ),
    duplicationRisk: clamp(similarity * 100, 0, 100),
    commercialTransparency: misrepresentation ? 0 : 100,
  };

  return {
    verdict,
    reasons: [...hardFailures, ...softIssues],
    qualityScore,
    dimensions,
  };
}
