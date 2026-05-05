/**
 * CLI für die Reminder-Pipeline. Lokal:  `npm run cron`
 *
 * Nutzt die gleiche Logik wie die API-Route, ohne HTTP-Layer. Sinnvoll für:
 *   - Initial-Test direkt nach Deploy
 *   - Lokale Entwicklung ohne Cron-Setup
 *   - On-demand-Trigger durch Admin
 */
import { runRemindersJob } from "@/lib/cron/runner";

async function main(): Promise<void> {
  const start = Date.now();
  console.log("▸ Reminders-Pipeline starten …");
  const outcome = await runRemindersJob("cli");
  const ms = Date.now() - start;

  console.log(`\n=== Lauf-Ergebnis (${outcome.runId}) ===`);
  console.log(`Status:                ${outcome.status}`);
  console.log(`Dauer:                 ${ms} ms`);
  console.log(`Workspaces:            ${outcome.summary.workspacesProcessed}`);
  console.log(`Geprüfte Datensätze:   ${outcome.summary.totalChecked}`);
  console.log(`Erzeugte Vorgänge:     ${outcome.summary.totalTriggered}`);

  if (Object.keys(outcome.summary.perModule).length > 0) {
    console.log("\nPro Modul:");
    for (const [name, m] of Object.entries(outcome.summary.perModule)) {
      console.log(
        `  · ${name.padEnd(36)} checked=${m.checked} triggered=${m.triggered}`
      );
    }
  }

  if (outcome.summary.errors.length > 0) {
    console.log("\nFehler:");
    for (const e of outcome.summary.errors) {
      console.log(`  ⚠ ${e}`);
    }
  }

  process.exit(outcome.status === "ok" ? 0 : 1);
}

main().catch((e) => {
  console.error("Unerwarteter Fehler:", e);
  process.exit(2);
});
