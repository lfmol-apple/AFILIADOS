import type {
  DailyMerchantClicks,
  DailyPageviews,
} from "@/lib/queries/performance-dashboard";

/** Dependency-free inline SVG charts for /admin/desempenho — this app has
 * no charting library (package.json only depends on prisma/next/react/zod)
 * and these two shapes (grouped daily bars, one daily line) don't justify
 * adding one. Pure server-rendered SVG, no client JS needed: hover tooltips
 * use native <title>, which works without hydration. */

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function shortDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const COLOR_ML = "#2a78d6";
const COLOR_SHOPEE = "#eb6834";

/** Zero-fills every day in [minDay, maxDay] so a quiet day reads as zero,
 * not as a gap in the axis. */
function buildContinuousSeries(
  rows: DailyMerchantClicks[],
): { day: string; ml: number; shopee: number }[] {
  if (rows.length === 0) return [];
  const days = rows.map((r) => r.day).sort();
  const start = new Date(days[0] + "T00:00:00");
  const end = new Date(days[days.length - 1] + "T00:00:00");
  const mlMap = new Map(
    rows
      .filter((r) => r.merchant === "MERCADO_LIVRE")
      .map((r) => [r.day, r.clicks]),
  );
  const shopeeMap = new Map(
    rows.filter((r) => r.merchant === "SHOPEE").map((r) => [r.day, r.clicks]),
  );

  const out: { day: string; ml: number; shopee: number }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({
      day: key,
      ml: mlMap.get(key) ?? 0,
      shopee: shopeeMap.get(key) ?? 0,
    });
  }
  return out;
}

export function DailyClicksBarChart({ data }: { data: DailyMerchantClicks[] }) {
  const series = buildContinuousSeries(data);
  if (series.length === 0) {
    return (
      <p className="text-foreground/50 text-sm">Sem cliques no período.</p>
    );
  }

  const W = 720;
  const H = 220;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = series.length;
  const maxV = niceMax(Math.max(...series.map((d) => d.ml + d.shopee)));
  const groupW = plotW / n;
  const barW = Math.min(26, groupW * 0.42);
  const gap = 4;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padT + plotH - (plotH * i) / 4;
          const val = Math.round((maxV * i) / 4);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={i === 0 ? "#c3c2b7" : "#e1e0d9"}
                strokeWidth={1}
              />
              <text x={4} y={y + 3} fontSize={9} fill="#898781">
                {val}
              </text>
            </g>
          );
        })}
        {series.map((d, i) => {
          const gx = padL + groupW * i + groupW / 2;
          const mlH = (d.ml / maxV) * plotH;
          const shH = (d.shopee / maxV) * plotH;
          const x1 = gx - barW - gap / 2;
          const x2 = gx + gap / 2;
          return (
            <g key={d.day}>
              <rect
                x={x1}
                y={padT + plotH - mlH}
                width={barW}
                height={Math.max(mlH, 0)}
                rx={2}
                fill={COLOR_ML}
              >
                <title>{`${d.day} — Mercado Livre: ${d.ml}`}</title>
              </rect>
              <rect
                x={x2}
                y={padT + plotH - shH}
                width={barW}
                height={Math.max(shH, 0)}
                rx={2}
                fill={COLOR_SHOPEE}
              >
                <title>{`${d.day} — Shopee: ${d.shopee}`}</title>
              </rect>
              <text
                x={gx}
                y={H - 8}
                fontSize={9}
                fill="#898781"
                textAnchor="middle"
              >
                {shortDay(d.day)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-foreground/60 mt-2 flex gap-4 text-xs">
        <span>
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
            style={{ background: COLOR_ML }}
          />
          Mercado Livre
        </span>
        <span>
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
            style={{ background: COLOR_SHOPEE }}
          />
          Shopee
        </span>
      </div>
    </div>
  );
}

export function DailyPageviewsLineChart({ data }: { data: DailyPageviews[] }) {
  if (data.length === 0) {
    return (
      <p className="text-foreground/50 text-sm">Sem pageviews no período.</p>
    );
  }

  const W = 720;
  const H = 160;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = data.length;
  const maxV = niceMax(Math.max(...data.map((d) => d.pageviews)));
  const stepX = plotW / (n - 1 || 1);

  const points = data.map((d, i) => ({
    x: padL + stepX * i,
    y: padT + plotH - (d.pageviews / maxV) * plotH,
    d,
  }));
  const path = "M " + points.map((p) => `${p.x},${p.y}`).join(" L ");
  const labelEvery = Math.ceil(n / 8);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]">
        {[0, 1, 2, 3].map((i) => {
          const y = padT + plotH - (plotH * i) / 3;
          const val = Math.round((maxV * i) / 3);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={i === 0 ? "#c3c2b7" : "#e1e0d9"}
                strokeWidth={1}
              />
              <text x={4} y={y + 3} fontSize={9} fill="#898781">
                {val}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke={COLOR_ML} strokeWidth={2} />
        {points.map((p, i) => (
          <g key={p.d.day}>
            <circle cx={p.x} cy={p.y} r={2.5} fill={COLOR_ML}>
              <title>{`${p.d.day} — ${p.d.pageviews} pageviews`}</title>
            </circle>
            {(i % labelEvery === 0 || i === n - 1) && (
              <text
                x={p.x}
                y={H - 4}
                fontSize={9}
                fill="#898781"
                textAnchor="middle"
              >
                {shortDay(p.d.day)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
