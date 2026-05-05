/**
 * Formatierer für KPI-Werte (de-DE).
 */

export function formatEur(amount: number, withCents = false): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: withCents ? 2 : 0,
    minimumFractionDigits: withCents ? 2 : 0,
  }).format(amount);
}

export function formatDays(days: number): string {
  const rounded = Math.round(days * 10) / 10;
  return `${rounded.toString().replace(".", ",")} Tage`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(Math.round(value * Math.pow(10, fractionDigits)) / Math.pow(10, fractionDigits))
    .toString()
    .replace(".", ",")} %`;
}

/**
 * Trend-Vergleich. Liefert prozentuale Veränderung previous → current.
 * Bei previous=0 oder current=null/previous=null → null.
 */
export function trendPercent(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
