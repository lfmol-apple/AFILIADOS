import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { UnifiedOfferCard } from "@/components/unified-offer-card";
import { VitrineFeaturedProduct } from "@/components/vitrine-featured-product";
import { getVitrineBySlug } from "@/lib/services/vitrine-manager";
import { loadVitrinePublicProducts } from "@/lib/queries/vitrine-public";
import type { PagePropsWithParams } from "@/lib/next-route-types";

export const dynamic = "force-dynamic";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3). Real flow this prepares for (Etapa 5, not
 * implemented here): "Anúncio no Facebook/Instagram → URL específica do
 * PreçoCaindo → Produto anunciado em destaque → Restante da vitrine
 * abaixo → Botão Comprar no Mercado Livre." The identifier used for
 * `?p=` is the real VitrineSelection.id — the SAME value the Meta
 * catalog feed already publishes as `g:id`
 * (app/catalogo/mercado-livre.xml/route.ts) — stable and independent of
 * the product's position in the list, confirmed by construction (it's
 * a real database id, never an array index).
 *
 * Owner's explicit rules, honored here:
 *  - "se o produto estiver indisponível, apresentar a vitrine
 *    normalmente" — an unmatched/stale `?p=` never errors, it's simply
 *    ignored and the normal grid renders.
 *  - "não exibir preço expirado como atual" — every product's price
 *    comes from loadPublicMerchantProduct() at request time (same real
 *    read every other product page uses), never cached/baked into the
 *    selection row.
 *  - "não criar página de erro para produto indisponível" — only a
 *    genuinely nonexistent vitrine slug 404s; a real vitrine that's
 *    DRAFT/PAUSED/ENDED renders a plain, honest "não disponível" state.
 */
export async function generateMetadata(props: PagePropsWithParams<{ slug: string }>): Promise<Metadata> {
  const { slug } = await props.params;
  const vitrine = await getVitrineBySlug(slug);
  if (!vitrine) return {};
  return {
    title: `${vitrine.name} — PreçoCaindo`,
    description: vitrine.purpose ?? `Oportunidades selecionadas: ${vitrine.name}.`,
    robots: vitrine.status === "ACTIVE" ? undefined : { index: false, follow: false },
  };
}

export default async function VitrinePublicPage(props: PagePropsWithParams<{ slug: string }>) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const vitrine = await getVitrineBySlug(slug);
  if (!vitrine) notFound();

  if (vitrine.status !== "ACTIVE") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold">{vitrine.name}</h1>
        <p className="text-foreground/60 mt-3">Esta vitrine não está disponível publicamente no momento.</p>
      </div>
    );
  }

  const products = await loadVitrinePublicProducts(vitrine.id);

  const highlightId = typeof searchParams.p === "string" ? searchParams.p : null;
  const featured = highlightId ? products.find((p) => p.vitrineSelectionId === highlightId) : undefined;
  const rest = featured ? products.filter((p) => p.vitrineSelectionId !== featured.vitrineSelectionId) : products;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="vitrine" pageSlug={slug} />
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: vitrine.name }]} />

      {!featured && (
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{vitrine.name}</h1>
          {vitrine.purpose && <p className="text-foreground/60 mt-1">{vitrine.purpose}</p>}
        </div>
      )}

      {featured && <VitrineFeaturedProduct product={featured} />}

      {rest.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {rest.map((item) => (
            <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        !featured && <p className="text-foreground/60 mt-6">Nenhum produto disponível nesta vitrine agora.</p>
      )}
    </div>
  );
}
