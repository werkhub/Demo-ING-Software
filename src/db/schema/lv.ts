/**
 * Leistungsverzeichnis (LV) — strukturierte Stückliste pro Bauauftrag.
 *
 *   GAEB DA XML 3.x  — Standard-Austauschformat (X81 Anfrage / X83 Angebot /
 *                      X84 Auftrag / X86 Aufmaß-Übergabe)
 *
 * 1:1 pro Projekt (UNIQUE) — Nachträge sind keine eigenen LVs, sondern
 * ergänzende Positionen mit Trigger-Verkettung zu nachtraege.
 *
 * Hierarchie via parentId (self-FK): Titel → Untertitel → Positionen.
 * Vorteil gegenüber OZ-String-Parsing: robust gegen krumme Nummerierungen,
 * stabile Tree-Operationen.
 */
import { pgTable, text, integer, real, index, uniqueIndex, type AnyPgColumn, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const lv = pgTable(
  "lv",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Hauptauftrag"),
    /** Aus GAEB-Stammdaten (AwardingAuthority). */
    partyAg: text("party_ag"),
    /** Aus GAEB-Stammdaten (Bidder). */
    partyAn: text("party_an"),
    currency: text("currency").notNull().default("EUR"),
    status: text("status", {
      enum: ["entwurf", "angebot", "auftrag", "aufmass", "abgerechnet"],
    })
      .notNull()
      .default("entwurf"),
    gaebSourceFilename: text("gaeb_source_filename"),
    /** Z. B. „GAEB DA XML 3.2 / X84". */
    gaebSourceVersion: text("gaeb_source_version"),
    gaebSourcePath: text("gaeb_source_path"),
    gaebImportedAt: timestamp("gaeb_imported_at"),
    /** Cached — neu berechnet bei jedem Item-Update. */
    totalNet: real("total_net").notNull().default(0),
    totalGross: real("total_gross").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    projectUnq: uniqueIndex("unq_lv_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
  })
);

export const lvItems = pgTable(
  "lv_items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    lvId: text("lv_id")
      .notNull()
      .references(() => lv.id, { onDelete: "cascade" }),
    /**
     * Self-FK auf lv_items. null = Wurzel. Drizzle braucht den Type-Hint, weil
     * die Tabelle sich selbst referenziert (zirkuläre Inferenz).
     */
    parentId: text("parent_id").references(
      (): AnyPgColumn => lvItems.id,
      { onDelete: "cascade" }
    ),
    kind: text("kind", {
      enum: [
        "titel",
        "untertitel",
        "position",
        "eventual",
        "bedarfsposition",
        "stundenlohn",
      ],
    })
      .notNull()
      .default("position"),
    /** Ordnungszahl als Klartext, z. B. „01.02.030". */
    oz: text("oz"),
    shortText: text("short_text").notNull(),
    longText: text("long_text"),
    quantity: real("quantity"),
    unit: text("unit"),
    unitPrice: real("unit_price"),
    totalPrice: real("total_price"),
    vatPercent: real("vat_percent").notNull().default(19),
    sortIndex: integer("sort_index").notNull().default(0),
    /** GAEB-Identifikator (RNoPart) für Re-Import-Stabilität. */
    gaebExternalId: text("gaeb_external_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceLvIdx: index("idx_lv_items_workspace_lv").on(
      t.workspaceId,
      t.lvId
    ),
    parentIdx: index("idx_lv_items_lv_parent").on(t.lvId, t.parentId),
    sortIdx: index("idx_lv_items_lv_sort").on(t.lvId, t.sortIndex),
  })
);
