import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { checkBlackFridayLink } from "@/lib/services/black-friday-2026";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO"): identical to
 * app/api/admin/black-friday-2026/[id]/check/route.ts —
 * checkBlackFridayLink is campaign-agnostic (just compares a title/id,
 * never queries by campaign), so no logic changed here beyond the route
 * path.
 */
const bodySchema = z.object({
  affiliateUrl: z.string().url().max(2000),
  mlUrlOriginal: z.string().url().max(2000).nullable().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  if (
    !(await isAdminRequestAuthorized(
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    ))
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const product = await prisma.blackFridayProduct.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const check = await checkBlackFridayLink({
    productName: product.name,
    mlUrlOriginal: parsed.data.mlUrlOriginal ?? product.mlUrlOriginal,
    affiliateUrl: parsed.data.affiliateUrl,
  });
  return NextResponse.json({ ok: true, check });
}
