"use client";

import { useState } from "react";
import Image from "next/image";

export interface FeedProduct {
  id: string;
  slotNumber: number;
  name: string;
  brand: string | null;
  imagePath: string;
  price: number | null;
  affiliateUrl: string | null;
}

type Placement = "feed" | "stories" | "reels";

function currency(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Owner's directive, 2026-11-26 ("Amplie a prévia mobile existente para
 * contemplar os 30 produtos"): a feed-style simulation of the real
 * Instagram/Facebook placements (Feed, Stories, Reels), scrollable
 * through every real campaign product, built only from the images
 * already on disk — never generated, recomposited or cropped as files;
 * a placement's aspect-ratio container simply clips the same image
 * visually (CSS object-cover), exactly the "mostre eventuais cortes...
 * não modifique nenhuma imagem" requirement. Every "Comprar agora" is a
 * REAL `<a href>` to the product's own pasted affiliateUrl — real
 * Mercado Livre destination, zero intermediate page, nothing fired to
 * the Pixel from this page (plain anchors only, no tracking code here).
 */
export function BlackFridayFeedSimulator({ products }: { products: FeedProduct[] }) {
  const [placement, setPlacement] = useState<Placement>("feed");

  return (
    <div>
      <div className="flex justify-center gap-2">
        {(["feed", "stories", "reels"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlacement(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
              placement === p ? "bg-brand text-brand-foreground" : "border-border-subtle border"
            }`}
          >
            {p === "feed" ? "Feed" : p === "stories" ? "Stories" : "Reels"}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-4 w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[6px] border-black bg-black shadow-xl">
        <div className="h-[640px] overflow-y-auto bg-white" style={placement !== "feed" ? { scrollSnapType: "y mandatory" } : undefined}>
          {placement === "feed" && (
            <div>
              {products.map((p) => (
                <FeedCard key={p.id} product={p} />
              ))}
              {products.length === 0 && <EmptyState />}
            </div>
          )}
          {placement !== "feed" && (
            <div>
              {products.map((p) => (
                <StoryCard key={p.id} product={p} reels={placement === "reels"} />
              ))}
              {products.length === 0 && <EmptyState />}
            </div>
          )}
        </div>
      </div>
      <p className="text-foreground/50 mt-2 text-center text-xs">
        {products.length} produto(s) — role para ver os demais. Toque em &quot;Comprar agora&quot; para abrir o
        destino real no Mercado Livre.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-foreground/50 p-6 text-center text-xs">
      Nenhum produto validado com criativo e link de afiliado ainda.
    </p>
  );
}

function BuyButton({ product, className }: { product: FeedProduct; className: string }) {
  if (!product.affiliateUrl) {
    return (
      <div className={`${className} bg-foreground/10 text-foreground/40 pointer-events-none`}>
        Link ainda não cadastrado
      </div>
    );
  }
  return (
    <a href={product.affiliateUrl} target="_blank" rel="noopener" className={className}>
      Comprar agora
    </a>
  );
}

function FeedCard({ product }: { product: FeedProduct }) {
  return (
    <div className="border-border-subtle border-b pb-2">
      <div className="flex items-center gap-2 p-2 text-xs">
        <div className="bg-brand h-7 w-7 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">precocaindo</p>
          <p className="text-foreground/50">Patrocinado</p>
        </div>
        <span className="text-foreground/40">•••</span>
      </div>
      <div className="relative aspect-[4/5] w-full bg-black/5">
        <Image src={product.imagePath} alt={product.name} fill sizes="320px" className="object-cover" />
      </div>
      <div className="flex gap-3 px-2 pt-2 text-lg">
        <span>♡</span>
        <span>💬</span>
        <span>↗</span>
        <span className="ml-auto">⌵</span>
      </div>
      <div className="space-y-1 px-2 pt-1 text-xs">
        <p>
          <span className="font-semibold">precocaindo</span>{" "}
          {product.name}
          {product.brand ? ` — ${product.brand}` : ""}
        </p>
        {product.price !== null && <p className="font-semibold">{currency(product.price)}</p>}
        <BuyButton product={product} className="bg-brand text-brand-foreground mt-1 block rounded py-1.5 text-center font-semibold" />
      </div>
    </div>
  );
}

function StoryCard({ product, reels }: { product: FeedProduct; reels: boolean }) {
  return (
    <div className="relative h-[640px] w-full bg-black" style={{ scrollSnapAlign: "start" }}>
      <Image src={product.imagePath} alt={product.name} fill sizes="320px" className="object-cover opacity-90" />
      {/* Owner's instruction: show the real crop a 9:16 placement forces on this
       * image — never edit the file, the aspect-ratio container + object-cover
       * above is doing 100% of the (purely visual) cropping. */}
      <div className="absolute inset-x-0 top-0 flex gap-1 p-2">
        <div className="h-0.5 flex-1 rounded bg-white/90" />
      </div>
      <div className="absolute top-4 left-2 flex items-center gap-2 text-xs text-white">
        <div className="h-6 w-6 rounded-full bg-white/80" />
        <span className="font-semibold">precocaindo</span>
        <span className="opacity-80">Patrocinado</span>
      </div>
      {reels && (
        <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 text-xl text-white">
          <span>♡</span>
          <span>💬</span>
          <span>↗</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
        <p className="text-sm font-semibold">
          {product.name}
          {product.brand ? ` — ${product.brand}` : ""}
        </p>
        {product.price !== null && <p className="text-sm">{currency(product.price)}</p>}
        <BuyButton product={product} className="mt-2 block rounded-full bg-white py-2 text-center text-sm font-semibold text-black" />
      </div>
    </div>
  );
}
