import type {
  EvidenceQuality,
  MonetizationScoreComponent,
  MonetizationScoreComponents,
  MonetizationScoreInput,
  MonetizationScoreResult,
} from "@/types/monetization";

/**
 * "É uma oportunidade economicamente interessante para o PreçoCaindo
 * investir exposição?" — strictly internal, never rendered to a visitor,
 * never mixed with OpportunityScore (lib/services/opportunity-score.ts,
 * "é uma boa compra para o consumidor?"). Nothing in this function ever
 * reads an OpportunityScore value, by design — see docs/MONETIZATION_SCORE.md.
 *
 * Deliberately does NOT compute "expected commission per 1,000 exposures"
 * yet — that needs real traffic + conversion history this codebase doesn't
 * have. Persisting that formula now would be exactly the "cristalizar
 * prematuramente uma fórmula econômica" the project brief forbids. This is
 * the first, honest version: score only what there's real evidence for.
 *
 * Pure and deterministic — no Prisma, no network call, no ML. Every
 * component is tagged with the EvidenceQuality of the value backing it
 * (OBSERVED / DERIVED_FROM_OBSERVED / HISTORICAL_INTERNAL / UNKNOWN); an
 * UNKNOWN component's `value` is always null, never coerced to 0.
 */
export function calculateMonetizationScore(
  input: MonetizationScoreInput,
): MonetizationScoreResult {
  const demand = toComponent(
    input.demandSignal,
    "demanda real observada (ex.: trend/bestseller rank de um marketplace)",
  );
  const commission = toComponent(
    input.commissionSignal,
    "comissão informada ou estimada pelo merchant",
  );
  const trend = toComponent(
    input.trendSignal,
    "sinal de tendência/crescimento de um marketplace",
  );
  const historicalConversion = toComponent(
    input.historicalConversionSignal,
    "taxa de clique/conversão histórica própria do PreçoCaindo",
  );
  // Deliberately never fed from OpportunityScore — this is about the raw
  // offer signal (rating, review count, availability), not "is it a good
  // buy for the consumer".
  const offerQuality = toComponent(
    input.offerQualitySignal,
    "qualidade da oferta (avaliação, nº de reviews, disponibilidade)",
  );

  const components: MonetizationScoreComponents = {
    demand,
    commission,
    trend,
    historicalConversion,
    offerQuality,
  };

  const values = Object.values(components)
    .map((c) => c.value)
    .filter((v): v is number => v !== null);

  const score =
    values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;

  const confidence = round2(
    Object.values(components).reduce(
      (sum, c) => sum + qualityWeight(c.quality),
      0,
    ) / Object.keys(components).length,
  );

  const missingSignals = Object.entries(components)
    .filter(([, c]) => c.quality === "UNKNOWN")
    .map(([name]) => name);

  const reasons = Object.entries(components).map(
    ([name, c]) =>
      c.value === null
        ? `${name}: sem evidência real disponível ainda`
        : `${name}: ${c.detail}`,
  );

  return { score, confidence, components, reasons, missingSignals };
}

function toComponent(
  signal: { value: number; quality: EvidenceQuality } | null,
  label: string,
): MonetizationScoreComponent {
  if (signal === null) {
    return { value: null, quality: "UNKNOWN", detail: `${label} — ausente` };
  }
  return {
    value: signal.value,
    quality: signal.quality,
    detail: `${label} (${signal.quality.toLowerCase()}) = ${signal.value}`,
  };
}

/** How much a component counts toward overall confidence — not toward the
 * score itself (a DERIVED_FROM_OBSERVED value is still used at full weight
 * in the score average; it's just less trustworthy, which confidence must
 * reflect). UNKNOWN contributes 0, never negative, never inflated. */
function qualityWeight(quality: EvidenceQuality): number {
  switch (quality) {
    case "OBSERVED":
      return 1;
    case "DERIVED_FROM_OBSERVED":
      return 0.75;
    case "HISTORICAL_INTERNAL":
      return 0.5;
    case "UNKNOWN":
      return 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
