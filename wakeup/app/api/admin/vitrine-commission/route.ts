import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  directAmountBrl: z.number().min(0),
  indirectAmountBrl: z.number().min(0),
  status: z.enum(["PENDING", "APPROVED"]),
  note: z.string().max(500).optional(),
});

/** Henrique's manual read-off of Mercado Livre's own affiliate panel for
 * the vitrinedinamica tag — no reconciliation API exists (see
 * vitrine-financials.ts's own doc comment for why). */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const periodStart = new Date(parsed.data.periodStart);
  const periodEnd = new Date(parsed.data.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  const row = await prisma.vitrineCommissionReport.create({
    data: {
      periodStart,
      periodEnd,
      directAmountBrl: parsed.data.directAmountBrl,
      indirectAmountBrl: parsed.data.indirectAmountBrl,
      status: parsed.data.status,
      note: parsed.data.note,
    },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
