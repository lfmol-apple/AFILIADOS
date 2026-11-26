import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelBatch } from "@/components/panel-batch";
import { loadBlackFridayPanel } from "@/lib/services/black-friday-2026";

export const metadata: Metadata = {
  title: "Black Friday 2026 — links em lote — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("Conclua a funcionalidade de geração e
 * importação em lote dos 30 links"): same PanelBatch component the
 * regular precocaindo queue and the Vitrine Inteligente queue already
 * use, pointed at the Black Friday 2026 endpoints — generate several
 * affiliate links at once in the Linkbuilder, paste them all here, the
 * system opens each one for real and matches it to its product by
 * catalog id (never by paste order), then saves only the ones that
 * check out.
 */
export default async function BlackFridayBatchLinksPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows } = await loadBlackFridayPanel();
  const pending = rows.filter((r) => r.status !== "VALIDATED" && r.enabled);
  const addresses = pending
    .map((r) => r.resolvedProductUrl ?? r.mlUrlOriginal)
    .filter((url): url is string => !!url);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/black-friday-2026" className="text-brand underline">
          ← Black Friday 2026 (um por um)
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Black Friday 2026 — links em lote
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Copie os endereços dos produtos pendentes, gere todos os links no Linkbuilder oficial de uma vez, cole
        todos de volta aqui. O sistema abre cada um, confere o produto de destino e salva só os que conferem —
        nunca por ordem de colagem.
      </p>
      <div className="mt-5">
        <PanelBatch
          addresses={addresses}
          pendingCount={pending.length}
          checkEndpoint="/api/admin/black-friday-2026/batch"
          saveEndpoint="/api/admin/black-friday-2026/batch-save"
        />
      </div>
    </div>
  );
}
