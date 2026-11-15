import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import {
  TrendingRegisterError,
  registerTrendingPick,
} from "@/lib/services/ml-trending-register";
import { logger } from "@/lib/observability/logger";

const MELI_HOSTS = /^(www\.)?(mercadolivre\.com(\.br)?|meli\.la)$/i;

const bodySchema = z.object({
  keyword: z.string().min(1),
  affiliateUrl: z.string().url().max(2000),
});

/**
 * Registers a brand-new Mercado Livre product from scratch given just a
 * pasted affiliate link and a fallback title (the real title/image come
 * from Mercado Livre itself via registerTrendingPick's enrichment — the
 * "keyword" is only used if that enrichment doesn't resolve a
 * CanonicalProduct). Shared by both /admin/produtos-em-alta (single-row)
 * and its /lote batch flow — neither has a pre-existing MerchantListing
 * row to attach a link to, unlike /admin/produtos-novos-ml's
 * /api/admin/ml-affiliate-links.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  const { keyword, affiliateUrl } = parsed.data;

  let url: URL;
  try {
    url = new URL(affiliateUrl);
  } catch {
    return NextResponse.json({ error: "Isso não parece um link." }, { status: 400 });
  }
  if (!MELI_HOSTS.test(url.hostname)) {
    return NextResponse.json(
      {
        error:
          "Esse link não é do Mercado Livre. Cole o link gerado no Linkbuilder (meli.la/… ou mercadolivre.com/sec/…).",
      },
      { status: 400 },
    );
  }

  const taken = await prisma.affiliateLinkRegistry.findFirst({
    where: { affiliateUrl, status: "ACTIVE" },
    select: { merchantListing: { select: { canonicalProduct: { select: { title: true } } } } },
  });
  if (taken) {
    const title = taken.merchantListing?.canonicalProduct?.title ?? "outro produto";
    return NextResponse.json(
      { error: `Esse link já está salvo em outro produto: ${title}.` },
      { status: 409 },
    );
  }

  try {
    const result = await registerTrendingPick({ keyword, affiliateUrl });
    logger.info("admin.trending_term_registered", { keyword, merchantListingId: result.merchantListingId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TrendingRegisterError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logger.error("admin.trending_term_register_failed", { keyword, message: String(err) });
    return NextResponse.json({ error: "Falha ao registrar o produto." }, { status: 500 });
  }
}
