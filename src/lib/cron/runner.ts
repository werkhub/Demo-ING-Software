/**
 * Cron-Runner mit Audit-Trail.
 *
 * Schreibt vor + nach jedem Lauf in cron_runs. Bei Fehlern wird der Status
 * auf "failed" gesetzt — die Errors werden trotzdem im summary_json
 * dokumentiert.
 */
// Bewusst kein "server-only" — Modul wird auch vom CLI-Script (tsx) ohne
// Next-Bundle aufgerufen. API-Routes sind ohnehin per Definition server-side.
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { runAllReminders, type RemindersRunSummary } from "./reminders";
import {
  runAllNachkalkSnapshots,
  type NachkalkSnapshotsRunSummary,
} from "./nachkalk-snapshot";

export type CronJobName = "reminders" | "nachkalk_snapshots" | "backup_taeglich";

export type CronRunOutcome = {
  runId: string;
  jobName: CronJobName;
  status: "ok" | "failed";
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  summary: RemindersRunSummary;
};

export type NachkalkSnapshotsOutcome = {
  runId: string;
  jobName: "nachkalk_snapshots";
  status: "ok" | "failed";
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  summary: NachkalkSnapshotsRunSummary;
};

export type BackupOutcome = {
  runId: string;
  jobName: "backup_taeglich";
  status: "ok" | "failed";
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  filename: string | null;
  filePath: string | null;
  sizeBytes: number;
  sha256: string | null;
  error?: string;
};

export async function runRemindersJob(
  triggeredBy: "api" | "cli" | "manual" = "manual"
): Promise<CronRunOutcome> {
  const runId = genId("cron");
  const startedAt = new Date();

  await db.insert(schema.cronRuns).values({
    id: runId,
    jobName: "reminders",
    startedAt,
    status: "running",
    triggeredBy,
  });

  let summary: RemindersRunSummary = {
    workspacesProcessed: 0,
    totalChecked: 0,
    totalTriggered: 0,
    perModule: {},
    errors: [],
  };
  let status: "ok" | "failed" = "ok";

  try {
    summary = await runAllReminders();
    if (summary.errors.length > 0) {
      // Teilfehler sind kein Fail des ganzen Jobs — wir markieren als ok mit
      // notierten Errors. Nur ein Throw aus runAllReminders setzt failed.
      status = "ok";
    }
  } catch (e) {
    status = "failed";
    summary.errors.push(
      `Fatal: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  await db
    .update(schema.cronRuns)
    .set({
      finishedAt,
      status,
      workspacesProcessed: summary.workspacesProcessed,
      vorgaengeCreated: summary.totalTriggered,
      errorsJson: summary.errors.length > 0 ? JSON.stringify(summary.errors) : null,
      summaryJson: JSON.stringify(summary.perModule),
    })
    .where(eq(schema.cronRuns.id, runId));

  return {
    runId,
    jobName: "reminders",
    status,
    startedAt,
    finishedAt,
    durationMs,
    summary,
  };
}

/* ============== NACHKALK-SNAPSHOTS-JOB ============== */

export async function runNachkalkSnapshotsJob(
  triggeredBy: "api" | "cli" | "manual" = "manual"
): Promise<NachkalkSnapshotsOutcome> {
  const runId = genId("cron");
  const startedAt = new Date();

  await db.insert(schema.cronRuns).values({
    id: runId,
    jobName: "nachkalk_snapshots",
    startedAt,
    status: "running",
    triggeredBy,
  });

  let summary: NachkalkSnapshotsRunSummary = {
    workspacesProcessed: 0,
    projectsProcessed: 0,
    snapshotsCreated: 0,
    errors: [],
  };
  let status: "ok" | "failed" = "ok";

  try {
    summary = await runAllNachkalkSnapshots();
  } catch (e) {
    status = "failed";
    summary.errors.push(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  await db
    .update(schema.cronRuns)
    .set({
      finishedAt,
      status,
      workspacesProcessed: summary.workspacesProcessed,
      vorgaengeCreated: summary.snapshotsCreated,
      errorsJson:
        summary.errors.length > 0 ? JSON.stringify(summary.errors) : null,
      summaryJson: JSON.stringify({
        projectsProcessed: summary.projectsProcessed,
        snapshotsCreated: summary.snapshotsCreated,
      }),
    })
    .where(eq(schema.cronRuns.id, runId));

  return {
    runId,
    jobName: "nachkalk_snapshots",
    status,
    startedAt,
    finishedAt,
    durationMs,
    summary,
  };
}

/* ============== BACKUP-JOB ============== */

/**
 * Backup-Job ist nach der Postgres-Migration **deaktiviert** — Backups laufen
 * jetzt beim Postgres-Provider (Neon/Vercel/Supabase machen Snapshots
 * automatisch). Der Job bleibt als No-Op erhalten, damit bestehende Cron-
 * Trigger nicht ins Leere laufen; er schreibt einen "ok"-Eintrag mit Hinweis
 * in den Audit-Trail.
 */
export async function runBackupJob(
  triggeredBy: "api" | "cli" | "manual" = "manual"
): Promise<BackupOutcome> {
  const runId = genId("cron");
  const startedAt = new Date();

  await db.insert(schema.cronRuns).values({
    id: runId,
    jobName: "backup_taeglich",
    startedAt,
    status: "running",
    triggeredBy,
  });

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  await db
    .update(schema.cronRuns)
    .set({
      finishedAt,
      status: "ok",
      workspacesProcessed: 0,
      vorgaengeCreated: 0,
      errorsJson: null,
      summaryJson: JSON.stringify({
        note: "no-op (Postgres-Provider übernimmt Snapshots)",
      }),
    })
    .where(eq(schema.cronRuns.id, runId));

  return {
    runId,
    jobName: "backup_taeglich",
    status: "ok",
    startedAt,
    finishedAt,
    durationMs,
    filename: null,
    filePath: null,
    sizeBytes: 0,
    sha256: null,
    error: undefined,
  };
}
