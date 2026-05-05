/**
 * Seed-Orchestrator.
 *
 * Strategie:
 *   1. Bestehende Demo-Workspaces löschen (alte UND neue IDs) — ON DELETE
 *      CASCADE räumt sämtliche abhängigen Tabellen mit ab.
 *   2. Legal-Chunks neu laden.
 *   3. Drei Workspaces befüllen:
 *        Müller Bau GmbH                     (bauunternehmer)
 *        Schneider Immobilien GmbH           (bauherr)
 *        Hoffmann + Partner Architekten      (ingenieurbuero)
 *
 * Ergebnis: konsistenter, „realistischer" Demo-Stand über alle Domain-Module —
 * Verträge, NUs + Compliance-Bescheinigungen, Nachträge, Sicherheiten, Mängel
 * (Phasen-übergreifend), Anzeigen, Abnahmen, HOAI-Versionierung, Hinweise,
 * Bemusterungen, Sachverständige, Subplaner, Meilensteine, Stunden je LP,
 * Ausgangsrechnungen mit Reverse-Charge, Eingangsrechnungs-Anomalien,
 * Bauabzug-Kandidaten.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { workspaces } from "./schema";
import { seedLegalChunks } from "./seed/legal";
import { seedMuellerWorkspace, WS_ID as MUELLER_ID } from "./seed/mueller";
import { seedSchneiderWorkspace, WS_ID as SCHNEIDER_ID } from "./seed/schneider";
import { seedHoffmannWorkspace, WS_ID as HOFFMANN_ID } from "./seed/hoffmann";

// IDs alter Demo-Datensätze, falls noch in der DB — werden mitgelöscht.
const LEGACY_WS_IDS = ["ws_mueller_bau", "ws_schneider_bau"];

const ALL_DEMO_IDS = [
  ...LEGACY_WS_IDS,
  MUELLER_ID,
  SCHNEIDER_ID,
  HOFFMANN_ID,
];

async function reset() {
  // Cascade-Delete über workspaces.id räumt alle abhängigen Tabellen.
  await db
    .delete(workspaces)
    .where(inArray(workspaces.id, ALL_DEMO_IDS));
  // Defensive: einzeln löschen, falls IN-Liste-Optimierung es übersieht.
  for (const id of ALL_DEMO_IDS) {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }
}

async function seed() {
  console.log("🌱 LexBau-Seed startet …\n");

  console.log("→ Reset: alte Demo-Workspaces löschen");
  await reset();
  console.log("  ✓ Cascade-Delete abgeschlossen\n");

  await seedLegalChunks();
  console.log("");

  await seedMuellerWorkspace();
  console.log("");

  await seedSchneiderWorkspace();
  console.log("");

  await seedHoffmannWorkspace();
  console.log("");

  console.log("✅ Seed abgeschlossen.\n");
  console.log("Workspaces:");
  console.log("  · Müller Bau GmbH                  (bauunternehmer) — t.mueller@muellerbau.de");
  console.log("  · Schneider Immobilien GmbH        (bauherr)        — a.schneider@schneider-immobilien.de");
  console.log("  · Hoffmann + Partner Architekten   (ingenieurbuero) — i.hoffmann@hoffmann-partner.de");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed fehlgeschlagen:", err);
  process.exit(1);
});
