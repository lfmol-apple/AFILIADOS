import Link from "next/link";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { RadarSummary } from "@/components/radar-summary";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";
import {
  getUnifiedMerchantOffers,
  mapAmazonProductToUnifiedCard,
  selectTopUnifiedOffers,
  type UnifiedOfferCard as UnifiedOfferCardData,
} from "@/lib/queries/unified-offers";
import { getHomeSections } from "@/lib/queries/products";
import { UnifiedOfferCard } from "@/components/unified-offer-card";

// Home rewrite, Acquisition Engine V1 (third pass) — the machine's job is
// to decide what merits attention, so the Home's only job is to hand that
// decision to the visitor as fast as possible: hero+search, real
// opportunities, a compact "what's happening" line. Everything
// institutional (guias grid, methodology prose) moved out — it now
// competes with nothing on this page. Guias remain fully alive/indexable
// at /guias and linked from the footer/header, just not staged here. See
// docs/HOME_ARCHITECTURE.md for the earlier passes' diagnostic trail.

export const dynamic = "force-dynamic";

export default async function Home() {
  const [amazonBestOpportunities, merchantOffers, radarItems] = await Promise.all([
    getHomeSections()
      .then((s) => s.bestOpportunities)
      .catch((error) => {
        console.error("home.amazon_opportunities_unavailable", error);
        return [];
      }),
    getUnifiedMerchantOffers(24, { source: "home" }).catch((error) => {
      console.error("home.merchant_offers_unavailable", error);
      return [] as UnifiedOfferCardData[];
    }),
    // A wider real sample than what's displayed individually — this only
    // feeds the compact category counts below (components/radar-summary.tsx),
    // never a per-product list, so a larger, still-cheap sample (see
    // lib/services/radar.ts's doc comment on today's real volume) gives a
    // more representative "acontecendo agora" than 4 events would.
    getPublicRadarFeed(20).catch((error) => {
      console.error("home.radar_unavailable", error);
      return [];
    }),
  ]);

  // "O que vale a pena agora" — the ONE commercial vitrine on this page,
  // a sample of the exact same real, cross-merchant, fail-closed data
  // /ofertas shows in full (lib/queries/unified-offers.ts) — no separate
  // query, no separate ranking rule, no per-marketplace section. Never
  // padded to 8 — selectTopUnifiedOffers just ranks+caps what's real.
  const bestOffers = selectTopUnifiedOffers(
    [...amazonBestOpportunities.map(mapAmazonProductToUnifiedCard), ...merchantOffers],
    8,
  );

  return (
    <div>
      <AnalyticsBeacon pageType="home" pageSlug="/" />

      {/* ---------------- 1. HERO + BUSCA ---------------- */}
      <section className="border-border-subtle bg-surface-muted border-b">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Descubra o que realmente está valendo a pena agora
          </h1>
          <p className="text-foreground/70 mt-3 text-base leading-relaxed">
            O PreçoCaindo monitora preços e oportunidades automaticamente para encontrar o que
            mudou e merece sua atenção.
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
                placeholder="Produto, marca ou modelo"
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
          <p className="text-foreground/40 mt-4 text-xs">Preços monitorados automaticamente</p>
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
