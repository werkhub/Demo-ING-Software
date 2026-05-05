import { Sparkline } from "./Sparkline";

/**
 * KPI-Tile mit Wert, optionalem Trend (Δ%) und optionaler Sparkline.
 * Bei value === null wird ein Placeholder gezeigt („noch nicht verfügbar").
 */
export type TrendDirection = "up" | "down" | "flat";
export type TrendIntent = "good" | "bad" | "neutral";

type Props = {
  label: string;
  value: string | null;
  hint?: string;
  /** Prozentuale Veränderung gegenüber Vorperiode (positiv = nach oben). */
  trendPercent?: number | null;
  /** Bewertung der Richtung — bei manchen KPIs ist „nach oben" gut (Auslastung),
   *  bei anderen schlecht (Mängelquote, Forderungslaufzeit). */
  trendIntentForUp?: TrendIntent;
  trendLabel?: string;
  sparkline?: ReadonlyArray<number | null>;
  /** Detail-Link (optional). */
  href?: string;
};

function trendTone(
  pct: number | null | undefined,
  intentForUp: TrendIntent | undefined
): { tone: string; arrow: string } {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return { tone: "text-[color:var(--color-fg-muted)]", arrow: "·" };
  }
  const eps = 0.5;
  if (Math.abs(pct) < eps) {
    return { tone: "text-[color:var(--color-fg-muted)]", arrow: "→" };
  }
  const isUp = pct > 0;
  const arrow = isUp ? "↑" : "↓";
  if (!intentForUp || intentForUp === "neutral") {
    return { tone: "text-[color:var(--color-fg-muted)]", arrow };
  }
  const goodIfUp = intentForUp === "good";
  const isGood = isUp === goodIfUp;
  return {
    tone: isGood
      ? "text-[color:var(--color-success,var(--color-accent))]"
      : "text-[color:var(--color-warning)]",
    arrow,
  };
}

function formatTrend(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return "—";
  const rounded = Math.round(pct * 10) / 10;
  const s = rounded.toString().replace(".", ",");
  return rounded > 0 ? `+${s} %` : `${s} %`;
}

export function KpiCard({
  label,
  value,
  hint,
  trendPercent,
  trendIntentForUp,
  trendLabel,
  sparkline,
  href,
}: Props) {
  const trend = trendTone(trendPercent, trendIntentForUp);
  const isUnavailable = value === null;

  const inner = (
    <div className="bg-[color:var(--color-bg)] p-6 h-full flex flex-col">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      {isUnavailable ? (
        <p className="mt-3 text-xl font-medium tracking-tight text-[color:var(--color-fg-muted)]">
          noch nicht verfügbar
        </p>
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--color-fg)]">
          {value}
        </p>
      )}
      {hint ? (
        <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
          {hint}
        </p>
      ) : null}
      {!isUnavailable &&
      (trendPercent !== undefined || sparkline !== undefined) ? (
        <div className="mt-auto pt-5 flex items-end justify-between gap-3">
          {trendPercent !== undefined ? (
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${trend.tone}`}>
                <span aria-hidden>{trend.arrow}</span> {formatTrend(trendPercent)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-0.5">
                {trendLabel ?? "vs. Vorperiode"}
              </span>
            </div>
          ) : (
            <span />
          )}
          {sparkline && sparkline.length > 0 ? (
            <Sparkline
              data={sparkline}
              className={trend.tone}
              width={96}
              height={28}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (href && !isUnavailable) {
    return (
      <a
        href={href}
        className="block hover:bg-[color:var(--color-bg-subtle)] transition-colors"
      >
        {inner}
      </a>
    );
  }
  return inner;
}
