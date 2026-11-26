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

const bodySchema = z.object({
  id: z.string().min(1),
  affiliateUrl: z.string().url().max(2000),
});

/** Save endpoint for the batch-paste flow (PanelBatch's own contract:
 * POST {id, affiliateUrl} -> {ok, title}) — reuses updateBlackFridayProduct,
 * so the host allowlist and creative-group checks apply exactly the same
 * as the single-link flow. Never marks VALIDATED on its own — the owner
 * still confirms each one in the panel (or via "Testar destino") before
 * it can reach the XML. */
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
