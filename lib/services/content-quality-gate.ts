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
}

export interface QualityCheckResult {
  verdict: QualityVerdict;
  reasons: string[];
  qualityScore: number;
}

const MIN_BODY_LENGTH = 600;
const MIN_HEADINGS = 3;
const MIN_META_TITLE = 15;
const MAX_META_TITLE = 70;
const MIN_META_DESCRIPTION = 50;
const MAX_META_DESCRIPTION = 160;
const MIN_VALUE_ADD_RATIO = 1.5;

function countHeadings(body: string): number {
  return (body.match(/^#{2,3}\s+.+$/gm) ?? []).length;
}

/**
 * Structural gate for automatically generated pages: PASS/FAIL/REVIEW.
 * Conservative by design (project brief section 13) — it only checks what
 * can be verified mechanically (length, structure, value-add over the raw
 * listing). It does not, and cannot, verify factual accuracy; that
 * responsibility stays with ContentGenerator's no-hallucination rule.
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

  if (input.sourceDescriptionLength && input.sourceDescriptionLength > 0) {
    const ratio = body.length / input.sourceDescriptionLength;
    if (ratio < MIN_VALUE_ADD_RATIO) {
      hardFailures.push(
        "Conteúdo não agrega valor suficiente além da ficha do marketplace (possível duplicação)",
      );
    }
  }

  if (body.length > 0 && body.slice(0, 80) === title.slice(0, 80)) {
    hardFailures.push("Corpo começa como cópia literal do título");
  }

  const verdict: QualityVerdict =
    hardFailures.length > 0
      ? "FAIL"
      : softIssues.length > 0
        ? "REVIEW"
        : "PASS";

  const penalty = hardFailures.length * 30 + softIssues.length * 10;
  const qualityScore = Math.max(0, Math.min(100, 100 - penalty));

  return { verdict, reasons: [...hardFailures, ...softIssues], qualityScore };
}
