import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelBatch } from "@/components/panel-batch";
import { loadBlackFridayPanel, BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } from "@/lib/services/black-friday-2026";

export const metadata: Metadata = {
  title: "Black Friday Fim do Mundo — links em lote — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO", "importação em lote dos links de afiliado que eu gerar"):
 * identical to /admin/black-friday-2026/lote, pointed at this campaign's
 * own batch endpoints — same PanelBatch component, no reimplementation.
 */
export default async function BlackFridayFimDoMundoBatchPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows } = await loadBlackFridayPanel(BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN);
  const pending = rows.filter((r) => r.status !== "VALIDATED" && r.enabled);
  const addresses = pending
    .map((r) => r.resolvedProductUrl ?? r.mlUrlOriginal)
    .filter((url): url is string => !!url);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/black-friday-fim-do-mundo" className="text-brand underline">
          ← Black Friday Fim do Mundo (um por um)
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Black Friday Fim do Mundo — links em lote
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Copie os endereços dos produtos pendentes, gere todos os links no Linkbuilder oficial de uma vez (etiqueta{" "}
        <strong>blackfridayfimdomundo</strong>), cole todos de volta aqui. O sistema abre cada um, confere o produto
        de destino e salva só os que conferem — nunca por ordem de colagem.
      </p>
      <div className="mt-5">
        <PanelBatch
          addresses={addresses}
          pendingCount={pending.length}
          checkEndpoint="/api/admin/black-friday-fim-do-mundo/batch"
          saveEndpoint="/api/admin/black-friday-fim-do-mundo/batch-save"
        />
      </div>
    </div>
  );
}
