import Link from "next/link";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { GUIDES } from "@/lib/editorial/guides";
import { RadarSummary } from "@/components/radar-summary";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";
import {
  getUnifiedMerchantOffers,
  mapAmazonProductToUnifiedCard,
  type UnifiedOfferCard as UnifiedOfferCardData,
} from "@/lib/queries/unified-offers";
import { getHomeSections } from "@/lib/queries/products";
import { UnifiedOfferCard } from "@/components/unified-offer-card";

// Home rewrite, 2026-09-08 (second pass) — "reduzir a experiência ao
// essencial". Three paths only: BUSCAR (hero search) -> DESCOBRIR
// (this page's one sample + /ofertas) -> ENTENDER (guias). Everything
// else is secondary or gone. See docs/HOME_ARCHITECTURE.md for the full
// diagnostic trail (both passes) behind this file's current shape.

export const dynamic = "force-dynamic";

const FEATURED_GUIDE_SLUGS = [
  "como-saber-se-uma-promocao-e-realmente-boa",
  "como-saber-se-vale-a-pena-comprar-agora",
  "como-funciona-o-historico-de-precos",
  "parcelado-ou-a-vista-como-comparar-corretamente",
];

export default async function Home() {
  const [amazonBestOpportunities, merchantOffers, radarItems] = await Promise.all([
    getHomeSections()
      .then((s) => s.bestOpportunities)
      .catch((error) => {
        console.error("home.amazon_opportunities_unavailable", error);
        return [];
      }),
    getUnifiedMerchantOffers(24).catch((error) => {
      console.error("home.merchant_offers_unavailable", error);
      return [] as UnifiedOfferCardData[];
    }),
    // Compact — 4 events max, ticker-style (components/radar-summary.tsx),
    // never the full card grid (components/radar-feed.tsx, no longer used
    // on Home — "Radar é inteligência, não catálogo").
    getPublicRadarFeed(4).catch((error) => {
      console.error("home.radar_unavailable", error);
      return [];
    }),
  ]);

  // "O que vale a pena agora" — the ONE commercial vitrine on this page,
  // a sample of the exact same real, cross-merchant, fail-closed data
  // /ofertas shows in full (lib/queries/unified-offers.ts) — no separate
  // query, no separate ranking rule, no per-marketplace section.
  const bestOffers = [...amazonBestOpportunities.map(mapAmazonProductToUnifiedCard), ...merchantOffers]
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1))
    .slice(0, 8);

  const featuredGuides = FEATURED_GUIDE_SLUGS.map((slug) =>
    GUIDES.find((guide) => guide.slug === slug),
  ).filter((guide): guide is (typeof GUIDES)[number] => Boolean(guide));

  return (
    <div>
      <AnalyticsBeacon pageType="home" pageSlug="/" />

      {/* ---------------- 1. HERO + BUSCA ---------------- */}
      <section className="border-border-subtle bg-surface-muted border-b">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            O que você quer comprar?
          </h1>
          <p className="text-foreground/70 mt-3 text-base leading-relaxed">
            O PreçoCaindo mostra se vale comprar agora ou esperar.
          </p>
          <form action="/ofertas" method="GET" className="mx-auto mt-8 max-w-xl">
            <label htmlFor="hero-search" className="sr-only">
              O que você está pensando em comprar?
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="hero-search"
                type="search"
                name="q"
                placeholder="Busque produto, marca, modelo ou categoria"
                className="border-border-subtle bg-background focus:border-brand min-h-14 w-full rounded-full border px-6 py-3 text-base outline-none"
              />
              <button
                type="submit"
                className="bg-brand text-brand-foreground min-h-14 rounded-full px-8 py-3 text-base font-semibold hover:opacity-90"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---------------- 2. O QUE VALE A PENA AGORA ---------------- */}
      {bestOffers.length > 0 && (
        <HomeSection title="O que vale a pena agora" href="/ofertas">
          {bestOffers.map((item) => (
            <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
          ))}
        </HomeSection>
      )}

      {/* ---------------- 3. RADAR (resumido) ---------------- */}
      <RadarSummary items={radarItems} />

      {/* ---------------- 4. GUIAS ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Guias para comprar melhor</h2>
          <Link href="/guias" className="text-brand text-sm hover:underline">
            Ver todos os guias
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredGuides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="border-border-subtle hover:border-brand block rounded-lg border p-4 text-sm"
              >
                <span className="mt-1 block font-medium">{guide.title}</span>
                <span className="text-foreground/50 mt-3 block text-xs">
                  {guide.readingTime} de leitura
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- 5. COMO FUNCIONA ---------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-2 pb-10 sm:px-6">
        <p className="text-foreground/60 max-w-2xl text-sm leading-relaxed">
          O PreçoCaindo acompanha preços, demanda e oportunidades em
          diferentes lojas para ajudar você a decidir quando e onde comprar.{" "}
          <Link href="/como-funciona" className="text-brand hover:underline">
            Como funciona →
          </Link>
        </p>
      </section>
    </div>
  );
}

function HomeSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-brand text-sm hover:underline">
          Ver todas as ofertas
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}
