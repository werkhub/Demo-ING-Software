/**
 * KPI: Forderungslaufzeit — durchschnittliche Tage zwischen
 * Rechnungsdatum (`invoiceDate`) und Zahlungseingang (`paidAt`) für
 * Ausgangsrechnungen, die im jeweiligen Fenster vollständig bezahlt
 * wurden.
 *
 *   Aktueller Wert  : letzte 90 Tage (Stichtag-Bezug auf paidAt).
 *   Vergleichswert  : davorliegendes 90-Tage-Fenster.
 *   Sparkline       : pro Monat (letzte 6 Monate) gemittelt.
 *
 * Formel: round(avg(paidAt − invoiceDate)) in ganzen Tagen.
 */
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { kpiKey, withCache } from "./cache";
import {
  isInRange,
  last90Days,
  previous90Days,
  type DateRange,
} from "./period";

export type PaidArRow = {
  invoiceDate: string;
  /** Date oder ISO-String — wir akzeptieren beides. */
  paidAt: Date | string;
};

export type ForderungslaufzeitResult = {
  /** Tage. Null wenn im Fenster keine bezahlten ARs liegen. */
  value: number | null;
  /** Vorperiode (gleiches Fenster davor), null wenn leer. */
  previous: number | null;
  /** 6 Punkte Mo-DSO (oldest → newest). */
  sparkline: Array<number | null>;
  /** Anzahl Datenpunkte im aktuellen Fenster. */
  sampleSize: number;
};

function paidAtIso(p: PaidArRow["paidAt"]): string | null {
  const d = p instanceof Date ? p : new Date(p);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function diffInDays(fromIso: string, toIso: string): number | null {
  const a = new Date(fromIso + "T00:00:00");
  const b = new Date(toIso + "T00:00:00");
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function avgDsoInRange(
  rows: ReadonlyArray<PaidArRow>,
  range: DateRange
): { avg: number | null; n: number } {
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const paid = paidAtIso(r.paidAt);
    if (!paid || !isInRange(paid, range)) continue;
    const d = diffInDays(r.invoiceDate, paid);
    if (d === null || d < 0) continue;
    sum += d;
    n++;
  }
  if (n === 0) return { avg: null, n: 0 };
  return { avg: Math.round(sum / n), n };
}

function monthRange(year: number, monthIdx0: number): DateRange {
  const last = new Date(year, monthIdx0 + 1, 0).getDate();
  const m = (monthIdx0 + 1).toString().padStart(2, "0");
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${last.toString().padStart(2, "0")}`,
  };
}

export function computeForderungslaufzeit(
  rows: ReadonlyArray<PaidArRow>,
  now: Date = new Date()
): ForderungslaufzeitResult {
  const current = avgDsoInRange(rows, last90Days(now));
  const prev = avgDsoInRange(rows, previous90Days(now));

  const sparkline: Array<number | null> = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    sparkline.push(avgDsoInRange(rows, monthRange(ref.getFullYear(), ref.getMonth())).avg);
  }

  return {
    value: current.avg,
    previous: prev.avg,
    sparkline,
    sampleSize: current.n,
  };
}

export async function getForderungslaufzeit(
  workspaceId: string
): Promise<ForderungslaufzeitResult> {
  return withCache(kpiKey(workspaceId, "forderungslaufzeit"), async () => {
    const rows = await db
      .select({
        invoiceDate: schema.ausgangsrechnungen.invoiceDate,
        paidAt: schema.ausgangsrechnungen.paidAt,
      })
      .from(schema.ausgangsrechnungen)
      .where(
        and(
          eq(schema.ausgangsrechnungen.workspaceId, workspaceId),
          isNotNull(schema.ausgangsrechnungen.paidAt)
        )
      );
    const filtered: PaidArRow[] = [];
    for (const r of rows) {
      if (!r.paidAt || !r.invoiceDate) continue;
      filtered.push({ invoiceDate: r.invoiceDate, paidAt: r.paidAt });
    }
    return computeForderungslaufzeit(filtered);
  });
}
