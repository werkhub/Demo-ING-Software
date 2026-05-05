/**
 * Perioden-Helfer für KPI-Berechnungen: Quartale, 90-Tage-Fenster,
 * Werktage. Pure, deterministisch, ohne externe Dependencies.
 */

export type DateRange = {
  /** YYYY-MM-DD inklusiv. */
  from: string;
  /** YYYY-MM-DD inklusiv. */
  to: string;
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function lastDayOfMonth(year: number, monthIdx0: number): number {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

/** Liefert das aktuelle Kalender-Quartal (1..4) für ein gegebenes Datum. */
export function quarterOf(date: Date): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const m = date.getMonth();
  const q = (Math.floor(m / 3) + 1) as 1 | 2 | 3 | 4;
  return { year: date.getFullYear(), quarter: q };
}

/** Range für ein Quartal als ISO-Date-Strings (inklusiv). */
export function quarterRange(year: number, quarter: 1 | 2 | 3 | 4): DateRange {
  const startMonth = (quarter - 1) * 3; // 0,3,6,9
  const endMonth = startMonth + 2;
  return {
    from: isoDate(year, startMonth + 1, 1),
    to: isoDate(year, endMonth + 1, lastDayOfMonth(year, endMonth)),
  };
}

/** Vorheriges Quartal zu (year, q). Q1 → Q4 des Vorjahrs. */
export function previousQuarter(
  year: number,
  quarter: 1 | 2 | 3 | 4
): { year: number; quarter: 1 | 2 | 3 | 4 } {
  if (quarter === 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: (quarter - 1) as 1 | 2 | 3 | 4 };
}

/**
 * 90-Tage-Fenster, das auf `endDate` endet (exklusiv: from = endDate − 90).
 * Nutzbar für „letzte 90 Tage" und das vorherige 90-Tage-Fenster.
 */
export function last90Days(endDate: Date): DateRange {
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  return {
    from: isoDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    to: isoDate(end.getFullYear(), end.getMonth() + 1, end.getDate()),
  };
}

/** 90-Tage-Fenster davor: [endDate − 180, endDate − 90]. */
export function previous90Days(endDate: Date): DateRange {
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const refMid = new Date(end);
  refMid.setDate(refMid.getDate() - 90);
  const start = new Date(refMid);
  start.setDate(start.getDate() - 90);
  return {
    from: isoDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    to: isoDate(refMid.getFullYear(), refMid.getMonth() + 1, refMid.getDate()),
  };
}

/**
 * Anzahl Werktage (Mo–Fr) im Range, inklusiv beider Grenzen. Zählt
 * gesetzliche Feiertage NICHT — als Default-Annahme akzeptiert (für
 * eine echte Auslastungsrechnung müsste ein Feiertagskalender ergänzt
 * werden, das ist hier bewusst out-of-scope).
 */
export function workdaysInRange(range: DateRange): number {
  const start = new Date(range.from + "T00:00:00");
  const end = new Date(range.to + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** YYYY-MM-DD im Range? Vergleich rein lexikografisch (ISO-Date-OK). */
export function isInRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to;
}
