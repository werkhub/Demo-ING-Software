/**
 * KPI: Auslastung — gebuchte Stunden vs. Soll-Stunden im Quartal.
 *
 *   Auslastung = SUM(stunden) / (aktive Mitarbeiter × Werktage × 8h)
 *
 * Vereinfachung: 8h × Werktage (Mo–Fr) als Soll. Feiertage und
 * Teilzeit-/Monats-Modelle bleiben out-of-scope (für eine echte
 * Personalauslastung müsste `monatsSollStunden` berücksichtigt werden;
 * hier reicht die GF-Übersicht).
 *
 *   Trend           : Vorquartal.
 *   Sparkline       : 6 Quartale rückwärts.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { kpiKey, withCache } from "./cache";
import {
  isInRange,
  previousQuarter,
  quarterOf,
  quarterRange,
  workdaysInRange,
  type DateRange,
} from "./period";

export type StundenRow = { datum: string; stunden: number };

export type AuslastungResult = {
  /** Prozent (0..100+, kann Überlast > 100 ergeben). Null wenn keine Datenbasis. */
  value: number | null;
  /** Vorquartal. */
  previous: number | null;
  /** 6 Quartale (oldest → newest). */
  sparkline: Array<number | null>;
  /** Werktage im aktuellen Quartal. */
  workdays: number;
  /** Aktive Mitarbeiter (Snapshot — Stand „jetzt"). */
  activeMitarbeiter: number;
  /** Gebuchte Stunden im aktuellen Quartal. */
  bookedHours: number;
};

function bookedInRange(
  rows: ReadonlyArray<StundenRow>,
  range: DateRange
): number {
  let s = 0;
  for (const r of rows) {
    if (isInRange(r.datum, range)) s += r.stunden;
  }
  return s;
}

function quoteFor(
  rows: ReadonlyArray<StundenRow>,
  range: DateRange,
  activeMitarbeiter: number
): number | null {
  if (activeMitarbeiter <= 0) return null;
  const wd = workdaysInRange(range);
  if (wd <= 0) return null;
  const soll = activeMitarbeiter * wd * 8;
  if (soll <= 0) return null;
  const ist = bookedInRange(rows, range);
  return Math.round((ist / soll) * 1000) / 10;
}

export function computeAuslastung(
  stunden: ReadonlyArray<StundenRow>,
  activeMitarbeiter: number,
  now: Date = new Date()
): AuslastungResult {
  const cur = quarterOf(now);
  const curRange = quarterRange(cur.year, cur.quarter);
  const prev = previousQuarter(cur.year, cur.quarter);
  const prevRange = quarterRange(prev.year, prev.quarter);

  const value = quoteFor(stunden, curRange, activeMitarbeiter);
  const previous = quoteFor(stunden, prevRange, activeMitarbeiter);

  const buckets: Array<number | null> = [];
  let cursor = { year: cur.year, quarter: cur.quarter };
  for (let i = 0; i < 6; i++) {
    const r = quarterRange(cursor.year, cursor.quarter);
    buckets.push(quoteFor(stunden, r, activeMitarbeiter));
    cursor = previousQuarter(cursor.year, cursor.quarter);
  }
  const sparkline: Array<number | null> = [];
  for (let i = 5; i >= 0; i--) sparkline.push(buckets[i]!);

  return {
    value,
    previous,
    sparkline,
    workdays: workdaysInRange(curRange),
    activeMitarbeiter,
    bookedHours: bookedInRange(stunden, curRange),
  };
}

export async function getAuslastung(
  workspaceId: string
): Promise<AuslastungResult> {
  return withCache(kpiKey(workspaceId, "auslastung"), async () => {
    const [stundenRows, mitarbeiterRows] = await Promise.all([
      db
        .select({
          datum: schema.stunden.datum,
          stunden: schema.stunden.stunden,
        })
        .from(schema.stunden)
        .where(eq(schema.stunden.workspaceId, workspaceId)),
      db
        .select({ aktiv: schema.mitarbeiter.aktiv })
        .from(schema.mitarbeiter)
        .where(eq(schema.mitarbeiter.workspaceId, workspaceId)),
    ]);
    const active = mitarbeiterRows.filter((m) => m.aktiv).length;
    return computeAuslastung(stundenRows, active);
  });
}
