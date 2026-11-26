import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import {
  BlackFridayUpdateError,
  updateBlackFridayProduct,
} from "@/lib/services/black-friday-2026";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO"): identical to
 * app/api/admin/black-friday-2026/batch-save/route.ts —
 * updateBlackFridayProduct operates by id, so no logic changed here.
 */
const bodySchema = z.object({
  id: z.string().min(1),
  affiliateUrl: z.string().url().max(2000),
});

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

  try {
    const product = await updateBlackFridayProduct(parsed.data.id, {
      affiliateUrl: parsed.data.affiliateUrl,
      status: "LINK_PASTED",
    });
    return NextResponse.json({ ok: true, title: product.name });
  } catch (err) {
    if (err instanceof BlackFridayUpdateError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
