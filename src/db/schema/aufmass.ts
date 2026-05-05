/**
 * Aufmaß REB 23.003 — Mengenermittlung der erbrachten Leistung pro
 * LV-Position, mit arithmetischer Formel-Sprache.
 *
 *   REB-VB 23.003   — Standard für maschinenlesbare Aufmaß-Datenträger
 *   DA 11           — Aufmaß-Eingabe AN → AG
 *   DA 12           — Aufmaß-Rückübergabe AG → AN
 *
 * 1:n pro LV (eines pro Abrechnungsperiode), nicht kumulativ.
 * unitPrice wird als Snapshot mitgespeichert — Aufmaß bleibt stabil bei
 * späteren LV-EP-Änderungen.
 */
import { pgTable, text, integer, real, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";
import { lv, lvItems } from "./lv";

export const aufmass = pgTable(
  "aufmass",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    lvId: text("lv_id")
      .notNull()
      .references(() => lv.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Aufmaß"),
    periodStart: text("period_start"),
    periodEnd: text("period_end"),
    status: text("status", {
      enum: [
        "entwurf",
        "eingereicht",
        "geprueft",
        "freigegeben",
        "abgerechnet",
      ],
    })
      .notNull()
      .default("entwurf"),
    submittedAt: timestamp("submitted_at"),
    checkedAt: timestamp("checked_at"),
    releasedAt: timestamp("released_at"),
    /** Cached — neu berechnet bei jedem Zeilen-Update. */
    totalNet: real("total_net").notNull().default(0),
    /** Cached — Summe der approvedTotal (oder totalPrice wenn nicht gekürzt). */
    totalApprovedNet: real("total_approved_net").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_aufmass_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceStatusIdx: index("idx_aufmass_workspace_status").on(
      t.workspaceId,
      t.status
    ),
  })
);

export const aufmassZeilen = pgTable(
  "aufmass_zeilen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    aufmassId: text("aufmass_id")
      .notNull()
      .references(() => aufmass.id, { onDelete: "cascade" }),
    /** Soft-Bezug: bei LV-Item-Löschung → SET NULL, Aufmaßzeile bleibt. */
    lvItemId: text("lv_item_id").references(() => lvItems.id, {
      onDelete: "set null",
    }),
    /** OZ-Override für freie Positionen ohne LV-Bezug oder bei abweichendem Vermerk. */
    ozOverride: text("oz_override"),
    description: text("description").notNull(),
    /** Rohe REB-Formel (z. B. „3,50 * 2,80 - 0,90 * 2,10"). */
    formula: text("formula"),
    /** Ausgewerteter Wert. Null wenn Formel ungültig. */
    computedQuantity: real("computed_quantity"),
    /** Parser-Fehlerbeschreibung — null wenn ok. */
    formulaError: text("formula_error"),
    /** Snapshot von LV-Position. */
    unit: text("unit"),
    unitPrice: real("unit_price"),
    totalPrice: real("total_price"),
    sortIndex: integer("sort_index").notNull().default(0),
    status: text("status", {
      enum: ["offen", "zugestimmt", "gekuerzt", "bestritten"],
    })
      .notNull()
      .default("offen"),
    /** Wenn Prüfer kürzt: tatsächlich anerkannte Menge. */
    approvedQuantity: real("approved_quantity"),
    approvedTotal: real("approved_total"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceAufmassIdx: index("idx_aufmass_zeilen_workspace_aufmass").on(
      t.workspaceId,
      t.aufmassId
    ),
    aufmassSortIdx: index("idx_aufmass_zeilen_aufmass_sort").on(
      t.aufmassId,
      t.sortIndex
    ),
  })
);
