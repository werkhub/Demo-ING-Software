/**
 * KPI: Mängelquote — Mängel pro Abnahme im aktuellen Quartal.
 *
 *   Quote = COUNT(maengel WHERE phase='abnahme' UND zugehörig zu Abnahme
 *                 im Quartal)
 *           / COUNT(Abnahmen im Quartal)
 *
 * „Im Quartal" = `abnahmen.abnahmeDate` liegt im Range. Mängel werden
 * über ihre `abnahmeId` zugeordnet (nicht über eigene Datums-Felder),
 * damit Nacherfassungen von Mängeln das Quartal nicht verfälschen.
 *
 *   Trend           : Vorquartal.
 *   Sparkline       : 6 Quartale rückwärts.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { kpiKey, withCache } from "./cache";
import {
  isInRange,
  previousQuarter,
  quarterOf,
  quarterRange,
} from "./period";

export type AbnahmeRow = { id: string; abnahmeDate: string };
export type MangelRow = { abnahmeId: string };

export type MaengelquoteResult = {
  /** Mängel pro Abnahme. Null wenn im aktuellen Quartal keine Abnahme. */
  value: number | null;
  /** Vorquartal. */
  previous: number | null;
  /** 6 Quartale (oldest → newest). */
  sparkline: Array<number | null>;
  /** Anzahl Abnahmen im aktuellen Quartal. */
  abnahmenCount: number;
  /** Anzahl Mängel im aktuellen Quartal. */
  maengelCount: number;
};

function quoteForQuarter(
  abnahmen: ReadonlyArray<AbnahmeRow>,
  maengel: ReadonlyArray<MangelRow>,
  range: { from: string; to: string }
): { quote: number | null; abnahmen: number; maengel: number } {
  const inQ = abnahmen.filter((a) => isInRange(a.abnahmeDate, range));
  if (inQ.length === 0) {
    return { quote: null, abnahmen: 0, maengel: 0 };
  }
  const ids = new Set(inQ.map((a) => a.id));
  const m = maengel.filter((x) => ids.has(x.abnahmeId)).length;
  return {
    quote: Math.round((m / inQ.length) * 100) / 100,
    abnahmen: inQ.length,
    maengel: m,
  };
}

export function computeMaengelquote(
  abnahmen: ReadonlyArray<AbnahmeRow>,
  maengel: ReadonlyArray<MangelRow>,
  now: Date = new Date()
): MaengelquoteResult {
  const cur = quarterOf(now);
  const curRange = quarterRange(cur.year, cur.quarter);
  const prev = previousQuarter(cur.year, cur.quarter);
  const prevRange = quarterRange(prev.year, prev.quarter);

  const current = quoteForQuarter(abnahmen, maengel, curRange);
  const previousVal = quoteForQuarter(abnahmen, maengel, prevRange);

  const sparkline: Array<number | null> = [];
  let cursor = { year: cur.year, quarter: cur.quarter };
  const buckets: Array<number | null> = [];
  for (let i = 0; i < 6; i++) {
    const r = quarterRange(cursor.year, cursor.quarter);
    buckets.push(quoteForQuarter(abnahmen, maengel, r).quote);
    cursor = previousQuarter(cursor.year, cursor.quarter);
  }
  // oldest → newest
  for (let i = 5; i >= 0; i--) sparkline.push(buckets[i]!);

  return {
    value: current.quote,
    previous: previousVal.quote,
    sparkline,
    abnahmenCount: current.abnahmen,
    maengelCount: current.maengel,
  };
}

export async function getMaengelquote(
  workspaceId: string
): Promise<MaengelquoteResult> {
  return withCache(kpiKey(workspaceId, "maengelquote"), async () => {
    const [abnahmen, maengel] = await Promise.all([
      db
        .select({
          id: schema.abnahmen.id,
          abnahmeDate: schema.abnahmen.abnahmeDate,
        })
        .from(schema.abnahmen)
        .where(eq(schema.abnahmen.workspaceId, workspaceId)),
      db
        .select({ abnahmeId: schema.maengel.abnahmeId })
        .from(schema.maengel)
        .where(
          and(
            eq(schema.maengel.workspaceId, workspaceId),
            eq(schema.maengel.phase, "abnahme")
          )
        ),
    ]);
    const filteredMaengel: MangelRow[] = [];
    for (const m of maengel) {
      if (m.abnahmeId) filteredMaengel.push({ abnahmeId: m.abnahmeId });
    }
    return computeMaengelquote(abnahmen, filteredMaengel);
  });
}
