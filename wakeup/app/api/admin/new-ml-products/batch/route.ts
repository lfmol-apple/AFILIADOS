import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { loadNewMlProducts } from "@/lib/queries/new-ml-products";
import {
  BATCH_MAX_LINKS,
  previewNewMlProductsBatch,
} from "@/lib/services/new-ml-products-batch";
import { parseBatchLinks } from "@/lib/services/ml-panel-check-logic";

const bodySchema = z.object({ text: z.string().max(20000) });

/** Batch check for /admin/produtos-novos-ml — same read-only pairing the
 * fila-links batch flow uses, over the backlog's own candidates instead
 * of panel picks. */
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

  const candidates = await loadNewMlProducts();
  const rows = await previewNewMlProductsBatch(
    links,
    candidates.map((c) => ({
      id: c.merchantListingId,
      title: c.title,
      productUrl: c.productUrl,
    })),
  );
  return NextResponse.json({ ok: true, rows });
}
