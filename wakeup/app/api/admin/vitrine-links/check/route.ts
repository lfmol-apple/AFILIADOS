import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { checkVitrineLink } from "@/lib/services/ml-panel-check";

const bodySchema = z.object({
  id: z.string().min(1), // merchantListingId
  affiliateUrl: z.string().max(2000),
});

/**
 * Live check while the owner pastes, for the Vitrine Inteligente queue —
 * mirrors app/api/admin/ml-panel-links/check/route.ts, but "id" is a
 * MerchantListing id (the listing already exists) rather than a hardcoded
 * panel-pick id. Read-only.
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
    where: { id: parsed.data.id },
    select: { productUrl: true, canonicalProduct: { select: { title: true } } },
  });
  if (!listing) {
    return NextResponse.json(
      { error: "Produto da Vitrine não encontrado." },
      { status: 404 },
    );
  }

  const check = await checkVitrineLink({
    panelTitle: listing.canonicalProduct?.title ?? "(produto sem título)",
    productUrl: listing.productUrl,
    affiliateUrl: parsed.data.affiliateUrl.trim(),
  });
  return NextResponse.json({ ok: true, check });
}
