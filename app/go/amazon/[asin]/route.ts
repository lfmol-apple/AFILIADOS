import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveAffiliateRedirect,
  AffiliateRedirectError,
} from "@/lib/services/affiliate-redirect";

/**
 * The single sanctioned exit point toward Amazon (project brief section 66).
 * Only reachable via a real user click on a Link (never triggered
 * automatically), takes no destination from the query string, and always
 * records the click before redirecting.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/go/amazon/[asin]">,
) {
  const { asin } = await context.params;
  const url = new URL(request.url);

  const product = await prisma.product.findUnique({
    where: { provider_asin: { provider: "AMAZON", asin } },
    include: { offers: { orderBy: { observedAt: "desc" }, take: 1 } },
  });

  let destination: string;
  try {
    destination = resolveAffiliateRedirect({
      asin,
      productActive: product?.active ?? false,
      affiliateUrl: product?.offers[0]?.affiliateUrl ?? null,
    });
  } catch (err) {
    if (err instanceof AffiliateRedirectError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (product) {
    await prisma.affiliateClick.create({
      data: {
        productId: product.id,
        provider: "AMAZON",
        pageType: url.searchParams.get("pageType") ?? "unknown",
        pageSlug: url.searchParams.get("pageSlug") ?? product.slug,
        source: url.searchParams.get("source") ?? undefined,
        campaign: url.searchParams.get("campaign") ?? undefined,
      },
    });
  }

  return NextResponse.redirect(destination, { status: 302 });
}
