/**
 * Stundenerfassung — tagesweise Personal-Stunden je MA × Projekt × LV-Pos.
 *
 * Drei Tabellen:
 *   mitarbeiter        — Stamm-MA mit Lohnart/Stundensatz/Kostenstelle
 *   stunden            — Tagesbuchung (Pflicht: ma, projekt, datum, stunden)
 *   stunden_wochen_lock — Wochenweise Sperre nach Lohnlauf
 *
 * Idempotenz Cron-Reminder läuft über Marker im notes-Feld
 * (`[auto-vorgang:<sourceId>]`), damit mehrfache Reminder-Läufe pro Woche
 * keine Duplikat-Vorgänge erzeugen.
 */
import { pgTable, text, integer, real, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const mitarbeiter = pgTable(
  "mitarbeiter",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    personalnummer: text("personalnummer"),
    lohnart: text("lohnart", { enum: ["stunden", "monat"] })
      .notNull()
      .default("stunden"),
    stundensatzCents: integer("stundensatz_cents").notNull().default(0),
    monatsgehaltCents: integer("monatsgehalt_cents").default(0),
    /** Default 173.33 = 40h/Woche × 4.333 Wochen/Monat. */
    monatsSollStunden: real("monats_soll_stunden").default(173.33),
    kostenstelle: text("kostenstelle"),
    gewerk: text("gewerk"),
    eintrittDatum: text("eintritt_datum"),
    austrittDatum: text("austritt_datum"),
    aktiv: boolean("aktiv").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_mitarbeiter_workspace").on(t.workspaceId),
    workspaceAktivIdx: index("idx_mitarbeiter_workspace_aktiv").on(
      t.workspaceId,
      t.aktiv
    ),
  })
);

export const stunden = pgTable(
  "stunden",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mitarbeiterId: text("mitarbeiter_id")
      .notNull()
      .references(() => mitarbeiter.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** ISO-Date YYYY-MM-DD. */
    datum: text("datum").notNull(),
    stunden: real("stunden").notNull(),
    taetigkeit: text("taetigkeit"),
    /** Optional — Verknüpfung zu lv_items für Nachkalkulation (Modul 4.1). */
    lvPositionId: text("lv_position_id"),
    /** Snapshot des Stundensatzes zum Erfassungszeitpunkt — schützt vor
     *  rückwirkender Änderung beim MA-Stamm. */
    stundensatzCents: integer("stundensatz_cents").notNull().default(0),
    gesperrt: boolean("gesperrt").notNull().default(false),
    gesperrtAm: timestamp("gesperrt_am"),
    gesperrtVon: text("gesperrt_von"),
    /** Leistungsphase 1-9 — relevant für Ingenieurbüros (HOAI-Soll-Ist).
     *  Optional, bei Bauunternehmen-Stunden bleibt null. */
    leistungsphase: integer("leistungsphase"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    createdBy: text("created_by"),
  },
  (t) => ({
    workspaceDatumIdx: index("idx_stunden_workspace_datum").on(
      t.workspaceId,
      t.datum
    ),
    wsMaDatumIdx: index("idx_stunden_ws_ma_datum").on(
      t.workspaceId,
      t.mitarbeiterId,
      t.datum
    ),
    projektDatumIdx: index("idx_stunden_projekt_datum").on(
      t.projektId,
      t.datum
    ),
    lvPositionIdx: index("idx_stunden_lv_position").on(t.lvPositionId),
    lpIdx: index("idx_stunden_lp").on(
      t.workspaceId,
      t.projektId,
      t.leistungsphase
    ),
  })
);

export const stundenWochenLock = pgTable(
  "stunden_wochen_lock",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    jahr: integer("jahr").notNull(),
    /** ISO-Wochennummer 1..53 nach ISO 8601. */
    kw: integer("kw").notNull(),
    gesperrtAm: timestamp("gesperrt_am")
      .notNull()
      .$defaultFn(() => new Date()),
    gesperrtVon: text("gesperrt_von"),
    notes: text("notes"),
  },
  (t) => ({
    uniqueLock: uniqueIndex("idx_stunden_lock_unique").on(
      t.workspaceId,
      t.jahr,
      t.kw
    ),
  })
);
