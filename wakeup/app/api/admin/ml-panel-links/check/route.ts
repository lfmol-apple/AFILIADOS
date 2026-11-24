import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { ML_PANEL_PICKS, type PanelPick } from "@/lib/config/ml-panel-picks";
import { checkPanelLink } from "@/lib/services/ml-panel-check";
import { loadWhatsAppMlCandidates, WHATSAPP_CANDIDATE_ID_PREFIX } from "@/lib/queries/whatsapp-ml-candidates";

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
  let pick: Pick<PanelPick, "title" | "productUrl"> | undefined = ML_PANEL_PICKS.find(
    (p) => p.id === parsed.data.id,
  );
  if (!pick && parsed.data.id.startsWith(WHATSAPP_CANDIDATE_ID_PREFIX)) {
    const catalogId = parsed.data.id.slice(WHATSAPP_CANDIDATE_ID_PREFIX.length);
    const candidates = await loadWhatsAppMlCandidates(500);
    const candidate = candidates.find((c) => c.catalogId === catalogId);
    if (candidate) pick = { title: candidate.title, productUrl: candidate.productUrl };
  }
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
