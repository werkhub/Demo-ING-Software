/**
 * KPI: Sicherheiten-Volumen — Summe aktiver Sicherheiten (Bürgschaften +
 * Bareinbehalte) in EUR. Snapshot aller `securities` mit status='aktiv'.
 *
 * Bewusst KEINE Filterung nach `direction` — der GF will das Gesamt-
 * volumen aller offenen Sicherheiten sehen, egal ob wir sie gestellt
 * haben oder erhalten.
 */
import { eq } from "drizzle-orm";
import type { Security } from "@/db/schema";
import { db, schema } from "@/db";
import { kpiKey, withCache } from "./cache";

type Row = Pick<Security, "amount" | "status">;

export type SicherheitenVolumenResult = {
  /** EUR. Null wenn keine Sicherheiten erfasst. */
  value: number | null;
  activeCount: number;
};

export function computeSicherheitenVolumen(
  rows: ReadonlyArray<Row>
): SicherheitenVolumenResult {
  if (rows.length === 0) {
    return { value: null, activeCount: 0 };
  }
  const active = rows.filter((s) => s.status === "aktiv");
  const sum = active.reduce((acc, s) => acc + (s.amount || 0), 0);
  return { value: Math.round(sum), activeCount: active.length };
}

export async function getSicherheitenVolumen(
  workspaceId: string
): Promise<SicherheitenVolumenResult> {
  return withCache(kpiKey(workspaceId, "sicherheiten-volumen"), async () => {
    const rows = await db
      .select({
        amount: schema.securities.amount,
        status: schema.securities.status,
      })
      .from(schema.securities)
      .where(eq(schema.securities.workspaceId, workspaceId));
    return computeSicherheitenVolumen(rows);
  });
}
