import "server-only";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { ACKNOWLEDGEMENT_WARN_DAYS } from "@/lib/anzeigen";
import type { Anzeige } from "@/db/schema";

export async function getAnzeigen(): Promise<Anzeige[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.anzeigen)
    .where(eq(schema.anzeigen.workspaceId, workspaceId))
    .orderBy(desc(schema.anzeigen.createdAt));
}

export async function getAnzeige(id: string): Promise<Anzeige | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.id, id),
        eq(schema.anzeigen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getAnzeigenByProject(
  projectId: string
): Promise<Anzeige[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.workspaceId, workspaceId),
        eq(schema.anzeigen.projectId, projectId)
      )
    )
    .orderBy(desc(schema.anzeigen.createdAt));
}

/**
 * Anzeigen, die versendet sind, deren Zugang aber älter als die Eskalations-
 * Schwelle ist und noch nicht bestätigt wurde — Eingang für Reminder/Cron.
 */
export async function getAwaitingAcknowledgement(): Promise<Anzeige[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACKNOWLEDGEMENT_WARN_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.workspaceId, workspaceId),
        eq(schema.anzeigen.status, "versendet"),
        lte(schema.anzeigen.sentAt, cutoffIso),
        // acknowledgedAt is NULL — Drizzle's idiomatic check
        sql`${schema.anzeigen.acknowledgedAt} IS NULL`
      )
    )
    .orderBy(schema.anzeigen.sentAt);
}

/**
 * Statistik-Aggregat für die Anzeigen-Listenseite und das Dashboard.
 * Nutzt eine einzige Query statt N+1-Counts.
 */
export async function getAnzeigenStats(): Promise<{
  total: number;
  entwurf: number;
  versendet: number;
  bestaetigt: number;
  zugangUeberfaellig: number;
}> {
  const all = await getAnzeigen();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACKNOWLEDGEMENT_WARN_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return {
    total: all.length,
    entwurf: all.filter((a) => a.status === "entwurf").length,
    versendet: all.filter((a) => a.status === "versendet").length,
    bestaetigt: all.filter((a) => a.status === "bestaetigt").length,
    zugangUeberfaellig: all.filter(
      (a) =>
        a.status === "versendet" &&
        !a.acknowledgedAt &&
        a.sentAt !== null &&
        a.sentAt <= cutoffIso
    ).length,
  };
}

