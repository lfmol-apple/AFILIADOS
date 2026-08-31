import { NextResponse } from "next/server";
import { isMarketplaceCode } from "@/lib/config/marketplaces";
import { handleGoAmazonRequest } from "@/lib/services/go-amazon-handler";
import type { RouteParams } from "@/lib/next-route-types";

/**
 * Handles both:
 *  - /go/amazon/[asin]                 (BR, preserved exactly — existing
 *                                        links and SEO never break)
 *  - /go/amazon/[marketplace]/[asin]   (prepared for future marketplaces —
 *                                        project brief Sprint 3 Part 4)
 *
 * A single catch-all route, not two sibling dynamic routes, because
 * Next.js requires every dynamic segment at the same path depth to share
 * one parameter name — `[asin]` and `[marketplace]` can't coexist as
 * siblings under /go/amazon/. Parsing the segment count here keeps both
 * URL shapes working without that conflict.
 */
export async function GET(
  request: Request,
  context: RouteParams<{ segments: string[] }>,
) {
  const { segments } = await context.params;

  let marketplace: string;
  let asin: string;

  if (segments.length === 1) {
    marketplace = "BR";
    [asin] = segments;
  } else if (segments.length === 2) {
    [marketplace, asin] = segments;
  } else {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!isMarketplaceCode(marketplace)) {
    return NextResponse.json(
      { error: `Unknown marketplace: ${marketplace}` },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const result = await handleGoAmazonRequest(
    marketplace,
    asin,
    url.searchParams,
  );

  if (result.status === "error") {
    return NextResponse.json(
      { error: result.errorMessage },
      { status: result.errorStatus },
    );
  }
  return NextResponse.redirect(result.destination, { status: 302 });
}
