import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { loadPanelQueue } from "@/lib/services/ml-panel-queue-data";
import { BATCH_MAX_LINKS, previewBatch } from "@/lib/services/ml-panel-batch";
import { parseBatchLinks } from "@/lib/services/ml-panel-check-logic";

const bodySchema = z.object({ text: z.string().max(20000) });

/**
 * Batch check: the owner pasted the links the Linkbuilder generated in one go.
 * Opens each and pairs it with the pending row it belongs to (by product, not
 * by order). Read-only — saving is done one link at a time by the client
 * through /api/admin/ml-panel-links, which re-checks everything.
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
  const { pending } = await loadPanelQueue();
  const rows = await previewBatch(
    links,
    pending.map((e) => ({
      id: e.pick.id,
      title: e.pick.title,
      productUrl: e.pick.productUrl,
    })),
  );
  return NextResponse.json({ ok: true, rows });
}
