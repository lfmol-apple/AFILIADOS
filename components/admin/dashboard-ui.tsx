/** Shared presentational primitives for /admin and /admin/desempenho —
 * extracted from app/admin/page.tsx once a second page needed the exact
 * same look (stat cards, grouped sections). No data logic here. */

export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="text-foreground/50 text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {helper && (
        <div className="text-foreground/50 mt-2 text-xs leading-snug">
          {helper}
        </div>
      )}
    </div>
  );
}

export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** Top-level grouping used to organize a dashboard into scannable areas —
 * presentation only, no data changes. */
export function DashboardGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border-subtle mt-12 border-t pt-8 first:mt-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="text-foreground/50 mt-1 text-sm">{description}</p>
      )}
      <div className="mt-5 space-y-8">{children}</div>
    </section>
  );
}

export function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-foreground/70 text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
