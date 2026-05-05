/**
 * Bemusterungs-Protokoll (LP5/LP8).
 *
 * Klassische Architekten-/Bauleiter-Aufgabe: Materialien und Oberflächen
 * werden dem AG vorgelegt, der wählt aus. Ohne Protokoll später Streit
 * über „so wollte ich das nicht".
 *
 * AG-Bestätigung erfolgt entweder analog (Unterschrift gescannt → Foto)
 * oder per Token-Link (signaturToken + signaturSignedAt) — analog dem
 * Aufmaß-Prüfer-Pattern, hier aber inline ohne separate Token-Tabelle.
 */
import { pgTable, text, integer, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const bemusterungen = pgTable(
  "bemusterungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    datum: text("datum").notNull(),
    gewerk: text("gewerk").notNull(),
    /** Raum, Bauteil oder Bauabschnitt. */
    raumBauteil: text("raum_bauteil"),
    /** Beschreibung Material/Oberfläche. */
    material: text("material").notNull(),
    hersteller: text("hersteller"),
    artikelNr: text("artikel_nr"),
    farbeVariante: text("farbe_variante"),
    /** Empfehlung des Planers an den AG (welche Variante). */
    empfehlung: text("empfehlung"),
    agEntscheidung: text("ag_entscheidung", {
      enum: ["offen", "ausgewaehlt", "abgelehnt", "alternative"],
    })
      .notNull()
      .default("offen"),
    agEntscheiderName: text("ag_entscheider_name"),
    agEntscheidungDatum: text("ag_entscheidung_datum"),
    /** Token für AG-Token-Signatur (UUID v4). Optional. */
    signaturToken: text("signatur_token"),
    signaturSignedAt: timestamp("signatur_signed_at"),
    signaturSignedBy: text("signatur_signed_by"),
    /** JSON-Array von Foto-Dateinamen (Muster, Farbkarte). */
    fotoFilenamesJson: text("foto_filenames_json"),
    status: text("status", {
      enum: ["entwurf", "vorgelegt", "entschieden"],
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
    byProject: index("idx_bemusterung_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    byStatus: index("idx_bemusterung_status").on(t.workspaceId, t.status),
    tokenUnq: uniqueIndex("unq_bemusterung_signatur_token").on(t.signaturToken),
  })
);
