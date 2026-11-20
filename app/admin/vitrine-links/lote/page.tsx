import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelBatch } from "@/components/panel-batch";
import { loadVitrineLinkQueue } from "@/lib/services/vitrine-link-queue";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — links em lote — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Batch version of /admin/vitrine-links (owner's requirement, 2026-11-20,
 * "Ordem de Execução" section 6: the most efficient authorized flow for
 * a 30-link queue, given Mercado Livre has no official link-generation
 * API — confirmed again this same day, no change since the original
 * research). Same component the regular precocaindo queue's
 * /admin/fila-links/lote already uses, pointed at the vitrinedinamica
 * endpoints so the two tags' saves never cross.
 */
export default async function VitrineBatchLinksPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { pending } = await loadVitrineLinkQueue();
  const addresses = pending.map((p) => p.productUrl).slice(0, 30);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Vitrine Inteligente — links em lote (etiqueta vitrinedinamica)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Gere vários links de uma vez no Linkbuilder (lembre de selecionar a
        etiqueta <strong>vitrinedinamica</strong>, nunca precocaindo) e cole
        todos aqui. O sistema abre cada um, confere se é do produto certo e
        salva só os que conferem.{" "}
        <a
          href="/admin/vitrine-links"
          className="text-brand underline underline-offset-2"
        >
          ← voltar à fila (um por um)
        </a>
      </p>
      <div className="mt-5">
        <PanelBatch
          addresses={addresses}
          pendingCount={pending.length}
          checkEndpoint="/api/admin/vitrine-links/batch"
          saveEndpoint="/api/admin/vitrine-links"
        />
      </div>
    </div>
  );
}
