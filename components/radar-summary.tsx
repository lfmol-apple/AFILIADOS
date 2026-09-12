import type { RadarFeedItem } from "@/lib/queries/radar-events";
import type { RadarEventType } from "@/lib/services/radar";

/**
 * Radar on the Home page, take 3 (Acquisition Engine V1 Home rewrite) —
 * even the compact ticker-style list from take 2 ended up repeating the
 * same product title next to a raw-ish "posição #1" line, event by event
 * (project brief: "não mostrar uma lista como 'Electrolux filtro — posição
 * #1'... isso é informação da máquina, não necessariamente valor para o
 * consumidor"). This is a further compaction: a handful of translated,
 * counted categories ("3 preços caíram recentemente"), never a per-product
 * list, never a raw enum name, never AffiliateLinkRegistry/MonetizationScore.
 * No CTA here — this block is "what's happening", /ofertas and the vitrine
 * above it are "here's the offer".
 */

type RadarSummaryCategory = "PRICE_DROP" | "DEMAND" | "QUALITY";

const CATEGORY_BY_EVENT_TYPE: Record<RadarEventType, RadarSummaryCategory | null> = {
  PRICE_DROP: "PRICE_DROP",
  BESTSELLER_ENTRY: "DEMAND",
  TREND_ENTRY: "DEMAND",
  HIGH_QUALITY_OFFER: "QUALITY",
  // Internal/business fact, never a consumer-facing signal — same rule
  // lib/queries/radar-events.ts's PUBLIC_EVENT_TYPES already enforces.
  AFFILIATE_LINK_ACTIVATED: null,
};

const CATEGORY_ORDER: RadarSummaryCategory[] = ["PRICE_DROP", "DEMAND", "QUALITY"];

const CATEGORY_META: Record<RadarSummaryCategory, { icon: string; label: (count: number) => string }> = {
  PRICE_DROP: {
    icon: "🔥",
    label: (n) => `${n} preço${n === 1 ? "" : "s"} ca${n === 1 ? "iu" : "íram"} recentemente`,
  },
  DEMAND: {
    icon: "🏆",
    label: (n) => `${n} produto${n === 1 ? "" : "s"} ganhando demanda`,
  },
  QUALITY: {
    icon: "⭐",
    label: (n) => `${n} nova${n === 1 ? "" : "s"} boa${n === 1 ? "" : "s"} oportunidade${n === 1 ? "" : "s"}`,
  },
};

export interface RadarSummaryEntry {
  category: RadarSummaryCategory;
  icon: string;
  count: number;
  label: string;
}

/** Pure aggregation, exported for testing — counts real events per
 * translated category, never fabricates a category with count 0. */
export function summarizeRadarEvents(items: RadarFeedItem[]): RadarSummaryEntry[] {
  const counts: Partial<Record<RadarSummaryCategory, number>> = {};
  for (const item of items) {
    const category = CATEGORY_BY_EVENT_TYPE[item.event.type];
    if (!category) continue;
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return CATEGORY_ORDER.filter((category) => (counts[category] ?? 0) > 0).map((category) => ({
    category,
    icon: CATEGORY_META[category].icon,
    count: counts[category]!,
    label: CATEGORY_META[category].label(counts[category]!),
  }));
}

export function RadarSummary({ items }: { items: RadarFeedItem[] }) {
  const entries = summarizeRadarEvents(items);
  if (entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="text-foreground/70 text-sm font-semibold tracking-wide uppercase">
        Acontecendo agora
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.category} className="flex items-center gap-1.5">
            <span aria-hidden>{entry.icon}</span>
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
