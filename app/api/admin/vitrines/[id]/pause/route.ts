import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { pauseVitrine, VitrineTransitionError } from "@/lib/services/vitrine-manager";

/** Owner's authorization, 2026-11-22 ("Exclusividade e ciclo de vida —
 * reavalie a regra que libera automaticamente produtos quando uma
 * vitrine é pausada"). Pausing releases NOTHING — see
 * vitrine-manager.ts's pauseVitrine() doc comment for the real reason
 * this was redesigned. `releasedCount` is always 0 here; kept in the
 * response only for symmetry with /end, so the admin UI can show the
 * same message shape either way. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const { vitrine, releasedCount } = await pauseVitrine(id);
    return NextResponse.json({ vitrine, releasedCount });
  } catch (err) {
    if (err instanceof VitrineTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
