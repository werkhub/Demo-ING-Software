/**
 * Stunden-Helper — pure logic ohne DB-Zugriffe.
 *
 * ISO-8601-Wochenrechnung:
 *   - Woche beginnt Montag
 *   - KW 1 = Woche mit erstem Donnerstag des Jahres
 *   - Kalenderwochen 1..52 oder 1..53 je Jahr
 */

export const PLAUSI_MAX_HOURS_PER_DAY = 12;
export const STUNDEN_MIN_PER_DAY = 0;
export const STUNDEN_MAX_PER_DAY = 24;

export type IsoWeek = { jahr: number; kw: number };

/**
 * Liefert ISO-Jahr und ISO-Woche für ein Datum (Spec ISO 8601).
 * Vorsicht: ISO-Jahr ≠ Kalender-Jahr in Grenzwochen (z.B. 31.12.2024 = ISO-W01-2025).
 */
export function isoWeekFromDate(date: Date): IsoWeek {
  // Kopie, auf UTC-Mitternacht normalisieren
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // ISO: Donnerstag der Woche bestimmt das Jahr
  const dayNum = d.getUTCDay() || 7; // Mo=1..So=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { jahr: d.getUTCFullYear(), kw: week };
}

/** Liefert das Datum (Montag) der angegebenen ISO-Woche. */
export function mondayOfIsoWeek(jahr: number, kw: number): Date {
  // 4. Januar liegt immer in KW 1 → davon ausgehend rechnen
  const jan4 = new Date(Date.UTC(jahr, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  // Montag der KW 1
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  // gewünschte KW
  const target = new Date(week1Mon);
  target.setUTCDate(week1Mon.getUTCDate() + (kw - 1) * 7);
  return target;
}

/** Liefert die 7 ISO-Tage einer Woche als YYYY-MM-DD. */
export function daysOfIsoWeek(jahr: number, kw: number): string[] {
  const monday = mondayOfIsoWeek(jahr, kw);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** ISO-Date YYYY-MM-DD → ISO-Woche. */
export function isoWeekFromDateString(iso: string): IsoWeek {
  const [y, m, d] = iso.split("-").map(Number);
  return isoWeekFromDate(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Plausi-Schwelle pro Tag pro MA. >12h ist auffällig (MiLoG, ArbZG). */
export function isUnplausibleHours(hours: number): boolean {
  return hours > PLAUSI_MAX_HOURS_PER_DAY;
}

/** Wochen-Tag-Summe für eine MA: Map<isoDate, sumHours>. */
export function aggregateDaily<T extends { datum: string; stunden: number }>(
  rows: T[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.datum, (m.get(r.datum) ?? 0) + r.stunden);
  }
  return m;
}

/** LV-Position-Aggregation für Nachkalkulation: Map<lvPositionId, sumLohnCents>. */
export function aggregateByLvPosition<
  T extends {
    lvPositionId: string | null;
    stunden: number;
    stundensatzCents: number;
  },
>(rows: T[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!r.lvPositionId) continue;
    const lohnCents = Math.round(r.stunden * r.stundensatzCents);
    m.set(r.lvPositionId, (m.get(r.lvPositionId) ?? 0) + lohnCents);
  }
  return m;
}

export const LOHNART_LABEL: Record<"stunden" | "monat", string> = {
  stunden: "Stundenlohn",
  monat: "Monatsgehalt",
};

/**
 * Effektiver Stundensatz für einen MA — bei lohnart=monat aus Monatsgehalt
 * geteilt durch monats_soll_stunden hochgerechnet.
 */
export function effectiveStundensatzCents(ma: {
  lohnart: "stunden" | "monat";
  stundensatzCents: number;
  monatsgehaltCents: number | null;
  monatsSollStunden: number | null;
}): number {
  if (ma.lohnart === "monat") {
    if (
      ma.monatsgehaltCents &&
      ma.monatsSollStunden &&
      ma.monatsSollStunden > 0
    ) {
      return Math.round(ma.monatsgehaltCents / ma.monatsSollStunden);
    }
    return 0;
  }
  return ma.stundensatzCents;
}
