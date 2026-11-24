import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { checkPanelLink } from "@/lib/services/ml-panel-check";

const bodySchema = z.object({
  merchantListingId: z.string().min(1),
  affiliateUrl: z.string().max(2000),
});

/**
 * Same live "does this link lead to this product?" check the fila-links
 * flow already uses (lib/services/ml-panel-check.ts), reused here for
 * /admin/produtos-novos-ml instead of a panel-pasted title: the real
 * title/productUrl already come from our own enriched MerchantListing
 * row. Read-only — saves nothing.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (
    !(await isAdminRequestAuthorized(
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    ))
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const listing = await prisma.merchantListing.findUnique({
    where: { id: parsed.data.merchantListingId },
    include: { canonicalProduct: { select: { title: true } } },
  });
  if (!listing) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 },
    );
  }
  const title = listing.canonicalProduct?.title;
  if (!title) {
    return NextResponse.json(
      { error: "Este produto não tem título cadastrado." },
      { status: 400 },
    );
  }

  const check = await checkPanelLink({
    panelTitle: title,
    productUrl: listing.productUrl,
    affiliateUrl: parsed.data.affiliateUrl.trim(),
  });
  return NextResponse.json({ ok: true, check });
}
