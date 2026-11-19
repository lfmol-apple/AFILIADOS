import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  spentOn: z.string().min(1),
  amountBrl: z.number().positive(),
  note: z.string().max(500).optional(),
});

/** Henrique's manual record of what he actually spent on the Vitrine's
 * Meta campaign — no automated source exists (see vitrine-financials.ts). */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const spentOn = new Date(parsed.data.spentOn);
  if (Number.isNaN(spentOn.getTime())) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  const row = await prisma.vitrineAdSpend.create({
    data: { spentOn, amountBrl: parsed.data.amountBrl, note: parsed.data.note },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
