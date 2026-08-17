import { formatCurrency, formatDay } from "@/lib/format";

export interface PriceHistoryPoint {
  price: number;
  observedAt: Date;
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 24;

/**
 * Lightweight, dependency-free line chart rendered as inline SVG on the
 * server — no client JS shipped just to draw a price history line. Only
 * ever plots points that were actually observed (project brief section 10:
 * never fabricate history that wasn't collected).
 */
export function PriceHistoryChart({
  points,
  currency = "BRL",
}: {
  points: PriceHistoryPoint[];
  currency?: string;
}) {
  if (points.length < 2) {
    return (
      <div className="border-border-subtle text-foreground/50 flex h-[220px] items-center justify-center rounded-lg border border-dashed text-sm">
        Ainda não temos histórico suficiente para exibir um gráfico.
      </div>
    );
  }

  const sorted = [...points].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const prices = sorted.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const tMin = sorted[0].observedAt.getTime();
  const tMax = sorted[sorted.length - 1].observedAt.getTime();
  const tRange = tMax - tMin || 1;

  const usableWidth = WIDTH - PADDING * 2;
  const usableHeight = HEIGHT - PADDING * 2;

  const coords = sorted.map((p) => {
    const x =
      PADDING + ((p.observedAt.getTime() - tMin) / tRange) * usableWidth;
    const y = PADDING + usableHeight - ((p.price - min) / range) * usableHeight;
    return { x, y };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PADDING} L${coords[0].x.toFixed(1)},${HEIGHT - PADDING} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Histórico de preço"
      >
        <path d={areaPath} fill="var(--brand)" opacity="0.08" />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={i === coords.length - 1 ? 3.5 : 2}
            fill="var(--brand)"
          />
        ))}
      </svg>
      <div className="text-foreground/50 mt-2 flex justify-between text-xs">
        <span>{formatDay(sorted[0].observedAt)}</span>
        <span>{formatDay(sorted[sorted.length - 1].observedAt)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-foreground/50 text-xs">Mínimo</div>
          <div className="font-medium">{formatCurrency(min, currency)}</div>
        </div>
        <div>
          <div className="text-foreground/50 text-xs">Atual</div>
          <div className="font-medium">
            {formatCurrency(prices[prices.length - 1], currency)}
          </div>
        </div>
        <div>
          <div className="text-foreground/50 text-xs">Máximo</div>
          <div className="font-medium">{formatCurrency(max, currency)}</div>
        </div>
      </div>
    </div>
  );
}
