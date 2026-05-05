/**
 * Nachkalkulation — Snapshot-Tabelle.
 *
 * Live-Aggregation per Query (kein View) in src/lib/nachkalk/aggregate.ts.
 * Snapshots persistieren historische Stände für Trend-Vergleich.
 */
import { pgTable, text, integer, real, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const nachkalkulationSnapshots = pgTable(
  "nachkalkulation_snapshots",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** ISO-Date YYYY-MM-DD — Stichtag des Snapshots. */
    stichtag: text("stichtag").notNull(),
    sollNettoCents: integer("soll_netto_cents").notNull().default(0),
    istLohnCents: integer("ist_lohn_cents").notNull().default(0),
    istMaterialCents: integer("ist_material_cents").notNull().default(0),
    istNuCents: integer("ist_nu_cents").notNull().default(0),
    deckungsbeitragCents: integer("deckungsbeitrag_cents").notNull().default(0),
    /** Geschätzter Fertigstellungsgrad 0..1 — Default = projects.progress. */
    fertigstellungsgradPct: real("fertigstellungsgrad_pct")
      .notNull()
      .default(0),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    /** Per-LV-Position-Detail als JSON für historische Drilldowns. */
    snapshotJson: text("snapshot_json"),
    notes: text("notes"),
  },
  (t) => ({
    workspaceIdx: index("idx_nachkalk_workspace").on(t.workspaceId),
    projektStichtagIdx: index("idx_nachkalk_projekt_stichtag").on(
      t.projektId,
      t.stichtag
    ),
  })
);
