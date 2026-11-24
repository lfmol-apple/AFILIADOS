import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import {
  saveManualAffiliateLink,
  AffiliateLinkValidationError,
} from "@/lib/services/affiliate-link-registry";
import { logger } from "@/lib/observability/logger";

const bodySchema = z.object({
  merchantListingId: z.string().min(1),
  affiliateUrl: z.string().url().max(2000),
});

/**
 * The one write action behind the "Mercado Livre — links pendentes" admin
 * queue: a human pastes the link they generated in ML's own official tool
 * (tagged "precocaindo"), this validates and persists it. Always
 * source=MANUAL_ADMIN, always attributionTag="precocaindo" — see
 * lib/services/affiliate-link-registry.ts.
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

  const listing = await prisma.merchantListing.findUnique({
    where: { id: parsed.data.merchantListingId },
    include: { merchant: true },
  });
  if (!listing || listing.merchant.code !== "MERCADO_LIVRE") {
    return NextResponse.json(
      { error: "MerchantListing Mercado Livre não encontrado." },
      { status: 404 },
    );
  }

  try {
    const saved = await saveManualAffiliateLink({
      merchantListingId: listing.id,
      merchantId: listing.merchantId,
      merchantCode: listing.merchant.code,
      publicUrl: listing.productUrl,
      affiliateUrl: parsed.data.affiliateUrl,
    });
    logger.info("admin.ml_affiliate_link_saved", {
      merchantListingId: listing.id,
    });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    if (err instanceof AffiliateLinkValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
