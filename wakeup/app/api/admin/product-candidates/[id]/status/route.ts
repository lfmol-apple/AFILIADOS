import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { logger } from "@/lib/observability/logger";

const bodySchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

/**
 * Human review decision on a ProductCandidate — never touches Product.
 * APPROVED just means "worth verifying and promoting next" (see
 * docs/COHORT.md); REJECTED is a valid, final outcome on its own, not a
 * failure state that needs cleaning up.
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
  if (candidate.status === "PROMOTED") {
    return NextResponse.json(
      { error: "Candidato já promovido — status não pode mais mudar." },
      { status: 400 },
    );
  }

  await prisma.productCandidate.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  logger.info("admin.product_candidate_status_changed", {
    candidateId: id,
    status: parsed.data.status,
  });
  return NextResponse.json({ ok: true });
}
