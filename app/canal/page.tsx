import type { Metadata } from "next";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { CanalJoinButton } from "@/components/canal-join-button";
import { env } from "@/lib/config/env";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canal Promoções Preço Caindo",
  description:
    "Promoções reais, cupons verificados e comparação entre Mercado Livre, Amazon e Shopee — direto no seu WhatsApp.",
  alternates: { canonical: "/canal" },
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MERCHANT_LABEL: Record<"MERCADO_LIVRE" | "SHOPEE", string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
};

const BENEFITS = [
  {
    icon: "✅",
    title: "Promoções comprovadas",
    body: "Só mostramos queda de preço quando há dado real por trás — nunca um desconto inventado.",
  },
  {
    icon: "🔎",
    title: "Comparação entre lojas",
    body: "Mercado Livre, Amazon e Shopee, lado a lado, pra você comparar antes de decidir.",
  },
  {
    icon: "🆓",
    title: "Canal gratuito",
    body: "Sem mensalidade, sem spam — seleção criteriosa, não volume.",
  },
];

/**
 * Meta Ads landing page for channel growth (owner's brief, 2026-11-17,
 * section 10, "Caminho principal": anúncio → esta página → link oficial
 * do Canal → usuário decide seguir). Deliberately does NOT require
 * WhatsApp Business — the real destination is a plain whatsapp.com/channel/
 * follow link (WHATSAPP_CHANNEL_INVITE_URL), never WHATSAPP_CHANNEL_JID
 * (that's the internal protocol address, never shown to a visitor).
 *
 * The 3 example offers are real PRICE_DROP Radar events (lib/queries/
 * radar-events.ts) — the same evidence the Telegram channel already
 * trusts — never a fabricated "exemplo ilustrativo".
 */
export default async function CanalConvitePage() {
  const radarItems = await getPublicRadarFeed(12);
  const dropExamples = radarItems
    .filter((item) => item.event.type === "PRICE_DROP")
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <AnalyticsBeacon pageType="canal_convite" pageSlug="canal" />

      <p className="text-brand text-xs font-semibold tracking-wide uppercase">
        PreçoCaindo
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Canal Promoções Preço Caindo
      </h1>
      <p className="text-foreground/70 mt-3 text-base leading-relaxed">
        Ofertas selecionadas com critério, direto no seu WhatsApp — sem precisar
        abrir o site todos os dias.
      </p>

      <div className="mt-6">
        <CanalJoinButton channelUrl={env.WHATSAPP_CHANNEL_INVITE_URL} />
      </div>

      <ul className="mt-10 space-y-5">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3">
            <span aria-hidden className="text-xl">
              {b.icon}
            </span>
            <div>
              <p className="font-semibold">{b.title}</p>
              <p className="text-foreground/70 text-sm leading-relaxed">{b.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {dropExamples.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            Promoções reais de hoje
          </h2>
          <ul className="mt-4 space-y-3">
            {dropExamples.map((item) => {
              const evidence = item.event.evidence;
              return (
                <li
                  key={item.event.merchantListingId}
                  className="border-border-subtle flex items-center gap-3 rounded-xl border p-3"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external merchant image
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-contain bg-white"
                    />
                  ) : (
                    <div className="bg-background-muted h-14 w-14 shrink-0 rounded-lg" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-foreground/60 text-xs">
                      {MERCHANT_LABEL[item.merchant]}
                      {evidence.currentPrice !== undefined && (
                        <> · {formatBRL(evidence.currentPrice)}</>
                      )}
                      {evidence.dropPercent !== undefined && (
                        <>
                          {" "}
                          · −{Math.round(evidence.dropPercent * 100)}%
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <CanalJoinButton channelUrl={env.WHATSAPP_CHANNEL_INVITE_URL} />
      </div>
    </div>
  );
}
