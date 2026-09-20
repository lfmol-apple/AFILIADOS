import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import {
  AMAZON_SHOWCASE_FEATURED,
  AMAZON_SHOWCASE_MORE,
  getShowcaseHref,
  type AmazonShowcaseProduct,
} from "@/lib/amazon/br-showcase";
import { AMAZON_SHOWCASE_DETAILS } from "@/lib/amazon/br-showcase-content";

/**
 * "Achados na Amazon" — home page section. Every card links straight to
 * the normal amazon.com.br product URL with our Tracking ID (see
 * lib/amazon/br-showcase.ts), never through /go/amazon — Amazon requires
 * links to be accessed directly from the site, with the Associate ID
 * visible in the URL.
 *
 * Deliberately a Server Component, not "use client": AffiliateDisclosure
 * transitively reads server-only env config (lib/config/env.ts) at module
 * evaluation time. A "use client" ancestor would have pulled that whole
 * chain into the browser bundle, where process.env.DATABASE_URL doesn't
 * exist — this crashed hydration in production (2026-09-03) until fixed.
 * The "Ver todos" reveal below uses native <details>/<summary> instead of
 * client-side state, so this section needs no client boundary at all.
 */
export function AmazonBrShowcase() {
  // "Se AmazonBrShowcase não tiver conteúdo real, não renderizar o bloco"
  // (project brief, 2026-09-08) — defensive: today AMAZON_SHOWCASE_FEATURED
  // is always non-empty (hand-curated, not DB-driven), but this must never
  // reserve visible Home space once/if that stops being true.
  if (AMAZON_SHOWCASE_FEATURED.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div>
        <h2 className="text-lg font-semibold">Achados na Amazon</h2>
        <p className="text-foreground/70 mt-1 text-sm leading-relaxed">
          Produtos selecionados para você acompanhar e comparar antes de
          comprar.
        </p>
      </div>

      <div className="mt-2">
        <AffiliateDisclosure />
        <Link
          href="/achados"
          className="text-brand mt-2 inline-block text-sm font-medium underline"
        >
          Ver a página completa de achados na Amazon →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AMAZON_SHOWCASE_FEATURED.map((product) => (
          <AmazonShowcaseCard key={product.id} product={product} />
        ))}
      </div>

      {AMAZON_SHOWCASE_MORE.length > 0 && (
        <details className="group mt-6">
          <summary className="border-border-subtle hover:border-brand hover:text-brand inline-flex min-h-11 cursor-pointer list-none items-center rounded-full border px-5 py-2 text-sm font-medium">
            Ver todos
          </summary>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AMAZON_SHOWCASE_MORE.map((product) => (
              <AmazonShowcaseCard key={product.id} product={product} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export function AmazonShowcaseCard({
  product,
}: {
  product: AmazonShowcaseProduct;
}) {
  const href = getShowcaseHref(product);
  return (
    <article className="border-border-subtle flex h-full flex-col rounded-lg border p-4">
      <span className="text-foreground/50 text-xs font-semibold tracking-wide uppercase">
        {product.category}
      </span>
      <h3 className="mt-1 text-sm font-semibold">{product.title}</h3>
      {product.brand && (
        <p className="text-foreground/50 mt-0.5 text-xs">{product.brand}</p>
      )}
      <p className="text-foreground/70 mt-2 flex-1 text-sm leading-relaxed">
        {product.description}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="bg-brand text-brand-foreground mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold hover:opacity-90"
        >
          Ver na Amazon
        </a>
      ) : (
        <p className="text-foreground/60 mt-4 text-sm" role="status">
          Link temporariamente indisponível.
        </p>
      )}
    </article>
  );
}

/**
 * Full editorial card used on /achados: the short description plus who the
 * product suits, when it does not, and a pre-purchase checklist. The compact
 * AmazonShowcaseCard above stays for the home section.
 */
export function AmazonShowcaseDetailCard({
  product,
}: {
  product: AmazonShowcaseProduct;
}) {
  const href = getShowcaseHref(product);
  const details = AMAZON_SHOWCASE_DETAILS[product.id];
  return (
    <article className="border-border-subtle flex h-full flex-col rounded-xl border p-5 sm:p-6">
      <span className="text-foreground/50 text-xs font-semibold tracking-wide uppercase">
        {product.category}
      </span>
      <h3 className="mt-1 text-base leading-snug font-semibold sm:text-lg">
        {product.title}
      </h3>
      {product.brand && (
        <p className="text-foreground/50 mt-0.5 text-xs">{product.brand}</p>
      )}
      <p className="text-foreground/75 mt-3 text-sm leading-relaxed">
        {product.description}
      </p>

      {details && (
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <section>
            <h4 className="text-xs font-semibold tracking-wide uppercase">
              Para quem faz sentido
            </h4>
            <p className="text-foreground/75 mt-1">{details.paraQuem}</p>
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide uppercase">
              Quando não é a melhor escolha
            </h4>
            <p className="text-foreground/75 mt-1">{details.naoIndicado}</p>
          </section>
          <section>
            <h4 className="text-xs font-semibold tracking-wide uppercase">
              Antes de comprar, confira
            </h4>
            <ul className="text-foreground/75 mt-1 list-disc space-y-1.5 pl-5">
              {details.antesDeComprar.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <div className="mt-auto pt-5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="bg-brand text-brand-foreground inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold hover:opacity-90 sm:w-auto"
          >
            Ver na Amazon
          </a>
        ) : (
          <p className="text-foreground/60 text-sm" role="status">
            Link temporariamente indisponível.
          </p>
        )}
        <p className="text-foreground/50 mt-2 text-xs">
          Link de afiliado. A compra é feita na Amazon.
        </p>
      </div>
    </article>
  );
}
