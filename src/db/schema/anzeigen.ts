/**
 * BHA / Bedenken — formelle Anzeigen nach VOB/B.
 *
 *   § 6 Abs. 1 VOB/B  — Behinderungsanzeige (BHA)
 *   § 4 Abs. 3 VOB/B  — Bedenkenanmeldung
 *
 * Eine Tabelle, kind-diskriminiert. BHA- und Bedenken-spezifische Felder
 * existieren als nullable Spalten — die Schema-Validierung erzwingt die
 * jeweils relevanten Pflichtfelder, nicht die DB.
 */
import { pgTable, text, integer, real, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const anzeigen = pgTable(
  "anzeigen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["behinderung", "bedenken"] }).notNull(),
    status: text("status", {
      enum: [
        "entwurf",
        "versendet",
        "bestaetigt",
        "zurueckgewiesen",
        "erledigt",
      ],
    })
      .notNull()
      .default("entwurf"),

    title: text("title").notNull(),
    /** Kurz-Sachverhalt — 1–3 Sätze. */
    subjectMatter: text("subject_matter").notNull(),
    /** Volltext der Anzeige (Markdown). */
    bodyMarkdown: text("body_markdown").notNull(),
    /** Vorausgefüllt je kind („§ 6 Abs. 1 VOB/B" / „§ 4 Abs. 3 VOB/B"). */
    legalBasis: text("legal_basis").notNull(),

    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email"),
    recipientRole: text("recipient_role", {
      enum: [
        "ag_vertreter",
        "bauleiter_ag",
        "architekt",
        "fachplaner",
        "sonstiges",
      ],
    }),

    /* ---- BHA-spezifisch (§ 6 Abs. 1 VOB/B) ---- */
    /** Wann beginnt/begann die Behinderung? */
    obstructionStart: text("obstruction_start"),
    /** Geschätzte Dauer in Tagen — Basis für Verlängerungsanspruch. */
    estimatedDurationDays: integer("estimated_duration_days"),
    /** Geschätzte Mehrkosten in € — Basis für Schadensersatz § 6 Abs. 6. */
    estimatedExtraCost: real("estimated_extra_cost"),
    causedBy: text("caused_by", {
      enum: [
        "ag_anordnung",
        "fehlende_plaene",
        "vorgewerk",
        "hoehere_gewalt",
        "wetter",
        "streik",
        "sonstiges",
      ],
    }),

    /* ---- Bedenken-spezifisch (§ 4 Abs. 3 VOB/B) ---- */
    concernAbout: text("concern_about", {
      enum: [
        "ausfuehrungsart",
        "bauseits_stoffe",
        "vorleistung",
        "planvorgabe",
        "sonstiges",
      ],
    }),
    /** Mögliche Folgen, wenn Bedenken nicht ausgeräumt werden. */
    potentialDamage: text("potential_damage"),
    /** Vorschlag für Alternative / Klärungsweg. */
    proposedSolution: text("proposed_solution"),

    /* ---- Workflow-Timestamps (ISO-Date) ---- */
    sentAt: text("sent_at"),
    acknowledgedAt: text("acknowledged_at"),
    responseReceivedAt: text("response_received_at"),
    responseSummary: text("response_summary"),

    /** Verkettung zum auslösenden Bautagebuch-Eintrag. */
    sourceBautagebuchEntryId: text("source_bautagebuch_entry_id"),

    notes: text("notes"),

    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_anzeigen_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceStatusIdx: index("idx_anzeigen_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    workspaceKindIdx: index("idx_anzeigen_workspace_kind").on(
      t.workspaceId,
      t.kind
    ),
    sentAtIdx: index("idx_anzeigen_sent_at").on(t.workspaceId, t.sentAt),
  })
);
