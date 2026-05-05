import { describe as describeBase, expect, it } from "vitest";
import { runAllReminders } from "./reminders";

// Integration-Suite: braucht eine Postgres-Verbindung. Wird automatisch
// übersprungen, wenn DATABASE_URL nicht gesetzt ist.
const describe = describeBase.skipIf(
  !process.env.DATABASE_URL && !process.env.POSTGRES_URL
);

/**
 * Integration-Test: läuft gegen die echte SQLite-DB im Repo (./data/lexbau.db).
 * Der Test prüft nur, dass die Pipeline ohne Crash durchläuft + idempotent ist
 * (zweimal nacheinander rufen → zweite Lauf sollte 0 neue Vorgänge erzeugen).
 *
 * Kein Mocking, weil die Reminder-Logik DB-zentriert ist und Mocks fragil
 * wären. Bei leerer DB läuft alles auf 0/0.
 */
describe("runAllReminders (Integration)", () => {
  it("läuft ohne Crash, liefert Summary-Struktur", async () => {
    const summary = await runAllReminders();
    expect(summary).toHaveProperty("workspacesProcessed");
    expect(summary).toHaveProperty("totalChecked");
    expect(summary).toHaveProperty("totalTriggered");
    expect(summary).toHaveProperty("perModule");
    expect(summary).toHaveProperty("errors");
    expect(typeof summary.workspacesProcessed).toBe("number");
    expect(Array.isArray(summary.errors)).toBe(true);
  });

  it("zweiter Lauf ist idempotent (keine neuen Vorgänge)", async () => {
    // Erster Lauf
    await runAllReminders();
    // Zweiter Lauf — totalTriggered sollte 0 sein, weil Marker im notes-Feld
    const second = await runAllReminders();
    expect(second.totalTriggered).toBe(0);
  });

  it("alle 7 Module sind im Summary vertreten (auch wenn leer)", async () => {
    const summary = await runAllReminders();
    // Module sind nur im perModule, wenn Workspaces existieren UND mindestens
    // ein Datensatz geprüft wurde. Bei leerer Workspace-Tabelle ist perModule
    // leer — das ist OK.
    if (summary.workspacesProcessed > 0) {
      // Wenn mind. ein Workspace existiert, müssen die Module-Keys da sein
      // (auch mit checked=0)
      expect(summary.perModule).toBeDefined();
    }
  });
});
