/**
 * Modul 3.4 — Material & Lieferscheine.
 *
 * Bestellung → Lieferschein → Eingangsrechnung (3-Way-Match) für Material
 * und Hilfsstoffe. Verknüpft optional mit lv_items (Modul 0017) für
 * Nachkalkulation (Modul 4.1) und mit rechnungen (0011) für den Match.
 *
 * State-Machine Bestellung:
 *   offen → teilgeliefert → vollstaendig
 *                        ↘ storniert
 *
 * State-Machine Lieferschein:
 *   eingegangen → geprueft → abgeschlossen
 *                         ↘ reklamation → abgeschlossen
 *
 * Match-Status:
 *   ok           — Mengen + Beträge innerhalb Toleranz
 *   abweichung   — eine oder mehrere Positionen außerhalb Toleranz
 *   unklar       — z. B. Bestellung/Rechnung passen Pos-zu-Pos nicht eindeutig
 */
import { pgTable, text, integer, real, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";
import { lvItems } from "./lv";
import { rechnungen } from "./rechnungen";

export const bestellungen = pgTable(
  "bestellungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    lieferantName: text("lieferant_name").notNull(),
    /** Frei-Text/UUID — kein FK auf subcontractors (Material-Lieferanten ≠ NU). */
    lieferantId: text("lieferant_id"),
    bestellnummer: text("bestellnummer").notNull(),
    /** ISO YYYY-MM-DD. */
    datum: text("datum").notNull(),
    status: text("status", {
      enum: ["offen", "teilgeliefert", "vollstaendig", "storniert"],
    })
      .notNull()
      .default("offen"),
    summeNettoCents: integer("summe_netto_cents").notNull().default(0),
    ustSatzPct: real("ust_satz_pct").notNull().default(19),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_bestellungen_workspace").on(t.workspaceId),
    projektIdx: index("idx_bestellungen_projekt").on(t.workspaceId, t.projektId),
    statusIdx: index("idx_bestellungen_status").on(t.workspaceId, t.status),
    nrUnique: uniqueIndex("idx_bestellungen_nr_unique").on(
      t.workspaceId,
      t.bestellnummer
    ),
  })
);

export const bestellungenPositionen = pgTable(
  "bestellungen_positionen",
  {
    id: text("id").primaryKey(),
    bestellungId: text("bestellung_id")
      .notNull()
      .references(() => bestellungen.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    posNr: text("pos_nr").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    menge: real("menge").notNull(),
    einheit: text("einheit").notNull(),
    einzelpreisCents: integer("einzelpreis_cents").notNull(),
    gesamtpreisCents: integer("gesamtpreis_cents").notNull(),
    /** Optional: Verknüpfung zu LV-Position für Nachkalkulation. */
    lvPositionId: text("lv_position_id").references(() => lvItems.id, {
      onDelete: "set null",
    }),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    bestellungIdx: index("idx_bestellpos_bestellung").on(t.bestellungId),
    workspaceIdx: index("idx_bestellpos_workspace").on(t.workspaceId),
    lvIdx: index("idx_bestellpos_lv").on(t.lvPositionId),
  })
);

export const lieferscheine = pgTable(
  "lieferscheine",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Optional — Wareneingang ohne Bestellung ist erlaubt. */
    bestellungId: text("bestellung_id").references(() => bestellungen.id, {
      onDelete: "set null",
    }),
    lsNr: text("ls_nr").notNull(),
    /** ISO YYYY-MM-DD. */
    datum: text("datum").notNull(),
    lieferantName: text("lieferant_name").notNull(),
    angenommenVon: text("angenommen_von"),
    status: text("status", {
      enum: ["eingegangen", "geprueft", "reklamation", "abgeschlossen"],
    })
      .notNull()
      .default("eingegangen"),
    fotoFilename: text("foto_filename"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_lieferscheine_workspace").on(t.workspaceId),
    projektIdx: index("idx_lieferscheine_projekt").on(t.workspaceId, t.projektId),
    statusIdx: index("idx_lieferscheine_status").on(t.workspaceId, t.status),
    bestellungIdx: index("idx_lieferscheine_bestellung").on(t.bestellungId),
    nrUnique: uniqueIndex("idx_lieferscheine_nr_unique").on(
      t.workspaceId,
      t.projektId,
      t.lsNr
    ),
  })
);

export const lieferscheinePositionen = pgTable(
  "lieferscheine_positionen",
  {
    id: text("id").primaryKey(),
    lsId: text("ls_id")
      .notNull()
      .references(() => lieferscheine.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Optional: Verknüpfung zur Bestell-Position (für Match). */
    bestellposId: text("bestellpos_id").references(
      () => bestellungenPositionen.id,
      { onDelete: "set null" }
    ),
    bezeichnung: text("bezeichnung").notNull(),
    menge: real("menge").notNull(),
    einheit: text("einheit").notNull(),
    mangelText: text("mangel_text"),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    lsIdx: index("idx_lspos_ls").on(t.lsId),
    workspaceIdx: index("idx_lspos_workspace").on(t.workspaceId),
    bestellposIdx: index("idx_lspos_bestellpos").on(t.bestellposId),
  })
);

export const materialMatch = pgTable(
  "material_match",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    bestellungId: text("bestellung_id")
      .notNull()
      .references(() => bestellungen.id, { onDelete: "cascade" }),
    /** JSON-Array der involvierten Lieferschein-IDs. */
    lsIdsJson: text("ls_ids_json").notNull().default("[]"),
    rechnungId: text("rechnung_id")
      .notNull()
      .references(() => rechnungen.id, { onDelete: "cascade" }),
    matchStatus: text("match_status", {
      enum: ["ok", "abweichung", "unklar"],
    }).notNull(),
    /** JSON-Detail-Objekt: {abweichungen: [{posNr, art, expected, actual, deltaPct}]}. */
    matchDetailsJson: text("match_details_json").notNull().default("{}"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_material_match_workspace").on(t.workspaceId),
    projektIdx: index("idx_material_match_projekt").on(t.workspaceId, t.projektId),
    statusIdx: index("idx_material_match_status").on(t.workspaceId, t.matchStatus),
    rechnungIdx: index("idx_material_match_rechnung").on(t.rechnungId),
  })
);
