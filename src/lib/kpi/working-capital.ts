/**
 * KPI: Working Capital — offene Forderungen abzüglich offener
 * Verbindlichkeiten aus Eingangsrechnungen.
 *
 *   Forderungen offen  = SUM(ausgangsrechnungen.payoutGross) für AR-Status,
 *                        die noch nicht "bezahlt" und nicht reiner "entwurf"
 *                        sind (versendet, teilw. bezahlt, mahnung_*, gerichtlich).
 *   Verbindlichkeiten  = SUM(rechnungen.totalGross) für ER-Status
 *                        ('eingegangen','geprueft') — also noch nicht
 *                        "freigegeben" zur Zahlung.
 *
 *   Working Capital    = Forderungen − Verbindlichkeiten.
 */
import { eq } from "drizzle-orm";
import type {
  AusgangsrechnungStatus,
  Rechnung,
  RechnungStatus,
} from "@/db/schema";
import { db, schema } from "@/db";
import { kpiKey, withCache } from "./cache";

const OPEN_AR_STATUS: AusgangsrechnungStatus[] = [
  "versendet",
  "teilweise_bezahlt",
  "mahnung_1",
  "mahnung_2",
  "mahnung_3",
  "gerichtlich",
];

const OPEN_ER_STATUS: RechnungStatus[] = ["eingegangen", "geprueft"];

type ArRow = { status: AusgangsrechnungStatus; payoutGross: number };
type ErRow = { status: RechnungStatus; totalGross: Rechnung["totalGross"] };

export type WorkingCapitalResult = {
  /** EUR. Null wenn weder ARs noch ERs erfasst. */
  value: number | null;
  forderungenOffen: number;
  verbindlichkeitenOffen: number;
};

export function computeWorkingCapital(
  ar: ReadonlyArray<ArRow>,
  er: ReadonlyArray<ErRow>
): WorkingCapitalResult {
  if (ar.length === 0 && er.length === 0) {
    return { value: null, forderungenOffen: 0, verbindlichkeitenOffen: 0 };
  }
  const forderungen = ar
    .filter((r) => OPEN_AR_STATUS.includes(r.status))
    .reduce((acc, r) => acc + (r.payoutGross || 0), 0);
  const verb = er
    .filter((r) => OPEN_ER_STATUS.includes(r.status))
    .reduce((acc, r) => acc + (r.totalGross ?? 0), 0);
  return {
    value: Math.round(forderungen - verb),
    forderungenOffen: Math.round(forderungen),
    verbindlichkeitenOffen: Math.round(verb),
  };
}

export async function getWorkingCapital(
  workspaceId: string
): Promise<WorkingCapitalResult> {
  return withCache(kpiKey(workspaceId, "working-capital"), async () => {
    const [ar, er] = await Promise.all([
      db
        .select({
          status: schema.ausgangsrechnungen.status,
          payoutGross: schema.ausgangsrechnungen.payoutGross,
        })
        .from(schema.ausgangsrechnungen)
        .where(eq(schema.ausgangsrechnungen.workspaceId, workspaceId)),
      db
        .select({
          status: schema.rechnungen.status,
          totalGross: schema.rechnungen.totalGross,
        })
        .from(schema.rechnungen)
        .where(eq(schema.rechnungen.workspaceId, workspaceId)),
    ]);
    return computeWorkingCapital(ar, er);
  });
}
