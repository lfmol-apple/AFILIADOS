import { NextResponse } from "next/server";
import { z } from "zod";
import { listOffers } from "@/lib/queries/offers-feed";
import { isOfferCategorySlug } from "@/lib/offers/categories";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
  categoria: z
    .string()
    .refine(isOfferCategorySlug, "unknown category")
    .optional(),
});

/** Next page of the /ofertas feed for infinite scroll. Reads the same cached
 * ranked pool as the page itself — no per-request merchant queries. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    categoria: url.searchParams.get("categoria") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const result = await listOffers({
    category: parsed.data.categoria,
    page: parsed.data.page,
  });
  return NextResponse.json(result);
}
