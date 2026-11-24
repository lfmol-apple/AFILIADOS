import { prisma } from "@/lib/db";
import { isMarketplaceCode } from "@/lib/config/marketplaces";
import {
  registerManualVerifiedProduct,
  type ManualProductRegistrationError,
  type RegisteredManualProduct,
} from "@/lib/services/manual-product-registration";

/**
 * The deliberate ProductCandidate -> Product promotion step (project brief
 * Sprint 7 section 5). Never automatic — a human runs scripts/candidate-
 * promote.ts with reviewed, verified fields. Reuses
 * registerManualVerifiedProduct() rather than duplicating its validation,
 * so a promoted candidate is held to exactly the same bar as a product
 * registered directly via scripts/product-add.ts.
 */
export interface PromoteCandidateInput {
  asin: string;
  marketplace: string;
  title: string;
  description: string;
  categorySlug: string;
  brand?: string | null;
  slug?: string | null;
}

export type PromoteCandidateError =
  | { code: "INVALID_MARKETPLACE"; message: string }
  | { code: "CANDIDATE_NOT_FOUND"; message: string }
  | { code: "ALREADY_PROMOTED"; message: string }
  | { code: "REJECTED"; message: string }
  | ManualProductRegistrationError;

export type PromoteCandidateResult =
  | { ok: true; product: RegisteredManualProduct; affiliateUrlPreview: string | null }
  | { ok: false; error: PromoteCandidateError };

export async function promoteCandidateToProduct(
  input: PromoteCandidateInput,
): Promise<PromoteCandidateResult> {
  if (!isMarketplaceCode(input.marketplace)) {
    return {
      ok: false,
      error: { code: "INVALID_MARKETPLACE", message: `Marketplace desconhecido: "${input.marketplace}".` },
    };
  }
  const marketplace = input.marketplace;

  const candidate = await prisma.productCandidate.findUnique({
    where: { asin_marketplace: { asin: input.asin, marketplace } },
  });
  if (!candidate) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_NOT_FOUND",
        message: `Nenhum ProductCandidate para ASIN ${input.asin} / ${marketplace}. Cadastre primeiro com "npm run candidate:add".`,
      },
    };
  }
  if (candidate.status === "PROMOTED") {
    return {
      ok: false,
      error: {
        code: "ALREADY_PROMOTED",
        message: `Este candidato já foi promovido (productId=${candidate.productId}).`,
      },
    };
  }
  if (candidate.status === "REJECTED") {
    return {
      ok: false,
      error: {
        code: "REJECTED",
        message: "Este candidato está marcado como REJECTED. Se isso for intencional, reavalie manualmente antes de promover.",
      },
    };
  }

  const registration = await registerManualVerifiedProduct({
    asin: input.asin,
    marketplace,
    title: input.title,
    description: input.description,
    categorySlug: input.categorySlug,
    brand: input.brand,
    slug: input.slug ?? candidate.slugHint,
  });
  if (!registration.ok) return { ok: false, error: registration.error };

  await prisma.productCandidate.update({
    where: { id: candidate.id },
    data: { status: "PROMOTED", productId: registration.product.id },
  });

  return { ok: true, product: registration.product, affiliateUrlPreview: registration.affiliateUrlPreview };
}
