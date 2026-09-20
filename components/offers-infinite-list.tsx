"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UnifiedOfferCard as UnifiedOfferCardData } from "@/lib/queries/unified-offers";
import { UnifiedOfferCard } from "@/components/unified-offer-card";
import type { OfferSort, OfferStore } from "@/lib/offers/view";

interface FeedResponse {
  items: UnifiedOfferCardData[];
  page: number;
  hasMore: boolean;
}

function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="border-border-subtle bg-background animate-pulse overflow-hidden rounded-2xl border"
    >
      <div className="bg-surface-muted aspect-square w-full" />
      <div className="space-y-3 p-4">
        <div className="bg-surface-muted h-3 w-11/12 rounded" />
        <div className="bg-surface-muted h-3 w-2/3 rounded" />
        <div className="bg-surface-muted mt-4 h-6 w-1/2 rounded" />
        <div className="bg-surface-muted h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Appears after scrolling down and jumps back to the top — a long feed is
 * tiring to climb back out of, especially on a phone. */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 1200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="bg-brand text-brand-foreground fixed right-4 bottom-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold shadow-lg transition hover:opacity-90 sm:right-6 sm:bottom-6"
    >
      ↑
    </button>
  );
}

/**
 * Infinite-scroll grid for /ofertas. The first page is rendered by the
 * server (so it is indexable and fast); further pages are fetched from
 * /api/ofertas when the sentinel nears the viewport. A "Carregar mais"
 * button is always present as the fallback (keyboard users, IntersectionObserver
 * unavailable, failed request). The parent remounts this component (via
 * `key`) whenever category, sort or store changes.
 */
export function OffersInfiniteList({
  initialItems,
  initialHasMore,
  initialPage = 1,
  category,
  sort,
  store,
}: {
  initialItems: UnifiedOfferCardData[];
  initialHasMore: boolean;
  /** The server rendered this page of the feed (?pagina=N); loading continues from the next. */
  initialPage?: number;
  category: string | null;
  sort: OfferSort;
  store: OfferStore | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
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
      if (sort !== "relevancia") params.set("ordem", sort);
      if (store) params.set("loja", store);
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
  }, [page, category, sort, store]);

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
        Nenhuma oferta com esses filtros agora.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {items.map((item) => (
          <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
        ))}
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
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
            Você viu todas as ofertas com esses filtros por enquanto.
          </p>
        )}
      </div>

      <BackToTop />
    </div>
  );
}
