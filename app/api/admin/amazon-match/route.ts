import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { recordAmazonMatchDecision } from "@/lib/services/amazon-match";
import { logger } from "@/lib/observability/logger";

const bodySchema = z.discriminatedUnion("decision", [
  z.object({
    merchantListingId: z.string().min(1),
    decision: z.literal("NO_MATCH"),
  }),
  z.object({
    merchantListingId: z.string().min(1),
    decision: z.literal("MATCHED"),
    asin: z.string().min(1),
    /// The real Amazon title, never the original listing's own title
    /// (found live, 2026-11-09: a rushed review pass reused the ML/Shopee
    /// listing's title + the same boilerplate description across several
    /// matches — exactly the duplicate/thin-content shape that hurts
    /// indexing). Minimums are a mechanical speed bump, not a quality
    /// guarantee, but they make "forgot to look" impossible.
    title: z.string().min(5),
    brand: z.string().optional(),
    categorySlug: z.string().min(1),
    description: z.string().min(25),
  }),
]);

/**
 * The write action behind /admin's Amazon-matching queue — one human
 * decision (MATCHED or NO_MATCH) per ML/Shopee MerchantListing, never the
 * same one twice (see lib/services/amazon-match.ts).
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

  const result = await recordAmazonMatchDecision(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  logger.info("admin.amazon_match_decided", {
    merchantListingId: parsed.data.merchantListingId,
    decision: parsed.data.decision,
  });
  return NextResponse.json({ ok: true });
}
