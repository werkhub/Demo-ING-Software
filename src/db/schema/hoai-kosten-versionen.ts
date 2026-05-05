/**
 * Anrechenbare-Kosten-Versionierung für HOAI-Honorar.
 *
 * § 6 I HOAI definiert die anrechenbaren Kosten als Honorar-Grundlage.
 * § 10 II HOAI sieht Anpassung des Honorars bei Kostenänderungen vor —
 * ohne historische Versionierung lässt sich der Nach-Honoraranspruch
 * im Streit nicht durchsetzen.
 *
 * `projects.hoaiAnrechenbareKostenCents` bleibt der CACHE des aktuellen
 * Werts. Diese Tabelle hält die Historie + den jeweiligen Anlass.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const hoaiKostenVersionen = pgTable(
  "hoai_kosten_versionen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Stichtag der Kostengrundlage (YYYY-MM-DD). */
    effectiveAt: text("effective_at").notNull(),
    /** Anrechenbare Kosten netto in Cents. */
    anrechenbareKostenCents: integer("anrechenbare_kosten_cents").notNull(),
    /** Auslöser — ordnet die Version in den HOAI-Kostenrahmen ein. */
    anlass: text("anlass", {
      enum: [
        "planung_grundlage",
        "kostenanschlag",
        "kostenfeststellung",
        "aenderung_ag",
        "aenderung_planung",
      ],
    }).notNull(),
    /** Cached: berechnete Honorarsumme netto auf Basis dieser Version. */
    honorarsummeNettoCents: integer("honorarsumme_netto_cents"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    byProject: index("idx_hoai_kosten_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    byEffective: index("idx_hoai_kosten_effective").on(
      t.projectId,
      t.effectiveAt
    ),
  })
);
