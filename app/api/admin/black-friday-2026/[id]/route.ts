import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import {
  BlackFridayUpdateError,
  updateBlackFridayProduct,
} from "@/lib/services/black-friday-2026";

const bodySchema = z.object({
  mlUrlOriginal: z.string().url().max(2000).nullable().optional(),
  affiliateUrl: z.string().url().max(2000).nullable().optional(),
  currentPrice: z.number().positive().nullable().optional(),
  selectedCreativeId: z.string().nullable().optional(),
  status: z
    .enum(["PENDING_LINK", "LINK_PASTED", "VALIDATED", "DIVERGENT", "REJECTED"])
    .optional(),
  reviewNote: z.string().max(2000).nullable().optional(),
  markDestinationChecked: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  if (
    !(await isAdminRequestAuthorized(
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    ))
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  try {
    const product = await updateBlackFridayProduct(id, parsed.data);
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    if (err instanceof BlackFridayUpdateError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
