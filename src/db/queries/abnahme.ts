import "server-only";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type { Abnahme, Mangel } from "@/db/schema";

export async function getAbnahmenByProject(
  projectId: string
): Promise<Abnahme[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.abnahmen)
    .where(
      and(
        eq(schema.abnahmen.workspaceId, workspaceId),
        eq(schema.abnahmen.projectId, projectId)
      )
    )
    .orderBy(desc(schema.abnahmen.abnahmeDate), desc(schema.abnahmen.createdAt));
}

export async function getAbnahme(id: string): Promise<Abnahme | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.abnahmen)
    .where(
      and(
        eq(schema.abnahmen.id, id),
        eq(schema.abnahmen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Mängel einer Abnahme — seit Migration 0029 aus der phasen-übergreifenden
 * `maengel`-Tabelle (mit phase='abnahme' UND abnahmeId=…).
 * Sortiert: kritische Priorität zuerst, dann nach Erfassungsdatum.
 */
export async function getMaengelByAbnahme(
  abnahmeId: string
): Promise<Mangel[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.workspaceId, workspaceId),
        eq(schema.maengel.abnahmeId, abnahmeId)
      )
    )
    .orderBy(
      sql`CASE ${schema.maengel.prioritaet}
            WHEN 'kritisch' THEN 0
            WHEN 'hoch' THEN 1
            WHEN 'mittel' THEN 2
            ELSE 3
          END`,
      asc(schema.maengel.createdAt)
    );
}

export async function getMangel(id: string): Promise<Mangel | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.id, id),
        eq(schema.maengel.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Mängel aller Projekte, deren Frist überschritten ist und die noch
 * aktiv sind (offen/in_bearbeitung/strittig). Eingang für Cron/Reminder.
 */
export async function getOverdueMaengel(): Promise<Mangel[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const todayIso = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.workspaceId, workspaceId),
        lte(schema.maengel.fristsetzungDatum, todayIso),
        sql`${schema.maengel.status} IN ('offen', 'in_bearbeitung', 'strittig')`
      )
    )
    .orderBy(asc(schema.maengel.fristsetzungDatum));
}
