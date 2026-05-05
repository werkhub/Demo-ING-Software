/**
 * Integration-Tests für die zwei steuerrechtlichen Reminder-Module:
 *   - runFreistellungAblaufReminders (§ 48b EStG)
 *   - runBauabzugAnmeldungReminder  (§ 48a EStG)
 *
 * Läuft gegen die echte Repo-DB (./data/lexbau.db) — wir richten Test-Daten
 * mit eindeutigen IDs ein, lassen die Reminder laufen und räumen am Ende
 * wieder auf, damit die Datei nicht voller Test-Müll ist.
 */
import { afterEach, beforeEach, describe as describeBase, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  runBauabzugAnmeldungReminder,
  runFreistellungAblaufReminders,
} from "./reminders";

// Integration-Suite: braucht eine Postgres-Verbindung. Wird automatisch
// übersprungen, wenn DATABASE_URL nicht gesetzt ist.
const describe = describeBase.skipIf(
  !process.env.DATABASE_URL && !process.env.POSTGRES_URL
);

// Eindeutige IDs pro Test-Run — verhindert Race mit anderen Test-Files,
// die `runAllReminders()` über alle Workspaces aufrufen und Vorgänge in
// unserer Test-Workspace anlegen würden.
const RUN_SUFFIX = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PREFIX = `test-steuer-${RUN_SUFFIX}-`;
const WS_ID = `${TEST_PREFIX}ws-1`;
const PROJECT_ID = `${TEST_PREFIX}p-1`;
const NU_ID = `${TEST_PREFIX}nu-1`;
const RECHNUNG_ID = `${TEST_PREFIX}r-1`;

async function setupFixtures(opts: {
  freistellungUntil: string | null;
  freistellungNr: string | null;
  rechnungWithEinbehalt: boolean;
}): Promise<void> {
  await db.insert(schema.workspaces).values({
    id: WS_ID,
    name: "Test Workspace Steuer",
    bauabzugPflichtig: true,
  });
  await db.insert(schema.projects).values({
    id: PROJECT_ID,
    workspaceId: WS_ID,
    identifier: "TST-001",
    name: "Test-Projekt Steuer",
    ag: "Test-AG",
    value: 100_000,
  });
  await db.insert(schema.subcontractors).values({
    id: NU_ID,
    workspaceId: WS_ID,
    projectId: PROJECT_ID,
    name: "Test-NU GmbH",
    gewerk: "Maler",
    freistellungsbescheinigungNr: opts.freistellungNr,
    freistellungsbescheinigungGueltigBis: opts.freistellungUntil,
  });
  if (opts.rechnungWithEinbehalt) {
    // Im Vormonat datierte Rechnung mit offenem Einbehalt
    const today = new Date();
    const lastMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 15)
    );
    await db.insert(schema.rechnungen).values({
      id: RECHNUNG_ID,
      workspaceId: WS_ID,
      projectId: PROJECT_ID,
      subcontractorId: NU_ID,
      supplierName: "Test-NU GmbH",
      invoiceDate: lastMonth.toISOString().slice(0, 10),
      totalGross: 10_000,
      bauabzugEinbehaltCents: 150_000,
    });
  }
}

async function cleanup(): Promise<void> {
  // Foreign-Keys sind in better-sqlite3 nicht garantiert eingeschaltet, daher
  // explizit in der Topologie-Reihenfolge löschen.
  await db
    .delete(schema.vorgaenge)
    .where(eq(schema.vorgaenge.workspaceId, WS_ID));
  await db
    .delete(schema.rechnungen)
    .where(eq(schema.rechnungen.workspaceId, WS_ID));
  await db
    .delete(schema.subcontractors)
    .where(eq(schema.subcontractors.workspaceId, WS_ID));
  await db
    .delete(schema.projects)
    .where(eq(schema.projects.workspaceId, WS_ID));
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, WS_ID));
}

describe("runFreistellungAblaufReminders", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("erzeugt Vorgang bei abgelaufener Freistellungsbescheinigung", async () => {
    await setupFixtures({
      freistellungNr: "F-2024-X",
      freistellungUntil: "2025-01-01", // weit in der Vergangenheit
      rechnungWithEinbehalt: false,
    });
    const result = await runFreistellungAblaufReminders(WS_ID);
    expect(result.checked).toBe(1);
    expect(result.triggered).toBe(1);

    const vorgaenge = await db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, WS_ID));
    expect(vorgaenge).toHaveLength(1);
    expect(vorgaenge[0].title).toMatch(/abgelaufen|läuft aus/i);
  });

  it("ist idempotent (zweiter Lauf erzeugt keinen weiteren Vorgang)", async () => {
    await setupFixtures({
      freistellungNr: "F-2024-X",
      freistellungUntil: "2025-01-01",
      rechnungWithEinbehalt: false,
    });
    await runFreistellungAblaufReminders(WS_ID);
    const second = await runFreistellungAblaufReminders(WS_ID);
    expect(second.triggered).toBe(0);
    const vorgaenge = await db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, WS_ID));
    expect(vorgaenge).toHaveLength(1);
  });

  it("triggert nicht bei Bescheinigung in ferner Zukunft", async () => {
    await setupFixtures({
      freistellungNr: "F-2099-X",
      freistellungUntil: "2099-12-31",
      rechnungWithEinbehalt: false,
    });
    const result = await runFreistellungAblaufReminders(WS_ID);
    expect(result.checked).toBe(0);
    expect(result.triggered).toBe(0);
  });
});

describe("runBauabzugAnmeldungReminder", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("erzeugt Sammel-Vorgang am 5. des Monats für offene Einbehalte des Vormonats", async () => {
    await setupFixtures({
      freistellungNr: null,
      freistellungUntil: null,
      rechnungWithEinbehalt: true,
    });
    // Datum auf 5. des aktuellen Monats setzen, damit der Reminder feuert
    const today = new Date();
    const fakeToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      5,
      12,
      0
    );
    const result = await runBauabzugAnmeldungReminder(WS_ID, fakeToday);
    expect(result.checked).toBe(1);
    expect(result.triggered).toBe(1);

    const vorgaenge = await db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, WS_ID));
    expect(vorgaenge).toHaveLength(1);
    expect(vorgaenge[0].title).toMatch(/Bauabzug-Anmeldung/);
  });

  it("läuft nicht außerhalb des 5.-9. des Monats", async () => {
    await setupFixtures({
      freistellungNr: null,
      freistellungUntil: null,
      rechnungWithEinbehalt: true,
    });
    const fakeToday = new Date(2026, 5, 20, 12, 0); // 20. Juni
    const result = await runBauabzugAnmeldungReminder(WS_ID, fakeToday);
    expect(result.checked).toBe(0);
    expect(result.triggered).toBe(0);
  });

  it("ist idempotent (zweiter Lauf am gleichen Tag erzeugt keinen Vorgang)", async () => {
    await setupFixtures({
      freistellungNr: null,
      freistellungUntil: null,
      rechnungWithEinbehalt: true,
    });
    const today = new Date();
    const fakeToday = new Date(today.getFullYear(), today.getMonth(), 5, 12, 0);
    await runBauabzugAnmeldungReminder(WS_ID, fakeToday);
    const second = await runBauabzugAnmeldungReminder(WS_ID, fakeToday);
    expect(second.triggered).toBe(0);
  });
});
