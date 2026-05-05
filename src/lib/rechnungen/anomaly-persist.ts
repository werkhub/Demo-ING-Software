import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import {
  findMathErrors,
  findPositionsNotInContract,
  findPriceJumps,
  type AnomalyFinding,
} from "./anomaly-rules";
import { aggregateAnomalyScore } from "./anomaly-score";

export type AnomalyReport = {
  rechnungId: string;
  findings: AnomalyFinding[];
  score: number;
};

/**
 * Side-Effect-Wrapper um die pure Anomalie-Rules.
 * Lädt aus der DB, ruft die pure Funktionen auf, persistiert das Ergebnis.
 *
 * Vorteil der Trennung: die pure Logik ist in `anomaly-rules.ts` ohne DB
 * unit-testbar, dieser Layer hier ist nur Glue-Code.
 */
export async function analyzeRechnung(rechnungId: string): Promise<AnomalyReport> {
  const [rechnung] = await db
    .select()
    .from(schema.rechnungen)
    .where(eq(schema.rechnungen.id, rechnungId))
    .limit(1);
  if (!rechnung) {
    return { rechnungId, findings: [], score: 0 };
  }

  const positions = await db
    .select()
    .from(schema.rechnungPositionen)
    .where(eq(schema.rechnungPositionen.rechnungId, rechnungId))
    .orderBy(schema.rechnungPositionen.positionIndex);

  const findings: AnomalyFinding[] = [];

  // Check 1 — Mathematik
  findings.push(...findMathErrors(positions));

  // Check 2 — Preis-Sprung gegen Vorrechnungen
  const otherRechnungen = await db
    .select({ id: schema.rechnungen.id })
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.workspaceId, rechnung.workspaceId),
        ne(schema.rechnungen.id, rechnungId)
      )
    );
  if (otherRechnungen.length > 0 && positions.some((p) => p.lvPosition)) {
    const otherIds = otherRechnungen.map((r) => r.id);
    const allOther = await Promise.all(
      otherIds.map((id) =>
        db
          .select()
          .from(schema.rechnungPositionen)
          .where(eq(schema.rechnungPositionen.rechnungId, id))
      )
    );
    findings.push(...findPriceJumps(positions, allOther.flat()));
  }

  // Check 3 — Hauptvertrag-Lookup
  if (rechnung.projectId) {
    const contracts = await db
      .select({
        contractText: schema.contracts.contractText,
        kind: schema.contracts.kind,
      })
      .from(schema.contracts)
      .where(
        and(
          eq(schema.contracts.workspaceId, rechnung.workspaceId),
          eq(schema.contracts.projectId, rechnung.projectId)
        )
      );
    const haupt = contracts.find((c) => c.kind === "hauptvertrag");
    findings.push(
      ...findPositionsNotInContract(positions, haupt?.contractText ?? null)
    );
  }

  const score = aggregateAnomalyScore(findings);

  // Persistieren — alte Befunde ersetzen
  await db
    .delete(schema.rechnungAnomalien)
    .where(eq(schema.rechnungAnomalien.rechnungId, rechnungId));

  if (findings.length > 0) {
    await db.insert(schema.rechnungAnomalien).values(
      findings.map((f) => ({
        id: genId("ra"),
        rechnungId,
        kind: f.kind,
        severity: f.severity,
        description: f.description,
        payloadJson: JSON.stringify(f.payload),
        resolved: false,
      }))
    );
  }

  // Per-Position-Flags aktualisieren
  const flagsByPos = new Map<number, AnomalyFinding[]>();
  for (const f of findings) {
    if (typeof f.positionIndex === "number") {
      if (!flagsByPos.has(f.positionIndex)) flagsByPos.set(f.positionIndex, []);
      flagsByPos.get(f.positionIndex)!.push(f);
    }
  }
  for (const p of positions) {
    const flags = flagsByPos.get(p.positionIndex) ?? [];
    await db
      .update(schema.rechnungPositionen)
      .set({
        anomalyFlags: JSON.stringify(
          flags.map((f) => ({
            kind: f.kind,
            severity: f.severity,
            description: f.description,
          }))
        ),
      })
      .where(eq(schema.rechnungPositionen.id, p.id));
  }

  await db
    .update(schema.rechnungen)
    .set({ anomalyScore: score, anomalyCount: findings.length })
    .where(eq(schema.rechnungen.id, rechnungId));

  return { rechnungId, findings, score };
}
