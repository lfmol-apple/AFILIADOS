"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface CategorySheetItem {
  key: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
  dot: string;
}

/**
 * Phones only: a button at the start of the category bar that opens every
 * category as a two-column grid, for people who would rather see them all
 * than swipe. The links are real links; picking one closes the sheet.
 */
export function CategorySheet({ items }: { items: CategorySheetItem[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Closes on Escape or a press outside. (No full-screen overlay: the glass
  // bar this sits in would become its containing block.)
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
    <div ref={box} className="contents lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="category-sheet"
        aria-label="Ver todas as categorias"
        onClick={() => setOpen((v) => !v)}
        className="border-border-subtle bg-background/70 hover:border-brand/50 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border lg:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
          <rect
            x="3"
            y="3"
            width="5.5"
            height="5.5"
            rx="1.4"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="11.5"
            y="3"
            width="5.5"
            height="5.5"
            rx="1.4"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="3"
            y="11.5"
            width="5.5"
            height="5.5"
            rx="1.4"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="11.5"
            y="11.5"
            width="5.5"
            height="5.5"
            rx="1.4"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </button>
      {open && (
        <div
          id="category-sheet"
          className="border-border-subtle bg-background absolute inset-x-3 top-full z-30 mt-2 max-h-[70dvh] overflow-y-auto rounded-2xl border p-2 shadow-xl"
        >
          <ul className="grid grid-cols-2 gap-1">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  scroll={false}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm ${
                    item.active
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "hover:bg-foreground/5"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${item.active ? "bg-brand-foreground" : item.dot}`}
                  />
                  <span className="min-w-0 flex-1 leading-tight">
                    {item.label}
                  </span>
                  <span className="text-xs tabular-nums opacity-60">
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
