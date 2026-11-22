import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { listVitrines } from "@/lib/services/vitrine-manager";
import { CreateVitrineForm } from "@/components/admin/create-vitrine-form";

export const metadata: Metadata = {
  title: "Vitrines — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ENDED: "Encerrada",
};

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3: "listagem das vitrines no painel
 * administrativo"). The original Vitrine Inteligente (slug
 * "vitrine-geral") appears here like any other real vitrine — its own
 * dedicated page (app/admin/vitrine-inteligente/page.tsx) stays
 * unchanged and untouched by this new listing.
 */
export default async function VitrinesAdminPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const vitrines = await listVitrines();
  const counts = await prisma.vitrineSelection.groupBy({
    by: ["vitrineId", "status"],
    _count: { _all: true },
  });
  const countFor = (vitrineId: string, status: string) =>
    counts.find((c) => c.vitrineId === vitrineId && c.status === status)?._count._all ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 text-sm sm:px-6">
      <h1 className="text-xl font-bold">Vitrines Inteligentes</h1>
      <p className="text-foreground/60 mt-1">
        Cada vitrine compartilha o mesmo motor de descoberta/pontuação — a exclusividade garante que um mesmo produto
        real nunca ocupe duas vitrines ativas ao mesmo tempo.
      </p>

      <div className="mt-6 space-y-3">
        {vitrines.map((v) => (
          <Link
            key={v.id}
            href={`/admin/vitrines/${v.id}`}
            className="border-border-subtle hover:border-brand/50 bg-surface block rounded-2xl border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{v.name}</p>
                <p className="text-foreground/50 text-xs">/vitrine/{v.slug}</p>
              </div>
              <span className="border-border-subtle rounded-full border px-3 py-1 text-xs font-medium">
                {STATUS_LABEL[v.status] ?? v.status}
              </span>
            </div>
            <p className="text-foreground/60 mt-2 text-xs">
              {countFor(v.id, "ACTIVE")} ativo(s) de {v.maxProducts} · {countFor(v.id, "RESERVE")} em reserva ·{" "}
              {countFor(v.id, "RETIRED")} retirado(s)
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <CreateVitrineForm />
      </div>
    </div>
  );
}
