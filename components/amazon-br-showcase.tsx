"use client";

import { useState } from "react";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import {
  AMAZON_SHOWCASE_FEATURED,
  AMAZON_SHOWCASE_MORE,
  type AmazonShowcaseProduct,
} from "@/lib/amazon/br-showcase";

/**
 * "Achados na Amazon" — home page section. Every card links straight to
 * the owner-provided Special Link (see lib/amazon/br-showcase.ts), never
 * through /go/amazon — that path reconstructs a URL from our own
 * configured tag, which would not preserve these links byte-for-byte.
 */
export function AmazonBrShowcase() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll
    ? [...AMAZON_SHOWCASE_FEATURED, ...AMAZON_SHOWCASE_MORE]
    : AMAZON_SHOWCASE_FEATURED;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Achados na Amazon</h2>
          <p className="text-foreground/70 mt-1 text-sm leading-relaxed">
            Produtos selecionados para você acompanhar e comparar antes de
            comprar.
          </p>
        </div>
      </div>

      <div className="mt-2">
        <AffiliateDisclosure />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <AmazonShowcaseCard key={product.id} product={product} />
        ))}
      </div>

      {!showAll && AMAZON_SHOWCASE_MORE.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="border-border-subtle hover:border-brand hover:text-brand mt-6 min-h-11 rounded-full border px-5 py-2 text-sm font-medium"
        >
          Ver todos
        </button>
      )}
    </section>
  );
}

export function AmazonShowcaseCard({
  product,
}: {
  product: AmazonShowcaseProduct;
}) {
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
      <a
        href={product.href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="bg-brand text-brand-foreground mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold hover:opacity-90"
      >
        Ver na Amazon
      </a>
    </article>
  );
}
