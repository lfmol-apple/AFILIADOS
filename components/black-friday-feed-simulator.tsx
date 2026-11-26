"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  META_PLACEMENTS,
  assessCrop,
  type CropAssessment,
  type PlacementSpec,
} from "@/lib/media/crop-risk";
import type { ImageDimensions } from "@/lib/media/image-dimensions";

export interface FeedProduct {
  id: string;
  slotNumber: number;
  name: string;
  brand: string | null;
  imagePath: string;
  /** Real pixel dimensions of imagePath, read server-side — see
   * lib/media/image-dimensions.ts. Null only if the file couldn't be
   * read; the UI falls back to a 4:5 box rather than guessing. */
  imageWidth: number | null;
  imageHeight: number | null;
  price: number | null;
  affiliateUrl: string | null;
}

type Mode = "integral" | "meta";

function currency(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dimensionsOf(product: FeedProduct): ImageDimensions | null {
  if (product.imageWidth === null || product.imageHeight === null) return null;
  return { width: product.imageWidth, height: product.imageHeight };
}

/**
 * Owner's directive, 2026-11-26 ("Amplie a prévia mobile..."), revised
 * 2026-11-26 ("o simulador no computador está cortando as laterais dos
 * criativos — corrija... beneficiando simultaneamente as duas
 * campanhas"): shared by both /admin/black-friday-2026/preview and
 * /admin/black-friday-fim-do-mundo/preview. Two explicit modes:
 *
 * - "Criativo integral": object-contain against the creative's own
 *   real aspect ratio (read from the file server-side) — nothing is
 *   ever cropped, nothing can disappear.
 * - "Simulação Meta": the real Feed/Stories/Reels placements
 *   (1:1, 4:5, 9:16) with the same object-cover crop those surfaces
 *   actually apply, plus a crop-risk badge computed from the image's
 *   real aspect ratio vs. the placement's — a geometry signal, not a
 *   claim about where text/logo sit in the frame.
 *
 * Still built only from the images already on disk — never generated,
 * recomposited or cropped as files; every "Comprar agora" is a REAL
 * `<a href>` to the product's own pasted affiliateUrl, no tracking
 * fired from this page.
 */
export function BlackFridayFeedSimulator({ products }: { products: FeedProduct[] }) {
  const [mode, setMode] = useState<Mode>("integral");
  const [placementId, setPlacementId] = useState<PlacementSpec["id"]>("feed_4_5");
  const placement = META_PLACEMENTS.find((p) => p.id === placementId)!;

  const riskReport = useMemo(() => {
    const rows: { product: FeedProduct; assessments: CropAssessment[] }[] = [];
    for (const product of products) {
      const dims = dimensionsOf(product);
      if (!dims) continue;
      const assessments = META_PLACEMENTS.map((p) => assessCrop(dims, p)).filter((a) => a.risk);
      if (assessments.length > 0) rows.push({ product, assessments });
    }
    return rows;
  }, [products]);

  return (
    <div>
      <div className="flex justify-center gap-2">
        {(["integral", "meta"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              mode === m ? "bg-brand text-brand-foreground" : "border-border-subtle border"
            }`}
          >
            {m === "integral" ? "Criativo integral" : "Simulação Meta"}
          </button>
        ))}
      </div>

      {mode === "meta" && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {META_PLACEMENTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlacementId(p.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                placementId === p.id ? "bg-foreground text-background" : "border-border-subtle border"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto mt-4 w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[6px] border-black bg-black shadow-xl">
        <div className="h-[640px] overflow-y-auto bg-white" style={mode === "meta" && placement.id !== "feed_1_1" && placement.id !== "feed_4_5" ? { scrollSnapType: "y mandatory" } : undefined}>
          {mode === "integral" &&
            (products.length === 0 ? (
              <EmptyState />
            ) : (
              products.map((p) => <IntegralCard key={p.id} product={p} />)
            ))}
          {mode === "meta" &&
            (products.length === 0 ? (
              <EmptyState />
            ) : placement.id === "feed_1_1" || placement.id === "feed_4_5" ? (
              products.map((p) => <FeedCard key={p.id} product={p} placement={placement} />)
            ) : (
              products.map((p) => (
                <StoryCard key={p.id} product={p} placement={placement} reels={placement.id === "reels"} />
              ))
            ))}
        </div>
      </div>
      <p className="text-foreground/50 mt-2 text-center text-xs">
        {products.length} produto(s) — role para ver os demais. Toque em &quot;Comprar agora&quot; para abrir o
        destino real no Mercado Livre.
      </p>

      <CropRiskReport rows={riskReport} />
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

/** No crop, ever: the container's aspect-ratio is the creative's own
 * real width/height, and the image uses object-contain inside it — the
 * full frame (text, price, logo included) is always visible. */
function IntegralCard({ product }: { product: FeedProduct }) {
  const dims = dimensionsOf(product);
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
      <div
        className="relative mx-auto w-full bg-black/5"
        style={{ aspectRatio: dims ? `${dims.width} / ${dims.height}` : "4 / 5" }}
      >
        <Image src={product.imagePath} alt={product.name} fill sizes="320px" className="object-contain" />
      </div>
      <div className="space-y-1 px-2 pt-1 text-xs">
        <p>
          <span className="font-semibold">precocaindo</span> {product.name}
          {product.brand ? ` — ${product.brand}` : ""}
        </p>
        {product.price !== null && <p className="font-semibold">{currency(product.price)}</p>}
        {dims && (
          <p className="text-foreground/40">
            Proporção real do criativo: {dims.width}×{dims.height}px
          </p>
        )}
        <BuyButton product={product} className="bg-brand text-brand-foreground mt-1 block rounded py-1.5 text-center font-semibold" />
      </div>
    </div>
  );
}

function RiskBadge({ dims, placement }: { dims: ImageDimensions | null; placement: PlacementSpec }) {
  if (!dims) return null;
  const assessment = assessCrop(dims, placement);
  if (!assessment.risk) return null;
  return (
    <span className="absolute top-2 right-2 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
      ⚠ risco de corte (~{Math.round(assessment.cutFraction * 100)}%)
    </span>
  );
}

function FeedCard({ product, placement }: { product: FeedProduct; placement: PlacementSpec }) {
  const dims = dimensionsOf(product);
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
      <div className="relative w-full bg-black/5" style={{ aspectRatio: `${placement.ratio}` }}>
        <Image src={product.imagePath} alt={product.name} fill sizes="320px" className="object-cover" />
        <RiskBadge dims={dims} placement={placement} />
      </div>
      <div className="flex gap-3 px-2 pt-2 text-lg">
        <span>♡</span>
        <span>💬</span>
        <span>↗</span>
        <span className="ml-auto">⌵</span>
      </div>
      <div className="space-y-1 px-2 pt-1 text-xs">
        <p>
          <span className="font-semibold">precocaindo</span> {product.name}
          {product.brand ? ` — ${product.brand}` : ""}
        </p>
        {product.price !== null && <p className="font-semibold">{currency(product.price)}</p>}
        <BuyButton product={product} className="bg-brand text-brand-foreground mt-1 block rounded py-1.5 text-center font-semibold" />
      </div>
    </div>
  );
}

function StoryCard({
  product,
  placement,
  reels,
}: {
  product: FeedProduct;
  placement: PlacementSpec;
  reels: boolean;
}) {
  const dims = dimensionsOf(product);
  return (
    <div className="relative h-[640px] w-full bg-black" style={{ scrollSnapAlign: "start" }}>
      <Image src={product.imagePath} alt={product.name} fill sizes="320px" className="object-cover opacity-90" />
      <RiskBadge dims={dims} placement={placement} />
      {/* Owner's instruction: show the real crop a 9:16 placement forces on this
       * image — never edit the file, the container + object-cover above is
       * doing 100% of the (purely visual) cropping. */}
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

/** Owner's directive, item 8: "Identifique quais dos 45 criativos
 * apresentam risco de corte na Meta e em quais posicionamentos." A
 * geometry report, not a visual claim — it only says the aspect ratio
 * mismatch is large enough (see RISK_THRESHOLD in lib/media/crop-risk)
 * to plausibly cut real content; final judgment is the owner's. */
function CropRiskReport({ rows }: { rows: { product: FeedProduct; assessments: CropAssessment[] }[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-foreground/50 mt-4 text-center text-xs">
        Nenhum criativo com risco de corte acima do limite (10%) nos posicionamentos avaliados.
      </p>
    );
  }
  return (
    <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-3">
      <h3 className="text-sm font-semibold text-amber-900">
        Criativos com risco de corte na Meta ({rows.length})
      </h3>
      <ul className="mt-2 space-y-1 text-xs text-amber-900">
        {rows.map(({ product, assessments }) => (
          <li key={product.id}>
            <span className="font-semibold">
              {String(product.slotNumber).padStart(2, "0")}. {product.name}
            </span>{" "}
            —{" "}
            {assessments
              .map((a) => `${a.placement.label} (~${Math.round(a.cutFraction * 100)}%)`)
              .join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
