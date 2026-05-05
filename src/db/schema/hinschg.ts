/**
 * HinSchG-Hinweisgebersystem (Hinweisgeberschutzgesetz, in Kraft 02.07.2023).
 *
 * Pflicht ab 50 Beschäftigten:
 *   § 12 ff. HinSchG  — interne Meldestelle
 *   § 16 HinSchG      — Meldekanäle (mündlich, schriftlich, persönlich)
 *   § 17 HinSchG      — Eingangsbestätigung 7 T + Rückmeldung 3 Mon.
 *   § 11 HinSchG      — Aufbewahrung 3 J. nach Abschluss
 *   § 36 ff. HinSchG  — Repressalienverbot
 *
 * Datensparsamkeit: keine IP-Logs, keine Zeitzonen-Drift, kein Tracking.
 * Anonymität via accessToken (UUID v4) — der Hinweisgebende kann damit den
 * Status abrufen, ohne sich zu identifizieren.
 */
import { pgTable, text, integer, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";

export const hinschgMeldungen = pgTable(
  "hinschg_meldungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /**
     * Pseudonym für den Hinweisgebenden — UUID v4 als Klartext-Token. Genug
     * Entropie (122 bit) für Anonymität, einfache Handhabung („Bewahre auf!").
     */
    accessToken: text("access_token").notNull(),
    submittedAt: timestamp("submitted_at")
      .notNull()
      .$defaultFn(() => new Date()),
    isAnonymous: boolean("is_anonymous")
      .notNull()
      .default(true),
    /** Bewusst opaque (E-Mail oder Telefon, freier Text). */
    reporterContact: text("reporter_contact"),
    /** Spitzname/Pseudonym für die Kommunikation („Hinweis-Geber X"). */
    reporterDisplayName: text("reporter_display_name"),
    category: text("category", {
      enum: [
        "korruption",
        "diskriminierung",
        "arbeitssicherheit",
        "umwelt",
        "datenschutz",
        "finanz",
        "arbeitsrecht",
        "sonstiges",
      ],
    })
      .notNull()
      .default("sonstiges"),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    status: text("status", {
      enum: [
        "eingegangen",
        "in_pruefung",
        "massnahme_ergriffen",
        "abgeschlossen",
        "unbegruendet",
        "archiviert",
      ],
    })
      .notNull()
      .default("eingegangen"),
    /** Eingangsbestätigung — § 17 II HinSchG (7-Tage-Frist). */
    acknowledgedAt: timestamp("acknowledged_at"),
    /** Soll-Datum 3 Mon. nach submittedAt — § 17 II HinSchG (Rückmeldung). */
    responseDeadline: text("response_deadline").notNull(),
    /** Zusammenfassung der ergriffenen Maßnahmen für den Hinweisgebenden. */
    responseSummary: text("response_summary"),
    closedAt: timestamp("closed_at"),
    assignedToUserId: text("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Nur intern — nicht im Status-Abruf des Hinweisgebenden sichtbar. */
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    accessTokenUnq: uniqueIndex("unq_hinschg_access_token").on(t.accessToken),
    workspaceStatusIdx: index("idx_hinschg_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    workspaceSubmittedIdx: index("idx_hinschg_workspace_submitted").on(
      t.workspaceId,
      t.submittedAt
    ),
  })
);

/**
 * Kommunikations-Faden zwischen Hinweisgebendem und Meldestelle. Beidseitig
 * über den accessToken zugänglich; Reihenfolge nach createdAt.
 */
export const hinschgMessages = pgTable(
  "hinschg_messages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    meldungId: text("meldung_id")
      .notNull()
      .references(() => hinschgMeldungen.id, { onDelete: "cascade" }),
    direction: text("direction", {
      enum: ["from_reporter", "from_office"],
    }).notNull(),
    bodyText: text("body_text").notNull(),
    /** Nur bei direction=from_office gesetzt; bei from_reporter null. */
    authorUserId: text("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    meldungIdx: index("idx_hinschg_messages_meldung").on(
      t.workspaceId,
      t.meldungId
    ),
  })
);
