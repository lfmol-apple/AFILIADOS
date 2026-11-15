import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { WhatsAppCaptionCard } from "@/components/whatsapp-caption-card";
import { env } from "@/lib/config/env";
import { loadWhatsAppTrendingToday } from "@/lib/queries/whatsapp-trending-today";
import { buildWhatsAppItemCaption } from "@/lib/services/whatsapp-message";

export const metadata: Metadata = {
  title: "Canal de WhatsApp — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const DEFAULT_COUNT = 6;

// Posting to a WhatsApp Channel can't be automated reliably — confirmed
// 2026-11-15 (WhiskeySockets/Baileys#2687, cross-checked independently in
// whatsapp-web.js/WAHA): every automated client gets "accepted but never
// delivered". The real WhatsApp app posting by hand is the one path that
// always works, so this page prepares each post (image + caption) ready
// to copy/save and paste into the Canal from the dedicated number's real
// WhatsApp — same ranking jobs/whatsapp-digest.ts uses for the Group.
export default async function WhatsAppChannelPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string }>;
}) {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { count: countParam } = await searchParams;
  const count = countParam ? Number(countParam) : DEFAULT_COUNT;

  const items = await loadWhatsAppTrendingToday(Number.isFinite(count) && count > 0 ? count : DEFAULT_COUNT);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Canal de WhatsApp — postar na mão</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Abra o WhatsApp do número do Canal (celular ou WhatsApp Web), entre no Canal{" "}
        <strong>Promoções Preço Caindo</strong> e, pra cada item abaixo: toque em{" "}
        <strong>Abrir imagem</strong>, salve/compartilhe ela no Canal, toque em{" "}
        <strong>Copiar texto</strong> e cole como legenda.
      </p>
      <p className="mt-3">
        <a
          href="/admin/canal-whatsapp?count=10"
          className="border-border-subtle hover:border-brand inline-block rounded-full border px-4 py-2 text-xs font-semibold"
        >
          Ver 10 em vez de 6 →
        </a>
      </p>
      <ul className="mt-6 space-y-4">
        {items.map((item, i) => (
          <WhatsAppCaptionCard
            key={item.href}
            position={i + 1}
            title={item.title}
            imageUrl={item.imageUrl}
            caption={buildWhatsAppItemCaption(item, env.NEXT_PUBLIC_SITE_URL)}
          />
        ))}
      </ul>
      {items.length === 0 && (
        <p className="text-foreground/60 mt-6 text-sm">
          Nenhum produto elegível agora (precisa de preço, link ativo e imagem).
        </p>
      )}
    </div>
  );
}
