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
 * One-click registration for the "Termos em alta" page: the owner pastes
 * the affiliate link they just generated in Linkbuilder for a trending
 * keyword, and this creates the product from scratch (title/image come
 * from Mercado Livre itself via registerTrendingPick). No separate
 * "check" step shown first — pasting the link IS the save, by design
 * (owner's brief, 2026-11-15: "só copiar uma vez e colar outra vez").
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
