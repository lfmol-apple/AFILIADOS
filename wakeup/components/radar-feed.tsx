import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import type { RadarFeedItem } from "@/lib/queries/radar-events";

/**
 * "O que está acontecendo agora" — real, deterministically-derived events
 * (lib/services/radar.ts), never promotional filler (project brief,
 * 2026-09-07). Server Component — no "use client" (see
 * components/amazon-br-showcase.tsx's incident comment: AffiliateDisclosure
 * pulls a server-only env-reading import chain that crashes hydration if
 * this were client-side).
 *
 * Copy rule: every headline shown here is `item.event.headline`, produced
 * by a pure function from real evidence — this component never invents or
 * embellishes it. Merchant is shown as a small, secondary label ("Disponível
 * no Mercado Livre"), never as the headline (project brief section 11:
 * "merchant não é protagonista").
 */

const MERCHANT_LABEL: Record<"SHOPEE" | "MERCADO_LIVRE", string> = {
  SHOPEE: "Disponível na Shopee",
  MERCADO_LIVRE: "Disponível no Mercado Livre",
};

export function RadarFeed({ items }: { items: RadarFeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-xl font-semibold">🔥 O que está acontecendo agora</h2>
      <p className="text-foreground/70 mt-1 text-sm leading-relaxed">
        Preços que caíram, produtos em alta e boas ofertas — detectados agora, não uma lista fixa.
      </p>
      <div className="mt-2">
        <AffiliateDisclosure />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <RadarCard key={`${item.event.merchantListingId}-${item.event.type}-${i}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function RadarCard({ item }: { item: RadarFeedItem }) {
  return (
    <article className="border-border-subtle flex h-full flex-col rounded-lg border p-4">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="aspect-square w-full rounded-md object-cover"
        />
      ) : null}
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{item.title}</h3>
      <p className="text-brand mt-1 text-sm font-medium">{item.event.headline}</p>
      <span className="text-foreground/50 mt-auto pt-3 text-xs">{MERCHANT_LABEL[item.merchant]}</span>
      {item.ctaHref ? (
        <a
          href={item.ctaHref}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="bg-brand text-brand-foreground mt-3 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold hover:opacity-90"
        >
          Ver oferta
        </a>
      ) : null}
    </article>
  );
}
