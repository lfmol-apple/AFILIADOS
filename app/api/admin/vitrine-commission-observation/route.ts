import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { CommissionObservationError, recordObservedCommission } from "@/lib/services/vitrine-commission-observation";

const bodySchema = z.object({
  id: z.string().min(1), // merchantListingId
  ratePercent: z.number().min(0.01).max(100),
  price: z.number().positive(),
  isPromotionalExtra: z.boolean().optional(),
});

/**
 * Saves one real commission reading the owner read by hand off Mercado
 * Livre's own affiliate panel, for an offer already known to the Vitrine
 * (see lib/services/vitrine-commission-priority.ts for the queue this
 * answers). Mirrors app/api/admin/vitrine-links/route.ts's auth/parse
 * shape. `ratePercent` is accepted as a human percentage (e.g. 8 for 8%)
 * and converted to the 0..1 rate the rest of the system stores.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  try {
    await recordObservedCommission({
      merchantListingId: parsed.data.id,
      rate: parsed.data.ratePercent / 100,
      price: parsed.data.price,
      isPromotionalExtra: parsed.data.isPromotionalExtra,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommissionObservationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
