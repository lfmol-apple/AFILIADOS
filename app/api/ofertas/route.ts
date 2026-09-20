import { NextResponse } from "next/server";
import { z } from "zod";
import { listOffers } from "@/lib/queries/offers-feed";
import { isOfferCategorySlug } from "@/lib/offers/categories";
import {
  SORT_OPTIONS,
  STORE_OPTIONS,
  type OfferSort,
  type OfferStore,
} from "@/lib/offers/view";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
  categoria: z
    .string()
    .refine(isOfferCategorySlug, "unknown category")
    .optional(),
  ordem: z.enum(SORT_OPTIONS.map((o) => o.slug) as [string, ...string[]]).optional(),
  loja: z.enum(STORE_OPTIONS.map((o) => o.slug) as [string, ...string[]]).optional(),
});

/** Next page of the /ofertas feed for infinite scroll. Reads the same cached
 * ranked pool as the page itself — no per-request merchant queries. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    categoria: url.searchParams.get("categoria") ?? undefined,
    ordem: url.searchParams.get("ordem") ?? undefined,
    loja: url.searchParams.get("loja") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const result = await listOffers({
    category: parsed.data.categoria,
    sort: parsed.data.ordem as OfferSort | undefined,
    store: parsed.data.loja as OfferStore | undefined,
    page: parsed.data.page,
  });
  return NextResponse.json(result);
}
