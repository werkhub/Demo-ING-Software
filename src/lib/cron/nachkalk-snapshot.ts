/**
 * Wöchentlicher Snapshot-Job für Nachkalkulation (Modul 4.1).
 *
 * Erzeugt für JEDES aktive Projekt jedes Workspace einen Snapshot — aber nur
 * wenn seit dem letzten Snapshot >= 6 Tage vergangen sind. Dadurch:
 *   - Idempotent gegenüber mehrfacher Cron-Auslösung am selben Tag
 *   - Wöchentliche Kadenz auch bei täglichem Cron
 *
 * Gibt Summary mit Anzahl erzeugter Snapshots + Liste betroffener Projekte
 * zurück.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { aggregateNachkalk } from "@/lib/nachkalk/aggregate";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

const SNAPSHOT_KADENZ_TAGE = 6;

export type NachkalkSnapshotResult = {
  workspaceId: string;
  workspacesProcessed: number;
  projectsProcessed: number;
  snapshotsCreated: number;
  errors: string[];
};

const isoToday = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/**
 * Läuft pro Workspace. Erzeugt Snapshots für alle aktiven Projekte, die
 * länger als SNAPSHOT_KADENZ_TAGE keinen Snapshot mehr hatten.
 */
export async function runNachkalkSnapshotsForWorkspace(
  workspaceId: string
): Promise<NachkalkSnapshotResult> {
  const result: NachkalkSnapshotResult = {
    workspaceId,
    workspacesProcessed: 1,
    projectsProcessed: 0,
    snapshotsCreated: 0,
    errors: [],
  };

  // Aktive Projekte (alles außer Abgeschlossen)
  const projekte = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.workspaceId, workspaceId),
        sql`${schema.projects.status} != 'Abgeschlossen'`
      )
    );

  result.projectsProcessed = projekte.length;
  const todayIso = isoToday();
  const cutoffIso = isoToday(-SNAPSHOT_KADENZ_TAGE);

  for (const projekt of projekte) {
    try {
      // Letzten Snapshot suchen
      const [latest] = await db
        .select({ stichtag: schema.nachkalkulationSnapshots.stichtag })
        .from(schema.nachkalkulationSnapshots)
        .where(
          and(
            eq(schema.nachkalkulationSnapshots.workspaceId, workspaceId),
            eq(schema.nachkalkulationSnapshots.projektId, projekt.id)
          )
        )
        .orderBy(desc(schema.nachkalkulationSnapshots.stichtag))
        .limit(1);

      if (latest && latest.stichtag >= cutoffIso) {
        continue; // schon vor weniger als 6 Tagen erzeugt
      }

      const agg = await aggregateNachkalk(workspaceId, projekt.id);

      // Skip leere Projekte (keine LV-Positionen)
      if (agg.positionen.length === 0) continue;

      const id = genId("nk");
      await db.insert(schema.nachkalkulationSnapshots).values({
        id,
        workspaceId,
        projektId: projekt.id,
        stichtag: todayIso,
        sollNettoCents: agg.total.sollNettoCents,
        istLohnCents: agg.total.istLohnCents,
        istMaterialCents: agg.total.istMaterialCents,
        istNuCents: agg.total.istNuCents,
        deckungsbeitragCents: agg.total.deckungsbeitragCents,
        fertigstellungsgradPct: agg.fertigstellungsgradPct,
        snapshotJson: JSON.stringify(agg.positionen),
        createdBy: null,
        notes: "Auto-Snapshot via Cron",
      });
      result.snapshotsCreated++;

      // Auto-Vorgang bei Kostenüberschreitungen — markieren über Snapshot-ID
      const verletzte = agg.positionen.filter(
        (p) => p.warning === "kostenueberschreitung"
      );
      if (verletzte.length > 0) {
        await createVorgangFromTrigger({
          workspaceId,
          userId: null,
          source: "rechnung_anomalie",
          title: `[Cron] Nachkalk: ${verletzte.length} Kostenüberschreitungen (${projekt.name})`,
          category: "vertragspflicht",
          projectId: projekt.id,
          dueDate: isoToday(7),
          firstStep: {
            kind: "klassifikation",
            payload: {
              snapshotId: id,
              verletzteAnzahl: verletzte.length,
              triggeredBy: "cron_nachkalk_snapshot",
            },
            citations: [
              {
                sourceKind: "intern",
                sourceRef: "Nachkalkulation 4.1",
                sourceText:
                  "Kostenüberschreitung pro LV-Position erfordert Maßnahme: Nachtrag, Mehraufwands-Vergütung, oder Akzeptanz.",
              },
            ],
          },
          auditPayload: { snapshotId: id, projektId: projekt.id },
        });
      }
    } catch (e) {
      result.errors.push(
        `Projekt ${projekt.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return result;
}

/**
 * Workspace-übergreifender Aggregator.
 */
export type NachkalkSnapshotsRunSummary = {
  workspacesProcessed: number;
  projectsProcessed: number;
  snapshotsCreated: number;
  errors: string[];
};

export async function runAllNachkalkSnapshots(): Promise<NachkalkSnapshotsRunSummary> {
  const summary: NachkalkSnapshotsRunSummary = {
    workspacesProcessed: 0,
    projectsProcessed: 0,
    snapshotsCreated: 0,
    errors: [],
  };

  const workspaces = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces);

  for (const ws of workspaces) {
    summary.workspacesProcessed++;
    try {
      const r = await runNachkalkSnapshotsForWorkspace(ws.id);
      summary.projectsProcessed += r.projectsProcessed;
      summary.snapshotsCreated += r.snapshotsCreated;
      for (const err of r.errors) {
        summary.errors.push(`[${ws.id}] ${err}`);
      }
    } catch (e) {
      summary.errors.push(
        `[${ws.id}] Fatal: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return summary;
}
