import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { AffiliateLinkValidationError } from "@/lib/services/affiliate-link-registry";
import {
  PanelRegisterError,
  registerPanelPick,
} from "@/lib/services/ml-panel-register";

const bodySchema = z.object({
  id: z.string().min(1),
  affiliateUrl: z.string().url().max(2000),
});

/** Saves the affiliate link the owner generated for one panel-list product. */
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

  try {
    const result = await registerPanelPick({
      panelId: pick.id,
      panelTitle: pick.title,
      affiliateUrl: parsed.data.affiliateUrl,
      rate: pick.rate,
      price: pick.price,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (
      err instanceof PanelRegisterError ||
      err instanceof AffiliateLinkValidationError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
