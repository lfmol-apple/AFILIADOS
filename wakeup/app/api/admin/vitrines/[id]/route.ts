import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3: "nome, slug, finalidade... quantidade máxima
 * de produtos"). Edits metadata ONLY — never touches a single
 * VitrineSelection row, never changes status (see the dedicated
 * activate/pause/end routes for that), so this is safe to call
 * regardless of the vitrine's current status.
 */
const bodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  purpose: z.string().trim().max(500).nullable().optional(),
  maxProducts: z.number().int().min(1).max(100).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Corpo da requisição inválido." }, { status: 400 });
  }

  const vitrine = await prisma.vitrine.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ vitrine });
}
