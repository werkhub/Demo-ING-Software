/**
 * Architekten-Hinweispflicht (§ 650p BGB / Werkvertragsrecht).
 *
 * Architekten und Ingenieurbüros haften für unterlassene Hinweise auf
 * Kostensteigerungen, Planungsfehler-Risiken oder ungeeignete Materialien.
 * Ohne dokumentierten Hinweis greift im Streit die Vermutung schlechter
 * Beratung — Honorarminderung oder Schadensersatz drohen.
 *
 * Pflicht ist nicht der Inhalt des Hinweises, sondern die BEWEISBARKEIT:
 * wer hat wann gegenüber wem in welcher Form was gesagt, und wie hat der
 * AG reagiert.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const hinweise = pgTable(
  "hinweise",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Auslöser des Hinweises — bestimmt, welche Norm-Pflicht greift. */
    anlass: text("anlass", {
      enum: [
        "kostensteigerung",
        "planungsaenderung",
        "materialwahl",
        "risiko",
        "terminverzug",
        "sonstiges",
      ],
    }).notNull(),
    /** Datum der Hinweis-Erteilung (YYYY-MM-DD). */
    datum: text("datum").notNull(),
    /** Empfänger — wer wurde adressiert. */
    empfaengerName: text("empfaenger_name").notNull(),
    empfaengerRolle: text("empfaenger_rolle"),
    /** Form des Hinweises — Schriftform = beste Beweislage. */
    form: text("form", {
      enum: ["muendlich", "schriftlich", "email"],
    }).notNull(),
    /** Wortlaut/Zusammenfassung des Hinweises. Pflicht — sonst kein Beweis. */
    wortlaut: text("wortlaut").notNull(),
    /** Geschätzte Kostenwirkung des Hinweises (Cents netto). */
    potentialKostenwirkungCents: integer("potential_kostenwirkung_cents"),
    agReaktion: text("ag_reaktion", {
      enum: ["keine", "akzeptiert", "abgelehnt", "in_bearbeitung"],
    })
      .notNull()
      .default("keine"),
    agReaktionDatum: text("ag_reaktion_datum"),
    agReaktionText: text("ag_reaktion_text"),
    /** Optional: Pfad zum Beweisdokument (E-Mail-Export, Brief-PDF). */
    beweismittelPath: text("beweismittel_path"),
    beweismittelFilename: text("beweismittel_filename"),
    status: text("status", {
      enum: ["entwurf", "erteilt", "nachverfolgt", "geschlossen"],
    })
      .notNull()
      .default("entwurf"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    byProject: index("idx_hinweise_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    byStatus: index("idx_hinweise_status").on(t.workspaceId, t.status),
  })
);
