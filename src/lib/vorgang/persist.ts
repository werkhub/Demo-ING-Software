/**
 * Vorgang-Service-Layer: alle DB-Side-Effects rund um Vorgänge.
 *
 * Server Actions sind dünne Adapter (FormData → Service-Call), der eigentliche
 * Domänen-Code lebt hier. Vorteile:
 *   - Wiederverwendbar (Cron-Jobs, Background-Tasks, Tests können Service direkt nutzen).
 *   - Keine doppelte Audit-/Risk-Logik in mehreren Action-Dateien.
 *   - Testbar mit Mock-DB ohne FormData-Construction.
 */
import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { computeVorgangRiskScore } from "./risk-score";
import type { Vorgang } from "@/db/schema";

/**
 * Lädt einen Vorgang innerhalb des aktuellen Workspaces — wirft, wenn er nicht
 * existiert oder einem fremden Workspace gehört.
 */
export async function ensureVorgang(
  vorgangId: string,
  workspaceId: string
): Promise<Vorgang> {
  const [row] = await db
    .select()
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.id, vorgangId),
        eq(schema.vorgaenge.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Vorgang nicht gefunden.");
  return row;
}

/**
 * Schreibt einen Audit-Log-Eintrag. Side-effect-only.
 */
export async function logVorgangAudit(opts: {
  vorgangId: string;
  actorId: string | null;
  action: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(schema.vorgangAuditLog).values({
    id: genId("au"),
    vorgangId: opts.vorgangId,
    actorId: opts.actorId,
    action: opts.action,
    payloadJson: JSON.stringify(opts.payload ?? {}),
  });
}

/**
 * Liest den aktuellen Stand des Vorgangs aus der DB, berechnet den Risk-Score
 * neu und schreibt ihn zurück. Wird nach jedem Status-Wechsel, Dokument-Upload
 * und Klassifikations-Step aufgerufen.
 */
export async function recomputeVorgangRiskScore(vorgangId: string): Promise<number> {
  const [v] = await db
    .select()
    .from(schema.vorgaenge)
    .where(eq(schema.vorgaenge.id, vorgangId))
    .limit(1);
  if (!v) return 0;

  const [docs, citations] = await Promise.all([
    db
      .select({ id: schema.vorgangDocuments.id })
      .from(schema.vorgangDocuments)
      .where(eq(schema.vorgangDocuments.vorgangId, vorgangId)),
    db
      .select({ id: schema.vorgangCitations.id })
      .from(schema.vorgangCitations)
      .where(eq(schema.vorgangCitations.vorgangId, vorgangId)),
  ]);

  const score = computeVorgangRiskScore({
    category: v.category,
    status: v.status,
    dueDate: v.dueDate,
    citationCount: citations.length,
    documentCount: docs.length,
  });

  await db
    .update(schema.vorgaenge)
    .set({ riskScore: score, updatedAt: new Date() })
    .where(eq(schema.vorgaenge.id, vorgangId));

  return score;
}
