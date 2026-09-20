"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UnifiedOfferCard as UnifiedOfferCardData } from "@/lib/queries/unified-offers";
import { UnifiedOfferCard } from "@/components/unified-offer-card";

interface FeedResponse {
  items: UnifiedOfferCardData[];
  page: number;
  hasMore: boolean;
}

/**
 * Infinite-scroll grid for /ofertas. The first page is rendered by the
 * server (so it is indexable and fast); further pages are fetched from
 * /api/ofertas when the sentinel nears the viewport. A "Carregar mais"
 * button is always present as the fallback (keyboard users, IntersectionObserver
 * unavailable, failed request). The parent remounts this component (via
 * `key`) whenever the category changes.
 */
export function OffersInfiniteList({
  initialItems,
  initialHasMore,
  category,
}: {
  initialItems: UnifiedOfferCardData[];
  initialHasMore: boolean;
  category: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ page: String(page + 1) });
      if (category) params.set("categoria", category);
      const response = await fetch(`/api/ofertas?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as FeedResponse;
      setItems((current) => {
        const seen = new Set(current.map((i) => `${i.merchant}-${i.id}`));
        return [
          ...current,
          ...data.items.filter((i) => !seen.has(`${i.merchant}-${i.id}`)),
        ];
      });
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch {
      setFailed(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (
      !node ||
      !hasMore ||
      failed ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, failed, loadMore, items.length]);

  if (items.length === 0) {
    return (
      <p className="text-foreground/60 mt-2 text-sm">
        Nenhuma oferta nesta categoria agora.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {items.map((item) => (
          <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden className="h-px" />

      <div
        className="mt-8 flex flex-col items-center gap-3 text-sm"
        aria-live="polite"
      >
        {loading && (
          <p className="text-foreground/60">Carregando mais ofertas…</p>
        )}
        {failed && (
          <p className="text-foreground/70">
            Não foi possível carregar mais agora.
          </p>
        )}
        {hasMore && !loading && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="border-brand text-brand hover:bg-brand hover:text-brand-foreground min-h-11 rounded-full border-2 px-8 py-2 font-semibold transition"
          >
            {failed ? "Tentar de novo" : "Carregar mais"}
          </button>
        )}
        {!hasMore && (
          <p className="text-foreground/50">
            Você viu todas as ofertas{category ? " desta categoria" : ""} por
            enquanto.
          </p>
        )}
      </div>
    </div>
  );
}
