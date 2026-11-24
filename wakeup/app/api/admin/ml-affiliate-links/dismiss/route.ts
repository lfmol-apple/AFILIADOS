import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { logger } from "@/lib/observability/logger";

const bodySchema = z.object({ merchantListingId: z.string().min(1) });

/**
 * "Descartar" — for a queue item a human has determined isn't worth
 * pursuing (e.g. the real offer no longer resolves on Mercado Livre,
 * confirmed via Linkbuilder itself failing to match it — a real,
 * observed fact, not a guess). Sets MerchantListing.active = false
 * rather than deleting anything: reversible, keeps the historical
 * signals/scores, and every existing query (getMlAffiliateQueue,
 * getTodaysOpportunities, getPublicRadarFeed) already filters on
 * `active: true`, so this alone removes it from every surface without
 * new filtering logic anywhere.
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

  await prisma.merchantListing.update({
    where: { id: listing.id },
    data: { active: false },
  });
  logger.info("admin.ml_affiliate_listing_dismissed", { merchantListingId: listing.id });

  return NextResponse.json({ ok: true });
}
