"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The scrollable list of category links. The links themselves are rendered on
 * the server (plain <a>, work without JS); this only brings the active one
 * into view when the page loads or the category changes — otherwise picking
 * "Brinquedos" leaves it off-screen at the far end of the list. It scrolls
 * the list, never the page.
 */
export function CategoryScroller({
  activeKey,
  className,
  children,
}: {
  activeKey: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = ref.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !item) return;
    if (list.scrollWidth > list.clientWidth + 1) {
      list.scrollTo({
        left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2,
      });
    } else if (list.scrollHeight > list.clientHeight + 1) {
      list.scrollTo({
        top: item.offsetTop - (list.clientHeight - item.offsetHeight) / 2,
      });
    }
  }, [activeKey]);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
