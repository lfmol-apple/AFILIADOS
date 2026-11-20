import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { loadVitrineLinkQueue } from "@/lib/services/vitrine-link-queue";
import { BATCH_MAX_LINKS } from "@/lib/services/ml-panel-batch";
import { parseBatchLinks } from "@/lib/services/ml-panel-check-logic";
import { previewVitrineBatch } from "@/lib/services/vitrine-link-batch";

const bodySchema = z.object({ text: z.string().max(20000) });

/**
 * Batch check for the Vitrine Inteligente's "vitrinedinamica" link queue —
 * mirrors app/api/admin/ml-panel-links/batch/route.ts exactly, pointed at
 * lib/services/vitrine-link-batch.ts instead (owner's requirement,
 * 2026-11-20: the 30-link Vitrine queue deserves the same batch flow the
 * regular link queue already has, not the slower one-at-a-time form).
 * Read-only — saving happens through /api/admin/vitrine-links, same as
 * the single-link flow, which re-checks everything itself.
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
  const links = parseBatchLinks(parsed.data.text);
  if (links.length === 0) {
    return NextResponse.json(
      { error: "Não encontrei nenhum link no texto colado." },
      { status: 400 },
    );
  }
  if (links.length > BATCH_MAX_LINKS) {
    return NextResponse.json(
      {
        error: `Cole no máximo ${BATCH_MAX_LINKS} links por vez (vieram ${links.length}).`,
      },
      { status: 400 },
    );
  }
  const { pending } = await loadVitrineLinkQueue();
  const rows = await previewVitrineBatch(
    links,
    pending.map((p) => ({ id: p.merchantListingId, title: p.title, productUrl: p.productUrl })),
  );
  return NextResponse.json({ ok: true, rows });
}
