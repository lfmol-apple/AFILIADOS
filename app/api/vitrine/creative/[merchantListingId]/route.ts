import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { buildCreativeElement } from "@/lib/services/vitrine-creative";

export const dynamic = "force-dynamic";

/**
 * Serves the Vitrine Inteligente's ad creative for one listing — PNG,
 * 1080x1080 (Meta's recommended square feed-ad size). Public (no admin
 * auth): Meta's own systems and the admin preview both need to fetch this
 * directly. Scoped tightly on purpose — only an ACTIVE Vitrine selection
 * with a real link renders anything, so this never becomes a general
 * "render any image from any data" endpoint.
 *
 * Compliance note (owner's request to validate this): deliberately NOT
 * wired into app/catalogo/mercado-livre.xml/route.ts's g:image_link. Meta's
 * own Commerce catalog image guidelines discourage promotional overlays
 * (price badges, logos, discount bubbles) on catalog images, since the
 * dynamic catalog ad template already overlays price/title itself —
 * stacking this creative's own price text on top would likely read as a
 * duplicate/promotional-overlay violation, not a safety net. The catalog
 * feed keeps the plain marketplace photo; THIS branded creative is for the
 * admin preview and for any manual (non-catalog) ad Henrique builds by
 * hand, where a single static image with its own price/branding is the
 * normal, compliant format.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ merchantListingId: string }> },
) {
  const { merchantListingId } = await context.params;

  const selection = await prisma.vitrineSelection.findUnique({
    where: { merchantListingId, status: "ACTIVE" },
    select: {
      merchantListing: {
        select: {
          vitrineLink: { select: { status: true } },
          canonicalProduct: { select: { publicSlug: true } },
        },
      },
    },
  });
  const slug = selection?.merchantListing.canonicalProduct?.publicSlug;
  if (
    !selection ||
    selection.merchantListing.vitrineLink?.status !== "ACTIVE" ||
    !slug
  ) {
    return new Response("Not found", { status: 404 });
  }

  const product = await loadPublicMerchantProduct(slug);
  if (!product || !product.imageUrl || product.currentPrice === null) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    buildCreativeElement({
      title: product.title,
      imageUrl: product.imageUrl,
      brand: product.brand,
      currentPrice: product.currentPrice,
      referencePrice: product.referencePrice,
      discountPercent: product.discountPercent,
    }),
    {
      width: 1080,
      height: 1080,
      headers: { "cache-control": "public, max-age=300" },
    },
  );
}
