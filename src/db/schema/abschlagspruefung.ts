/**
 * Abschlagsrechnungs-Prüfung — eingehende Abschlagsrechnungen (NU/GU) gegen
 * LV, Aufmaß, vorherige Abschläge und VOB/B-Pflichtprüfungen abgleichen.
 *
 * Eine Tabelle, weil Positionen + Findings JSON-serialisiert mitleben (analog
 * `contracts.riskFindings`). Spart die Migration und genügt für die Demo —
 * sobald per-Position-Reporting nötig wird, wandert das in eigene Sub-Tabellen.
 */
import {
  pgTable,
  text,
  integer,
  index,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";
import { projects, subcontractors } from "./projekte";

export const abschlagspruefungen = pgTable(
  "abschlagspruefungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    /** Optional verknüpfter Lieferant (NU) — steuert §13b- und Bauabzug-Logik. */
    subcontractorId: text("subcontractor_id").references(
      () => subcontractors.id,
      { onDelete: "set null" }
    ),
    /** Lieferant frei eingebbar (Fallback, wenn kein NU verknüpft). */
    lieferant: text("lieferant").notNull(),
    rechnungsNr: text("rechnungs_nr").notNull(),
    /** YYYY-MM-DD. */
    rechnungsdatum: text("rechnungsdatum"),
    /** Lfd. Nr. der Abschlagsrechnung. */
    abschlagNo: integer("abschlag_no").notNull(),
    /** Gesamt-Brutto laut Rechnung (Eingang). */
    rechnungBruttoEur: real("rechnung_brutto_eur"),
    /** Empfohlener Zahlbetrag brutto nach Prüfung. */
    empfohleneZahlungBruttoEur: real("empfohlene_zahlung_brutto_eur"),
    /** Empfohlene Kürzung (positiv = abziehen). */
    empfohleneKuerzungEur: real("empfohlene_kuerzung_eur"),
    /** Score 0-100 (100 = sauber). */
    score: integer("score").notNull().default(0),
    findingsCount: integer("findings_count").notNull().default(0),
    decision: text("decision", {
      enum: ["freigeben", "kuerzen", "ablehnen", "offen"],
    })
      .notNull()
      .default("offen"),
    /** Status des Prüfvorgangs. */
    status: text("status", {
      enum: ["entwurf", "geprueft", "freigegeben", "abgelehnt"],
    })
      .notNull()
      .default("entwurf"),
    /** JSON: AbschlagPosition[] inkl. LV-/Aufmaß-Snapshot. */
    positionsJson: text("positions_json").notNull().default("[]"),
    /** JSON: CheckFinding[]. */
    findingsJson: text("findings_json").notNull().default("[]"),
    /** Markdown des generierten Korrektur-/Freigabe-Anschreibens. */
    letterDraftMarkdown: text("letter_draft_markdown"),
    /** Quelle: "manual" | "pdf" | "sample". */
    source: text("source", { enum: ["manual", "pdf", "sample"] })
      .notNull()
      .default("manual"),
    sourceFilename: text("source_filename"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_abschlag_workspace").on(t.workspaceId),
    workspaceProjectIdx: index("idx_abschlag_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceCreatedIdx: index("idx_abschlag_workspace_created").on(
      t.workspaceId,
      t.createdAt
    ),
  })
);
