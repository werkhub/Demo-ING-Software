/**
 * Composite Cron-CLI: führt Reminders + Nachkalk-Snapshots + Backup
 * nacheinander aus. Default-Aufruf-Modus für Cron-Daemon (täglich).
 *
 * Nutzung:
 *   npm run cron:all
 *
 * Einzelne Jobs:
 *   npm run cron                (nur Reminders)
 *   npx tsx scripts/cron-nachkalk.ts
 *   npx tsx scripts/cron-backup.ts
 */
import {
  runBackupJob,
  runNachkalkSnapshotsJob,
  runRemindersJob,
} from "@/lib/cron/runner";

async function main(): Promise<void> {
  const start = Date.now();
  console.log("▸ Cron-Composite — Reminders + Nachkalk + Backup\n");

  // 1. Reminders (täglich)
  console.log("=== 1/3 Reminders ===");
  const r = await runRemindersJob("cli");
  console.log(
    `   Status: ${r.status} · ${r.summary.workspacesProcessed} Workspaces · ${r.summary.totalTriggered} Vorgänge · ${r.durationMs}ms`
  );
  if (r.summary.errors.length > 0) {
    console.log(`   ⚠ ${r.summary.errors.length} Fehler`);
  }

  // 2. Nachkalk-Snapshots (wöchentliche Kadenz)
  console.log("\n=== 2/3 Nachkalk-Snapshots ===");
  const n = await runNachkalkSnapshotsJob("cli");
  console.log(
    `   Status: ${n.status} · ${n.summary.projectsProcessed} Projekte · ${n.summary.snapshotsCreated} Snapshots · ${n.durationMs}ms`
  );

  // 3. Backup (täglich, idempotent)
  console.log("\n=== 3/3 Backup ===");
  const b = await runBackupJob("cli");
  console.log(
    `   Status: ${b.status} · ${b.filename ?? "—"} · ${(b.sizeBytes / 1024 / 1024).toFixed(2)} MB · ${b.durationMs}ms`
  );
  if (b.error) console.log(`   ⚠ ${b.error}`);

  const totalMs = Date.now() - start;
  console.log(`\n=== Composite fertig (${totalMs} ms) ===`);

  const anyFailed =
    r.status === "failed" || n.status === "failed" || b.status === "failed";
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error("Unerwarteter Fehler:", e);
  process.exit(2);
});
