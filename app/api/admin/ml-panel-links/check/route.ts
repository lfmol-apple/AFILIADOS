import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { checkPanelLink } from "@/lib/services/ml-panel-check";

const bodySchema = z.object({
  id: z.string().min(1),
  affiliateUrl: z.string().max(2000),
});

/**
 * Live check while the owner pastes: does the affiliate link lead to the
 * product of this row? Read-only — saves nothing.
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
  const pick = ML_PANEL_PICKS.find((p) => p.id === parsed.data.id);
  if (!pick)
    return NextResponse.json(
      { error: "Produto da lista não encontrado." },
      { status: 404 },
    );

  const check = await checkPanelLink({
    panelTitle: pick.title,
    productUrl: pick.productUrl,
    affiliateUrl: parsed.data.affiliateUrl.trim(),
  });
  return NextResponse.json({ ok: true, check });
}
