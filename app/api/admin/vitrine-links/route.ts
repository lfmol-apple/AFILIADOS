import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { AffiliateLinkValidationError } from "@/lib/services/affiliate-link-registry";
import {
  VitrineRegisterError,
  registerVitrineLink,
} from "@/lib/services/vitrine-link-register";
import { checkVitrineLink } from "@/lib/services/ml-panel-check";

const bodySchema = z.object({
  id: z.string().min(1), // merchantListingId
  affiliateUrl: z.string().url().max(2000),
  force: z.boolean().optional(),
});

/**
 * Saves the "vitrinedinamica" link for one Vitrine Inteligente selection —
 * mirrors app/api/admin/ml-panel-links/route.ts.
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
    affiliateUrl: parsed.data.affiliateUrl,
  });
  if (
    check.status === "duplicate" ||
    check.status === "invalid" ||
    (check.status === "mismatch" && !parsed.data.force)
  ) {
    return NextResponse.json({ error: check.message, check }, { status: 409 });
  }

  try {
    const result = await registerVitrineLink({
      merchantListingId: parsed.data.id,
      affiliateUrl: parsed.data.affiliateUrl,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (
      err instanceof VitrineRegisterError ||
      err instanceof AffiliateLinkValidationError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
