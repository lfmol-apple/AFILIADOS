import { NextResponse } from "next/server";
import { readStoredProductImage } from "@/lib/services/product-image-store";
import type { RouteParams } from "@/lib/next-route-types";

/**
 * Serves the real WhatsApp-link-preview thumbnail saved by
 * lib/services/product-image-store.ts — see that file's doc comment for
 * why this exists at all. The URL this app ever generates is
 * `/api/product-images/{ASIN}.jpg`; `[asin]` therefore always arrives
 * with the extension attached, stripped here rather than via a second
 * dynamic segment (Next.js can't mix a literal ".jpg" suffix into a
 * single path segment's matcher).
 */
export async function GET(
  _request: Request,
  context: RouteParams<{ asin: string }>,
) {
  const { asin: asinWithExt } = await context.params;
  const asin = asinWithExt.replace(/\.jpe?g$/i, "").toUpperCase();

  const bytes = readStoredProductImage(asin);
  if (!bytes) {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/jpeg",
      // Immutable: the filename IS the cache key (one file per ASIN), and
      // a re-harvest overwrites rather than versions — a short max-age is
      // enough to avoid ever serving last month's photo indefinitely if a
      // real update does happen, while still saving most repeat requests.
      "cache-control": "public, max-age=86400",
    },
  });
}
