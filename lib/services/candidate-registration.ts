import { prisma } from "@/lib/db";
import { isValidAsin } from "@/lib/amazon/policy-guard";
import { isMarketplaceCode } from "@/lib/config/marketplaces";
import type { ProductCandidate } from "@prisma/client";

/**
 * The one shared path for registering a ProductCandidate — used by both
 * scripts/candidate-add.ts (CLI) and the /admin candidate form (Amazon's
 * equivalent of the ML affiliate queue, 2026-09-14). Extracted so the two
 * entry points can never validate an ASIN/marketplace/duplicate differently.
 * Never touches Product — see docs/COHORT.md's promotion step for that.
 */
export interface CandidateRegistrationInput {
  asin: string;
  marketplace: string;
  workingTitle: string;
  rationale: string;
  categoryHint?: string | null;
  slugHint?: string | null;
  searchPotential?: number | null;
  purchaseIntent?: number | null;
  ticketSize?: number | null;
  commissionEstimate?: number | null;
  longTailOpportunity?: number | null;
  seoCompetitiveness?: number | null;
  valuePropositionFit?: number | null;
  clickProbability?: number | null;
}

export type CandidateRegistrationError =
  | { code: "MISSING_FIELD"; message: string }
  | { code: "INVALID_MARKETPLACE"; message: string }
  | { code: "INVALID_ASIN"; message: string }
  | { code: "ALREADY_EXISTS"; message: string; existingCandidateId: string; existingStatus: string };

export type CandidateRegistrationResult =
  | { ok: true; candidate: ProductCandidate }
  | { ok: false; error: CandidateRegistrationError };

export async function registerProductCandidate(
  input: CandidateRegistrationInput,
): Promise<CandidateRegistrationResult> {
  if (!input.asin?.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", message: "asin é obrigatório." } };
  }
  if (!input.workingTitle?.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", message: "workingTitle é obrigatório." } };
  }
  if (!input.rationale?.trim()) {
    return { ok: false, error: { code: "MISSING_FIELD", message: "rationale é obrigatório." } };
  }
  if (!isMarketplaceCode(input.marketplace)) {
    return {
      ok: false,
      error: { code: "INVALID_MARKETPLACE", message: `Marketplace desconhecido: "${input.marketplace}".` },
    };
  }
  if (!isValidAsin(input.asin)) {
    return { ok: false, error: { code: "INVALID_ASIN", message: `ASIN inválido: "${input.asin}".` } };
  }

  const existing = await prisma.productCandidate.findUnique({
    where: { asin_marketplace: { asin: input.asin, marketplace: input.marketplace } },
  });
  if (existing) {
    return {
      ok: false,
      error: {
        code: "ALREADY_EXISTS",
        message: `Já existe um candidato para este ASIN/marketplace (status=${existing.status}).`,
        existingCandidateId: existing.id,
        existingStatus: existing.status,
      },
    };
  }

  const candidate = await prisma.productCandidate.create({
    data: {
      asin: input.asin,
      marketplace: input.marketplace,
      workingTitle: input.workingTitle,
      rationale: input.rationale,
      categoryHint: input.categoryHint ?? null,
      slugHint: input.slugHint ?? null,
      searchPotential: input.searchPotential ?? undefined,
      purchaseIntent: input.purchaseIntent ?? undefined,
      ticketSize: input.ticketSize ?? undefined,
      commissionEstimate: input.commissionEstimate ?? undefined,
      longTailOpportunity: input.longTailOpportunity ?? undefined,
      seoCompetitiveness: input.seoCompetitiveness ?? undefined,
      valuePropositionFit: input.valuePropositionFit ?? undefined,
      clickProbability: input.clickProbability ?? undefined,
    },
  });

  return { ok: true, candidate };
}
