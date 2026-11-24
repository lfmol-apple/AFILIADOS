import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { activateVitrine, VitrineTransitionError } from "@/lib/services/vitrine-manager";

/** Owner's authorization, 2026-11-22 ("Pausa, reativação e
 * encerramento"). Covers BOTH the first activation (DRAFT->ACTIVE) and
 * reactivation (PAUSED->ACTIVE) — see vitrine-manager.ts's own doc
 * comment for why a single verb covers both. Never claims/selects any
 * product by itself — that's a separate, explicit step
 * (/claim), same pattern as every other paid/production action in this
 * project. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const vitrine = await activateVitrine(id);
    return NextResponse.json({ vitrine });
  } catch (err) {
    if (err instanceof VitrineTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
