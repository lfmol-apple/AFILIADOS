import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-foreground/50 min-w-0 text-xs">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex max-w-full min-w-0 items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-brand min-w-0 [overflow-wrap:anywhere] break-words"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground/70 min-w-0 [overflow-wrap:anywhere] break-words">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
