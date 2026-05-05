/**
 * Cron-Run-Audit. Workspace-übergreifend (Cron läuft system-weit).
 */
import { pgTable, text, integer, index , timestamp } from "drizzle-orm/pg-core";

export const cronRuns = pgTable(
  "cron_runs",
  {
    id: text("id").primaryKey(),
    jobName: text("job_name").notNull(),
    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at"),
    /** "running" | "ok" | "failed" */
    status: text("status", { enum: ["running", "ok", "failed"] }).notNull(),
    workspacesProcessed: integer("workspaces_processed").notNull().default(0),
    vorgaengeCreated: integer("vorgaenge_created").notNull().default(0),
    /** JSON-Array mit Fehler-Strings, falls einzelne Workspaces gescheitert sind. */
    errorsJson: text("errors_json"),
    /** JSON mit Per-Modul-Aggregaten. */
    summaryJson: text("summary_json"),
    /** Wer hat ausgelöst — "api", "cli", "manual". */
    triggeredBy: text("triggered_by"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    jobStartedIdx: index("idx_cron_runs_job_started").on(
      t.jobName,
      t.startedAt
    ),
  })
);
