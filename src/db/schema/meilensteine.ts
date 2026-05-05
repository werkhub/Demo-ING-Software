/**
 * Bauterminplan — Meilenstein-basiert (Slim, kein Gantt).
 *
 * Bewusst KEIN Vorgänger/Nachfolger-Modell, KEIN kritischer Pfad — das ist
 * MS Project / Asta Powerproject. Hier nur: Liste markanter Termine pro
 * Projekt mit Soll-/Ist-Datum und Status. Reicht für ING-Bauleiter, um
 * AG-Berichte zu führen und Verzug zu dokumentieren.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const meilensteine = pgTable(
  "meilensteine",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    bezeichnung: text("bezeichnung").notNull(),
    beschreibung: text("beschreibung"),
    /** Sortier-Reihenfolge innerhalb des Projekts. */
    reihenfolge: integer("reihenfolge").notNull().default(0),
    /** Geplanter Termin (YYYY-MM-DD). */
    sollDatum: text("soll_datum").notNull(),
    /** Tatsächlich erreichter Termin — gesetzt bei status=erreicht. */
    istDatum: text("ist_datum"),
    status: text("status", {
      enum: ["geplant", "laufend", "erreicht", "verzoegert", "abgesagt"],
    })
      .notNull()
      .default("geplant"),
    /** Bei status=verzoegert: Grund für Audit. */
    verzoegerungGrund: text("verzoegerung_grund"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    byProject: index("idx_meilensteine_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    bySoll: index("idx_meilensteine_soll").on(t.projectId, t.sollDatum),
  })
);
