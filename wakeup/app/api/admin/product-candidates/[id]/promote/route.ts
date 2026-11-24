import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { promoteCandidateToProduct } from "@/lib/services/candidate-promotion";
import { logger } from "@/lib/observability/logger";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categorySlug: z.string().min(1),
  brand: z.string().optional(),
  slug: z.string().optional(),
});

/**
 * The deliberate ProductCandidate -> Product step, from the admin UI now
 * instead of only scripts/candidate-promote.ts's --confirm flag — same
 * underlying promoteCandidateToProduct(), same bar (docs/COHORT.md).
 * Creates the Product as active=false (draft); going live is still a
 * separate, explicit step (scripts/product-activate.ts), unchanged.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isAdminRequestAuthorized(token))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const candidate = await prisma.productCandidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidato não encontrado." }, { status: 404 });
  }

  const result = await promoteCandidateToProduct({
    asin: candidate.asin,
    marketplace: candidate.marketplace,
    title: parsed.data.title,
    description: parsed.data.description,
    categorySlug: parsed.data.categorySlug,
    brand: parsed.data.brand ?? null,
    slug: parsed.data.slug ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  logger.info("admin.product_candidate_promoted", {
    candidateId: id,
    productId: result.product.id,
  });
  return NextResponse.json({ ok: true, product: result.product });
}
