import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { createVitrine } from "@/lib/services/vitrine-manager";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3: "criação... pelo painel, sem precisar alterar
 * código"). Same admin-auth + Zod-validated-body pattern as every other
 * admin mutation route in this project (e.g.
 * app/api/admin/vitrine-commission/route.ts).
 */
const bodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens (ex: casa-inteligente)."),
  name: z.string().trim().min(2).max(120),
  purpose: z.string().trim().max(500).optional(),
  maxProducts: z.number().int().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!(await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Corpo da requisição inválido." }, { status: 400 });
  }

  try {
    const vitrine = await createVitrine(parsed.data);
    return NextResponse.json({ vitrine });
  } catch (err) {
    // Real, expected case: slug already taken (Vitrine.slug is @unique).
    return NextResponse.json({ error: `Não foi possível criar a vitrine: ${err instanceof Error ? err.message : String(err)}` }, { status: 409 });
  }
}
