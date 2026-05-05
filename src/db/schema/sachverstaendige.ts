/**
 * Sachverständigen-Beauftragung (z. B. nach § 485 ZPO,
 * Selbständiges Beweisverfahren).
 *
 * Bei Streit über Mangel-Ursache, Aufmaß-Mengen oder Bauverlauf wird ein
 * Sachverständiger beauftragt. Der Akt hält fest: Anlass, Fragestellung,
 * Rechtsgrundlage, Kosten-Aufteilung, Gutachten-Ergebnis.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const sachverstaendige = pgTable(
  "sachverstaendige",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    anlass: text("anlass", {
      enum: [
        "maengelstreit",
        "aufmassstreit",
        "baufortschritt",
        "baumangel",
        "sonstiges",
      ],
    }).notNull(),
    /** Welche Fragestellung soll der Sachverständige beantworten? */
    fragestellung: text("fragestellung").notNull(),
    rechtsgrundlage: text("rechtsgrundlage", {
      enum: [
        "paragraph_485_zpo",
        "privatauftrag",
        "gerichtsbeauftragt",
        "sonstiges",
      ],
    })
      .notNull()
      .default("privatauftrag"),
    sachverstaendigerName: text("sachverstaendiger_name"),
    sachverstaendigerOrganization: text("sachverstaendiger_organization"),
    sachverstaendigerEmail: text("sachverstaendiger_email"),
    sachverstaendigerPhone: text("sachverstaendiger_phone"),
    beauftragtAm: text("beauftragt_am"),
    fristGutachten: text("frist_gutachten"),
    kostenGeschaetztCents: integer("kosten_geschaetzt_cents"),
    kostenTraeger: text("kosten_traeger", {
      enum: ["ag", "an", "geteilt", "streit"],
    }),
    status: text("status", {
      enum: ["angefragt", "beauftragt", "gutachten_erhalten", "geschlossen"],
    })
      .notNull()
      .default("angefragt"),
    gutachtenPath: text("gutachten_path"),
    gutachtenFilename: text("gutachten_filename"),
    ergebnisZusammenfassung: text("ergebnis_zusammenfassung"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    byProject: index("idx_sachverstaendige_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    byStatus: index("idx_sachverstaendige_status").on(
      t.workspaceId,
      t.status
    ),
  })
);
