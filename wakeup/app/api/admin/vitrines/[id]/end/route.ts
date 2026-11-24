import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { endVitrine, VitrineTransitionError } from "@/lib/services/vitrine-manager";

/** Owner's authorization, 2026-11-22. Terminal — the real, intentional
 * release point (see vitrine-manager.ts's endVitrine() doc comment):
 * every real ACTIVE selection this vitrine held is retired, freeing its
 * canonicalProductId for another vitrine. An ENDED vitrine can never be
 * reactivated. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const { vitrine, releasedCount } = await endVitrine(id);
    return NextResponse.json({ vitrine, releasedCount });
  } catch (err) {
    if (err instanceof VitrineTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
