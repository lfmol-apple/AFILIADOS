import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { OwnerModeToggle } from "@/components/owner-mode-toggle";
import { DashboardGroup } from "@/components/admin/dashboard-ui";
import {
  OWNER_MARK_COOKIE,
  getActiveOwnerMark,
} from "@/lib/admin/owner-traffic";

export const metadata: Metadata = {
  title: "Modo dono — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function OwnerModePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isAdminRequestAuthorized(sessionToken))) {
    return <AdminLoginForm />;
  }

  const markToken = cookieStore.get(OWNER_MARK_COOKIE)?.value;
  const mark = await getActiveOwnerMark(markToken);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Modo dono</h1>
          <p className="text-foreground/50 mt-1 text-sm">
            Tira suas próprias visitas e cliques dos relatórios de acesso e
            comissão.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          ← Admin
        </a>
      </div>

      <DashboardGroup
        title="Este navegador"
        description="Ativar aqui grava uma marca só neste navegador (não em você como pessoa — o site não guarda quem você é). Ative em cada navegador ou aparelho que você usa para olhar o site como visitante."
      >
        <OwnerModeToggle
          initiallyOn={mark !== null}
          initialExpiresAt={mark ? mark.expiresAt.toISOString() : null}
        />
      </DashboardGroup>

      <DashboardGroup title="Como funciona">
        <ul className="text-foreground/70 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            Enquanto ativado, os cliques em produtos (Mercado Livre, Shopee,
            Amazon) continuam sendo registrados normalmente — para você
            confirmar que o link funciona — mas ficam marcados como seus e os
            relatórios os ignoram.
          </li>
          <li>Suas visitas de página deixam de ser gravadas.</li>
          <li>
            Dura até 400 dias (o máximo que um navegador aceita guardar). Se
            expirar, volte aqui e ative de novo.
          </li>
          <li>
            Estar logado no /admin já tem o mesmo efeito, mas só por 12 horas
            depois do login — este modo serve para o resto do tempo, navegando
            no site normalmente.
          </li>
          <li>
            Cada navegador guarda sua própria marca: ativar no computador não
            ativa no celular, e limpar os dados do navegador desativa.
          </li>
        </ul>
      </DashboardGroup>
    </div>
  );
}
