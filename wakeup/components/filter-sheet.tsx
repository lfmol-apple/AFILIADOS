"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Phones only: sort and store choices behind one button instead of two
 * chip rows that push the offers below the fold. The choices inside are
 * server-rendered links; picking one closes the sheet.
 */
export function FilterSheet({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPress = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="filter-sheet"
        onClick={() => setOpen((v) => !v)}
        className="glass flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
      >
        <span className="text-foreground/50 text-xs font-bold tracking-wide uppercase">
          Ordenar
        </span>
        <span className="max-w-[9.5rem] truncate">{summary}</span>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path
            d="m5 8 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          id="filter-sheet"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className="glass absolute top-full right-0 z-30 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-4 rounded-2xl p-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}
