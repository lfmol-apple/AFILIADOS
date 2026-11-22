import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { previewSelectionForVitrine, claimSelectionForVitrine, VitrineTransitionError } from "@/lib/services/vitrine-manager";

/**
 * Owner's authorization, 2026-11-22 ("Visualização dos produtos
 * selecionados" + "ativação administrativa preparada, sem ativar nada
 * em produção"). The explicit, separate step that actually writes a
 * real selection for a vitrine — never bundled into /activate (same
 * "separar a ativação da campanha da seleção real" pattern already
 * established for every other paid/production action in this project).
 *
 * Re-runs previewSelectionForVitrine() FRESH at claim time rather than
 * trusting whatever the admin page last rendered — the real candidate
 * pool and what other vitrines hold can both have changed since that
 * render; claimSelectionForVitrine()'s own transactional, partial-
 * unique-index-backed write is still the final real safety net
 * regardless, but this avoids claiming on stale information by
 * construction, not just by luck.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;

  const vitrine = await prisma.vitrine.findUnique({ where: { id } });
  if (!vitrine) return NextResponse.json({ error: "Vitrine não encontrada." }, { status: 404 });

  const { eligible, blockedByOtherVitrine } = await previewSelectionForVitrine(id, vitrine.maxProducts);
  try {
    const { claimed, lostRace } = await claimSelectionForVitrine(id, eligible);
    return NextResponse.json({
      claimed: claimed.length,
      lostRace: lostRace.length,
      blockedByOtherVitrine: blockedByOtherVitrine.length,
    });
  } catch (err) {
    if (err instanceof VitrineTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
