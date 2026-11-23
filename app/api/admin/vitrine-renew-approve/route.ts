import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { runVitrineRenewJob } from "@/jobs/vitrine-renew";

const bodySchema = z.object({ confirm: z.literal(true) });

/**
 * Owner's authorization, 2026-11-22 ("Operação Cérebro Comercial", item
 * 2: "implemente uma prévia de alterações com aprovação explícita...
 * nenhuma aprovação simulada pode alterar produção"). This calls the
 * REAL, unmodified runVitrineRenewJob() — the exact same function the
 * manual script invocation runs — never a parallel write path. Nothing
 * here is simulated: whatever DATABASE_URL this process is configured
 * with is where it writes, same as any other job. `confirm: true` is
 * required in the body (not just a UI click) so this can never be
 * triggered by an accidental GET, a CSRF-able link, or a stray request.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmação explícita obrigatória." }, { status: 400 });
  }

  try {
    const counters = await runVitrineRenewJob();
    return NextResponse.json({ ok: true, counters });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao aplicar a renovação." }, { status: 500 });
  }
}
