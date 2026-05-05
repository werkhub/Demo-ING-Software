/**
 * Liquiditätsplanung — Cashflow-Forecast.
 *
 * Ein Szenario hält die Konfiguration (Annahmen über Zahlungsfristen,
 * Startsaldo, Horizont). Die Zeitreihe wird beim Erzeugen aus den
 * Quell-Tabellen aggregiert (siehe src/lib/liquiditaet/forecast.ts).
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";

export const liquiditaetSzenarien = pgTable(
  "liquiditaet_szenarien",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** ISO-Date YYYY-MM-DD — Tag, ab dem der Forecast startet. */
    basisdatum: text("basisdatum").notNull(),
    horizontTage: integer("horizont_tage").notNull().default(90),
    annahmeZahlungsfristTageAn: integer("annahme_zahlungsfrist_tage_an")
      .notNull()
      .default(14),
    annahmeZahlungsfristTageNu: integer("annahme_zahlungsfrist_tage_nu")
      .notNull()
      .default(30),
    kontostandStartCents: integer("kontostand_start_cents").notNull().default(0),
    notes: text("notes"),
    erstelltVon: text("erstellt_von"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_liq_szenarien_workspace").on(t.workspaceId),
  })
);

export const liquiditaetZeitreihe = pgTable(
  "liquiditaet_zeitreihe",
  {
    id: text("id").primaryKey(),
    szenarioId: text("szenario_id")
      .notNull()
      .references(() => liquiditaetSzenarien.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** ISO-Date YYYY-MM-DD. */
    datum: text("datum").notNull(),
    einnahmenCents: integer("einnahmen_cents").notNull().default(0),
    ausgabenCents: integer("ausgaben_cents").notNull().default(0),
    saldoCents: integer("saldo_cents").notNull().default(0),
    kontostandCents: integer("kontostand_cents").notNull().default(0),
    kommentar: text("kommentar"),
  },
  (t) => ({
    szenarioIdx: index("idx_liq_zeitreihe_szenario").on(t.szenarioId, t.datum),
    workspaceIdx: index("idx_liq_zeitreihe_workspace").on(
      t.workspaceId,
      t.datum
    ),
  })
);
