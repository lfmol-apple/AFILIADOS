import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { isValidAsin } from "@/lib/amazon/policy-guard";
import { isMarketplaceCode } from "@/lib/config/marketplaces";

/**
 * Registers one ProductCandidate — the entry point to the cohort-selection
 * queue (docs/COHORT.md). Never touches Product, never becomes public by
 * itself; promotion is a separate, deliberate step (scripts/candidate-
 * promote.ts). Heuristic scores are optional manual 0-100 integers — never
 * inferred, never machine-scored.
 *
 * Usage:
 *   npm run candidate:add -- --asin B0EXAMPLE1 --title "Nome de trabalho" \
 *     --rationale "Por que este ASIN vale a pena avaliar" \
 *     [--marketplace BR] [--category eletronicos] [--slug slug-sugerido] \
 *     [--searchPotential 70] [--purchaseIntent 60] [--ticketSize 50] \
 *     [--commissionEstimate 40] [--longTailOpportunity 50] \
 *     [--seoCompetitiveness 60] [--valuePropositionFit 70] [--clickProbability 55]
 */
const SCORE_FIELDS = [
  "searchPotential",
  "purchaseIntent",
  "ticketSize",
  "commissionEstimate",
  "longTailOpportunity",
  "seoCompetitiveness",
  "valuePropositionFit",
  "clickProbability",
] as const;

function parseScore(raw: string | undefined, field: string): number | undefined | null {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 100) {
    console.error(`--${field} deve ser um inteiro entre 0 e 100 (recebido: "${raw}").`);
    return null;
  }
  return n;
}

async function main() {
  const { values } = parseArgs({
    options: {
      asin: { type: "string" },
      title: { type: "string" },
      rationale: { type: "string" },
      marketplace: { type: "string", default: "BR" },
      category: { type: "string" },
      slug: { type: "string" },
      searchPotential: { type: "string" },
      purchaseIntent: { type: "string" },
      ticketSize: { type: "string" },
      commissionEstimate: { type: "string" },
      longTailOpportunity: { type: "string" },
      seoCompetitiveness: { type: "string" },
      valuePropositionFit: { type: "string" },
      clickProbability: { type: "string" },
    },
  });

  if (!values.asin || !values.title || !values.rationale) {
    console.error(
      'Uso: npm run candidate:add -- --asin <ASIN> --title "<nome de trabalho>" --rationale "<justificativa>" [--marketplace BR] [--category <slug>] [--slug <slug>]',
    );
    process.exitCode = 1;
    return;
  }

  const marketplace = values.marketplace ?? "BR";
  if (!isMarketplaceCode(marketplace)) {
    console.error(`Marketplace desconhecido: "${marketplace}".`);
    process.exitCode = 1;
    return;
  }

  if (!isValidAsin(values.asin)) {
    console.error(`ASIN inválido: "${values.asin}".`);
    process.exitCode = 1;
    return;
  }

  const scores: Record<string, number | undefined> = {};
  let scoreError = false;
  for (const field of SCORE_FIELDS) {
    const parsed = parseScore(values[field], field);
    if (parsed === null) scoreError = true;
    else scores[field] = parsed;
  }
  if (scoreError) {
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.productCandidate.findUnique({
    where: { asin_marketplace: { asin: values.asin, marketplace } },
  });
  if (existing) {
    console.error(`Já existe um candidato para este ASIN/marketplace (id=${existing.id}, status=${existing.status}).`);
    process.exitCode = 1;
    return;
  }

  const candidate = await prisma.productCandidate.create({
    data: {
      asin: values.asin,
      marketplace,
      workingTitle: values.title,
      rationale: values.rationale,
      categoryHint: values.category ?? null,
      slugHint: values.slug ?? null,
      ...scores,
    },
  });

  console.log("\nCandidato registrado (status=CANDIDATE, nunca público):");
  console.log(`  id:    ${candidate.id}`);
  console.log(`  asin:  ${candidate.asin}`);
  console.log(`  título de trabalho: ${candidate.workingTitle}`);
  console.log("\nPróximo passo, quando revisado e verificado:");
  console.log(
    `  npm run candidate:promote -- --asin ${candidate.asin} --marketplace ${candidate.marketplace} --title "..." --category <slug> --description "..." --confirm`,
  );
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
