/**
 * Personal-Domain — Mitarbeiter-Tools (Reiter "Personal").
 *
 * mitarbeiter_projekte — N:M-Zuordnung Mitarbeiter ↔ Projekt mit Rolle,
 * optionalem Zeitraum und Allokationsanteil. Ergänzt die Stunden-Tabelle:
 * Stunden sind die Ist-Buchung pro Tag; Zuordnung ist die Plan-/Stamm-Aussage,
 * "MA X arbeitet aktuell auf Projekt Y in Rolle Z".
 */
import { pgTable, text, integer, real, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";
import { mitarbeiter } from "./stunden";

export const mitarbeiterProjekte = pgTable(
  "mitarbeiter_projekte",
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
    /** Freitext-Rolle, z. B. "Polier", "Bauleiter", "Tragwerksplaner". */
    rolle: text("rolle"),
    /** ISO-Date YYYY-MM-DD, optional — Default = unbefristet ab Anlage. */
    startDatum: text("start_datum"),
    endDatum: text("end_datum"),
    /** Allokationsanteil 0..1 (z. B. 0.5 = halbtags auf dem Projekt). */
    allokation: real("allokation").default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_mitarbeiter_projekte_workspace").on(t.workspaceId),
    maIdx: index("idx_mitarbeiter_projekte_ma").on(t.workspaceId, t.mitarbeiterId),
    projektIdx: index("idx_mitarbeiter_projekte_projekt").on(
      t.workspaceId,
      t.projektId
    ),
  })
);
