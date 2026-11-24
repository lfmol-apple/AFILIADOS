import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { runVitrineRenewJob } from "@/jobs/vitrine-renew";
import { computeVitrineRenewalDecision } from "@/lib/services/vitrine-renewal-decision";

const bodySchema = z.object({ confirm: z.literal(true), previewToken: z.string().min(1) });

/**
 * Owner's authorization, 2026-11-22/23 ("Operação Cérebro Comercial"):
 * "nenhuma aprovação simulada pode alterar produção"; item 3: "se os
 * dados mudaram entre prévia e aprovação, interrompa e exija nova
 * revisão." This calls the REAL, unmodified runVitrineRenewJob() —
 * never a parallel write path, never simulated. Whatever DATABASE_URL
 * this process is configured with is where it writes.
 *
 * `previewToken` must match a FRESH recomputation of the exact same
 * decision (same AI snapshot id + same current ACTIVE set) taken right
 * before applying — if either changed since the preview was shown
 * (someone else approved, the AI snapshot was refreshed, a link
 * changed), the fingerprints differ and this refuses, asking for a new
 * preview instead of applying a decision the person on screen never
 * actually saw. Real double-click protection on top of this: runJob()
 * already refuses a second concurrent VITRINE_RENEW execution.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmação explícita e token da prévia são obrigatórios." }, { status: 400 });
  }

  const fresh = await computeVitrineRenewalDecision();
  if (fresh.blocked) {
    return NextResponse.json({ error: `Bloqueado: ${fresh.reason}` }, { status: 409 });
  }
  if (fresh.fingerprint !== parsed.data.previewToken) {
    return NextResponse.json(
      { error: "Os dados mudaram desde a prévia mostrada — gere uma nova revisão antes de aprovar." },
      { status: 409 },
    );
  }

  try {
    const counters = await runVitrineRenewJob();
    return NextResponse.json({ ok: true, counters });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao aplicar a renovação." }, { status: 500 });
  }
}
