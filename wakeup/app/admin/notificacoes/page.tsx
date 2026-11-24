import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PushNotificationsManager } from "@/components/push-notifications-manager";
import { DashboardGroup } from "@/components/admin/dashboard-ui";
import { isPushConfigured } from "@/lib/push/send";

export const metadata: Metadata = {
  title: "Notificações — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isAdminRequestAuthorized(sessionToken))) {
    return <AdminLoginForm />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notificações</h1>
          <p className="text-foreground/50 mt-1 text-sm">
            Um aviso no seu navegador ou celular quando o site é acessado.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          ← Admin
        </a>
      </div>

      {!isPushConfigured() && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados —
          ativar aqui não vai funcionar até isso ser resolvido no .env de
          produção.
        </div>
      )}

      <DashboardGroup
        title="Este navegador ou celular"
        description="Ative em cada aparelho onde você quer ser avisado. No iPhone, o Safari só entrega esse aviso depois de adicionar o site à Tela de Início (o componente abaixo explica o passo a passo quando detecta um iPhone)."
      >
        <PushNotificationsManager />
      </DashboardGroup>

      <DashboardGroup title="O que dispara o aviso">
        <ul className="text-foreground/70 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            Um aviso na primeira página que uma pessoa vê no dia — o resto da
            navegação dela não manda mais nada até o dia seguinte. Assim o aviso
            avisa de gente nova, sem virar uma enxurrada quando o tráfego
            crescer.
          </li>
          <li>
            Só conta visita de verdade: as suas (pelo{" "}
            <a href="/admin/modo-dono" className="text-brand underline">
              modo dono
            </a>
            ) e qualquer navegação dentro do /admin não geram aviso.
          </li>
          <li>
            Uma visita só é registrada (e só então pode gerar aviso) se a pessoa
            aceitou os cookies de análise no banner do site. Quem recusa não
            aparece nos relatórios nem aqui.
          </li>
          <li>Tocar no aviso abre a página que a pessoa estava vendo.</li>
        </ul>
      </DashboardGroup>
    </div>
  );
}
