import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { checkPanelLink } from "@/lib/services/ml-panel-check";

const bodySchema = z.object({
  title: z.string().min(1),
  productUrl: z.string().url(),
  affiliateUrl: z.string().max(2000),
});

/**
 * Same live "does this link lead to this product?" check as
 * /api/admin/new-ml-products/check, but for /admin/produtos-em-alta's
 * candidates: those don't have a MerchantListing row yet (they come from
 * lib/queries/ml-highlight-candidates.ts, read-only), so title/productUrl
 * are passed straight from the page instead of looked up by id.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (
    !(await isAdminRequestAuthorized(
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    ))
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const check = await checkPanelLink({
    panelTitle: parsed.data.title,
    productUrl: parsed.data.productUrl,
    affiliateUrl: parsed.data.affiliateUrl.trim(),
  });
  return NextResponse.json({ ok: true, check });
}
