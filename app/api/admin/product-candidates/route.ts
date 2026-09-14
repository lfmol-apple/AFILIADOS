import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { registerProductCandidate } from "@/lib/services/candidate-registration";
import { logger } from "@/lib/observability/logger";

const scoreField = z.number().int().min(0).max(100).optional();

const bodySchema = z.object({
  asin: z.string().min(1),
  marketplace: z.string().min(1).default("BR"),
  workingTitle: z.string().min(1),
  rationale: z.string().min(1),
  categoryHint: z.string().optional(),
  slugHint: z.string().optional(),
  searchPotential: scoreField,
  purchaseIntent: scoreField,
  ticketSize: scoreField,
  commissionEstimate: scoreField,
  longTailOpportunity: scoreField,
  seoCompetitiveness: scoreField,
  valuePropositionFit: scoreField,
  clickProbability: scoreField,
});

/**
 * Amazon's equivalent of POST /api/admin/ml-affiliate-links — the write
 * action behind the /admin "Candidatos Amazon" form. Registers a
 * ProductCandidate (docs/COHORT.md); never touches Product directly, same
 * as scripts/candidate-add.ts, which now shares this exact validation via
 * lib/services/candidate-registration.ts.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isAdminRequestAuthorized(token))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await registerProductCandidate(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  logger.info("admin.product_candidate_registered", { candidateId: result.candidate.id });
  return NextResponse.json({ ok: true, id: result.candidate.id });
}
