import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelBatch } from "@/components/panel-batch";
import { loadPanelQueue } from "@/lib/services/ml-panel-queue-data";

export const metadata: Metadata = {
  title: "Links em lote — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BatchLinksPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { pending } = await loadPanelQueue();
  const addresses = pending
    .map((e) => e.pick.productUrl)
    .filter((u): u is string => !!u)
    .slice(0, 40);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Links em lote (Mercado Livre)</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Gere vários links de uma vez no Linkbuilder e cole todos aqui. O sistema
        abre cada um, confere se é do produto certo (e da sua tag) e salva só os
        que conferem. Os demais ficam listados para você resolver.{" "}
        <a
          href="/admin/fila-links"
          className="text-brand underline underline-offset-2"
        >
          ← voltar à fila
        </a>
      </p>
      <div className="mt-5">
        <PanelBatch addresses={addresses} pendingCount={pending.length} />
      </div>
    </div>
  );
}
