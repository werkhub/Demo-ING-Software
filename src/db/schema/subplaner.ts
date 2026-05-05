/**
 * Subplaner-Vergabe — Ingenieurbüros vergeben Fachplaner-Leistungen weiter
 * (Tragwerk, TGA, Brandschutz, Vermessung, Geotechnik, Schall).
 *
 * Schlanker als nu-operations (Bauunternehmer): keine Aufmaße,
 * Sicherheitseinbehalte oder Reverse-Charge-Workflow.
 */
import { pgTable, text, integer, index , timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const subplanerVergaben = pgTable(
  "subplaner_vergaben",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fachplanerName: text("fachplaner_name").notNull(),
    fachplanerKontakt: text("fachplaner_kontakt"),
    leistungsbereich: text("leistungsbereich", {
      enum: [
        "tragwerk",
        "tga",
        "brandschutz",
        "vermessung",
        "geotechnik",
        "schall",
        "sonstiges",
      ],
    }).notNull(),
    /** JSON-Array der LPs, die hier vergeben sind: [3,4,5] */
    lpReferenzJson: text("lp_referenz_json"),
    vergabeDatum: text("vergabe_datum"),
    vergabeSummeCents: integer("vergabe_summe_cents"),
    status: text("status", {
      enum: ["angefragt", "beauftragt", "abgeschlossen", "storniert"],
    })
      .notNull()
      .default("angefragt"),
    dokumentPfad: text("dokument_pfad"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => ({
    byProjekt: index("idx_subplaner_projekt").on(t.projektId),
    byStatus: index("idx_subplaner_status").on(t.workspaceId, t.status),
  })
);
