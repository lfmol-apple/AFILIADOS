import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { ProductImage } from "@/components/product-image";
import { getRealDiscountCandidates } from "@/lib/queries/black-friday";
import { siteConfig } from "@/lib/config/site";

// Dynamic, not ISR: the Docker build stage has no reachable database, so a
// statically-prerendered version of this page fails the build outright
// (confirmed live, 2026-11-14) — same reason /ofertas is dynamic too. The
// 20-minute in-memory cache in getRealDiscountCandidates already avoids
// doing the heavy query on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Black Friday: desconto de verdade ou só subiram antes? | PreçoCaindo",
  description:
    "Conferimos o histórico real de preço de cada produto antes da Black Friday — não o desconto anunciado pela loja. Só aparece aqui quem realmente caiu de preço.",
};

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MERCHANT_LABEL: Record<"mercado-livre" | "shopee", string> = {
  "mercado-livre": "Mercado Livre",
  shopee: "Shopee",
};

export default async function BlackFridayPage() {
  const items = await getRealDiscountCandidates().catch((error) => {
    console.error("black_friday.page_load_failed", error);
    return [];
  });
  const breadcrumbItems = [
    { label: "Início", href: "/" },
    { label: "Black Friday: desconto de verdade?" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="black-friday" pageSlug="black-friday" />
      <Breadcrumbs items={breadcrumbItems} />

      <h1 className="mt-4 text-3xl leading-tight font-bold sm:text-4xl">
        Black Friday: é desconto de verdade?
      </h1>
      <p className="text-foreground/70 mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
        Todo ano é a mesma pergunta: a loja baixou o preço de verdade, ou subiu
        antes só pra parecer desconto? Aqui a gente não usa o desconto que a
        loja anuncia — usa o <strong>histórico real</strong> que o PreçoCaindo
        vem observando. Só entra nessa lista quem realmente caiu de preço.
      </p>

      {items.length === 0 ? (
        <p className="text-foreground/60 mt-8 text-sm">
          Ainda estamos conferindo o histórico de preço. Volte em breve.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <a
              key={item.merchantListingId}
              href={item.href}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="group border-border-subtle bg-background hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5"
            >
              <div className="bg-surface-muted relative aspect-square w-full overflow-hidden">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
                <span
                  className={`absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md ${
                    item.isAllTimeLow ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  {item.isAllTimeLow
                    ? "Menor preço já registrado"
                    : `Caiu ${Math.round(item.dropPercent * 100)}% de verdade`}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-foreground/50 text-[11px]">
                  {MERCHANT_LABEL[item.merchantSlug]}
                </p>
                <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium">
                  {item.title}
                </h3>
                <div className="mt-auto pt-2">
                  <span className="text-lg font-bold">{brl(item.currentPrice)}</span>
                  <span className="text-foreground/40 ml-2 text-xs line-through">
                    {brl(item.previousPrice)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <section className="border-border-subtle mt-10 max-w-2xl border-t pt-6">
        <h2 className="text-foreground/70 text-sm font-semibold">Como conferimos isso</h2>
        <p className="text-foreground/50 mt-2 text-xs leading-relaxed">
          O {siteConfig.name} observa o preço de cada produto ao longo do tempo,
          de forma automática. "Menor preço já registrado" só aparece quando o
          preço atual é, de fato, o mais baixo que já vimos — nunca é uma
          estimativa. O resto mostra quedas reais medidas por nós, não o
          desconto anunciado pela loja.
        </p>
        <div className="mt-3">
          <AffiliateDisclosure full />
        </div>
      </section>
    </div>
  );
}
