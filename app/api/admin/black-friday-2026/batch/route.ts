import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { loadBlackFridayPanel, BLACK_FRIDAY_2026_CAMPAIGN } from "@/lib/services/black-friday-2026";
import { BATCH_MAX_LINKS } from "@/lib/services/ml-panel-batch";
import { parseBatchLinks } from "@/lib/services/ml-panel-check-logic";
import { previewBlackFridayBatch } from "@/lib/services/black-friday-link-batch";

const bodySchema = z.object({ text: z.string().max(20000) });

/** Batch check for the 30 Black Friday 2026 affiliate links — mirrors
 * app/api/admin/vitrine-links/batch/route.ts exactly, pointed at
 * BlackFridayProduct instead. Read-only; saving goes through
 * /api/admin/black-friday-2026/batch-save, which re-validates the host
 * allowlist and the creative-group match itself. */
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

  const { rows: products } = await loadBlackFridayPanel(BLACK_FRIDAY_2026_CAMPAIGN);
  const pending = products
    .filter((p) => p.status !== "VALIDATED" && p.enabled)
    .map((p) => ({
      id: p.id,
      title: p.name,
      productUrl: p.resolvedProductUrl ?? p.mlUrlOriginal ?? undefined,
    }));

  const rows = await previewBlackFridayBatch(links, pending);
  return NextResponse.json({ ok: true, rows });
}
