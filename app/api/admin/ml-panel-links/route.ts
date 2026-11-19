import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { ML_PANEL_PICKS, type PanelPick } from "@/lib/config/ml-panel-picks";
import { AffiliateLinkValidationError } from "@/lib/services/affiliate-link-registry";
import {
  PanelRegisterError,
  registerPanelPick,
} from "@/lib/services/ml-panel-register";
import { checkPanelLink } from "@/lib/services/ml-panel-check";
import { loadWhatsAppMlCandidates, WHATSAPP_CANDIDATE_ID_PREFIX } from "@/lib/queries/whatsapp-ml-candidates";

const bodySchema = z.object({
  id: z.string().min(1),
  affiliateUrl: z.string().url().max(2000),
  /** Save even though the live check says the link leads to another product. */
  force: z.boolean().optional(),
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
  let pick: PanelPick | undefined = ML_PANEL_PICKS.find((p) => p.id === parsed.data.id);
  // A row from lib/queries/whatsapp-ml-candidates.ts (shown in /admin/
  // fila-links' "achados em grupos" section) isn't in ML_PANEL_PICKS —
  // it's DB-backed, not a source code paste. Same save path either way:
  // registerPanelPick only needs title/productUrl/rate/price, and a group
  // find genuinely has no panel commission/sold/rating to report (never
  // fabricated — see that file's own doc comment).
  if (!pick && parsed.data.id.startsWith(WHATSAPP_CANDIDATE_ID_PREFIX)) {
    const catalogId = parsed.data.id.slice(WHATSAPP_CANDIDATE_ID_PREFIX.length);
    const candidates = await loadWhatsAppMlCandidates(500);
    const candidate = candidates.find((c) => c.catalogId === catalogId);
    if (candidate) {
      pick = {
        id: parsed.data.id,
        title: candidate.title,
        rate: 0,
        extras: false,
        price: candidate.price ?? 0,
        sold: 0,
        rating: null,
        group: "whatsapp",
        productUrl: candidate.productUrl,
        capturedAt: candidate.capturedAt,
      };
    }
  }
  if (!pick)
    return NextResponse.json(
      { error: "Produto da lista não encontrado." },
      { status: 404 },
    );

  // Same live check the screen shows, enforced here too so a wrong link can
  // never be saved by accident (a duplicate is never forced; a "different
  // product" verdict needs the owner's explicit override).
  const check = await checkPanelLink({
    panelTitle: pick.title,
    productUrl: pick.productUrl,
    affiliateUrl: parsed.data.affiliateUrl,
  });
  if (
    check.status === "duplicate" ||
    check.status === "invalid" ||
    (check.status === "mismatch" && !parsed.data.force)
  ) {
    return NextResponse.json({ error: check.message, check }, { status: 409 });
  }

  try {
    const result = await registerPanelPick({
      panelId: pick.id,
      panelTitle: pick.title,
      affiliateUrl: parsed.data.affiliateUrl,
      rate: pick.rate,
      price: pick.price,
      sold: pick.sold,
      rating: pick.rating,
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
