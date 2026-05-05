import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type {
  Mangel,
  MangelAnzeige,
  MangelPhase,
  Project,
} from "@/db/schema";

const PRIO_CASE = sql`CASE ${schema.maengel.prioritaet}
                        WHEN 'kritisch' THEN 0
                        WHEN 'hoch' THEN 1
                        WHEN 'mittel' THEN 2
                        ELSE 3
                      END`;

/**
 * Liste aller Mängel eines Projekts, optional gefiltert nach Phase. Sortierung:
 * aktive zuerst (offen/in_bearbeitung/strittig), dann Priorität, dann jüngste.
 */
export async function getMaengelByProject(
  projectId: string,
  opts: { phase?: MangelPhase | null } = {}
): Promise<Mangel[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const conditions = [
    eq(schema.maengel.workspaceId, workspaceId),
    eq(schema.maengel.projectId, projectId),
  ];
  if (opts.phase) {
    conditions.push(eq(schema.maengel.phase, opts.phase));
  }
  return db
    .select()
    .from(schema.maengel)
    .where(and(...conditions))
    .orderBy(
      sql`CASE ${schema.maengel.status}
            WHEN 'offen' THEN 0
            WHEN 'in_bearbeitung' THEN 1
            WHEN 'strittig' THEN 2
            ELSE 3
          END`,
      PRIO_CASE,
      desc(schema.maengel.createdAt)
    );
}

export async function getAnzeigenByMangel(
  mangelId: string
): Promise<MangelAnzeige[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.maengelAnzeigen)
    .where(
      and(
        eq(schema.maengelAnzeigen.workspaceId, workspaceId),
        eq(schema.maengelAnzeigen.mangelId, mangelId)
      )
    )
    .orderBy(desc(schema.maengelAnzeigen.versendetAm));
}

/**
 * Projekte, deren Gewährleistungs-Ende (warrantyEnd) in den nächsten 60 Tagen
 * fällt — Eingang für den Gewährleistungs-Reminder. Workspace-übergreifend
 * (kein getCurrentWorkspaceId), wird vom Cron mit explizitem `workspaceId`
 * verwendet. Hier nur die User-Variante.
 */
export async function getProjectsWithGewaehrleistungEnd(opts: {
  cutoffIso: string;
}): Promise<Project[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.workspaceId, workspaceId),
        sql`${schema.projects.warrantyEnd} IS NOT NULL`,
        sql`${schema.projects.warrantyEnd} <= ${opts.cutoffIso}`
      )
    )
    .orderBy(asc(schema.projects.warrantyEnd));
}
