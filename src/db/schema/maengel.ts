/**
 * Mängel-Modul — phasen-übergreifender Lifecycle.
 *
 *   § 4 Abs. 7 VOB/B   — Mängel während der Bauausführung
 *   § 13 Abs. 5 VOB/B  — Mängelbeseitigung mit Fristsetzung
 *   § 13 Abs. 4 VOB/B  — Verjährung 4 J. (VOB)
 *   § 634a Abs. 1 BGB  — Verjährung 5 J. (BGB-Werkvertrag, Bauwerk)
 *
 * Phase-Diskriminator (`phase`):
 *   ausfuehrung     — vor Abnahme, AG/Bauleiter rügt während des Baus
 *   abnahme         — beim Abnahmeprotokoll dokumentiert (verlinkt auf abnahmen.id)
 *   gewaehrleistung — nach Abnahme, vor Ablauf der Verjährungsfrist
 *
 * Ersetzt das alte `abnahme_maengel` (Migration 0015 → 0029).
 */
import { pgTable, text, integer, index, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";
import { projects, subcontractors } from "./projekte";
import { abnahmen } from "./abnahme";

export const maengel = pgTable(
  "maengel",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phase: text("phase", {
      enum: ["ausfuehrung", "abnahme", "gewaehrleistung"],
    }).notNull(),
    /** Freie Klassifikation (Gewerk, Bauteil, Schadensbild). */
    kategorie: text("kategorie"),
    /** Sachverhalt — Pflicht. Erste Zeile dient als Listentitel. */
    beschreibung: text("beschreibung").notNull(),
    ortImBauwerk: text("ort_im_bauwerk"),
    /** Wer hat den Mangel gemeldet (freier Text — AG, Bauleiter, NU, Mieter …). */
    gemeldetVon: text("gemeldet_von"),
    /** ISO-Date — Pflicht. Rechtlich relevant für Fristberechnung. */
    gemeldetAm: text("gemeldet_am").notNull(),
    status: text("status", {
      enum: ["offen", "in_bearbeitung", "behoben", "abgelehnt", "strittig"],
    })
      .notNull()
      .default("offen"),
    prioritaet: text("prioritaet", {
      enum: ["niedrig", "mittel", "hoch", "kritisch"],
    })
      .notNull()
      .default("mittel"),
    /** Frist, die wir dem AN/NU gesetzt haben (§ 13 V VOB/B). */
    fristsetzungDatum: text("fristsetzung_datum"),
    /** Selbst zugesagter Behebungstermin durch AN/NU. */
    behebungBis: text("behebung_bis"),
    behobenAm: text("behoben_am"),
    behobenDurchNuId: text("behoben_durch_nu_id").references(
      () => subcontractors.id,
      { onDelete: "set null" }
    ),
    kostenGeschaetztCents: integer("kosten_geschaetzt_cents"),
    kostenIstCents: integer("kosten_ist_cents"),
    /** Bei phase=abnahme verlinkt auf das Abnahmeprotokoll. */
    abnahmeId: text("abnahme_id").references(() => abnahmen.id, {
      onDelete: "set null",
    }),
    /** JSON-Array von Foto-Dateinamen (Storage liegt außerhalb dieser Iteration). */
    fotoFilenamesJson: text("foto_filenames_json"),
    /** Verlinkung zum Bearbeitungs-Vorgang (ein Vorgang pro Mangel maximal). */
    linkedVorgangId: text("linked_vorgang_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_maengel_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspacePhaseIdx: index("idx_maengel_workspace_phase").on(
      t.workspaceId,
      t.phase
    ),
    workspaceStatusIdx: index("idx_maengel_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    workspaceFristIdx: index("idx_maengel_workspace_frist").on(
      t.workspaceId,
      t.fristsetzungDatum
    ),
    workspaceAbnahmeIdx: index("idx_maengel_workspace_abnahme").on(
      t.workspaceId,
      t.abnahmeId
    ),
  })
);

/**
 * Mängel-Anzeigen — Korrespondenz-Historie pro Mangel.
 *
 * Eine Anzeige ist ein versendetes Dokument (Mahnung, Mängelrüge, Frist-
 * setzung) an einen internen User oder externen Adressaten. Antworten
 * werden in derselben Zeile vermerkt (1:n von Anzeige → Antwort wäre Over-
 * engineering für die Domäne — eine Antwort pro Anzeige reicht).
 */
export const maengelAnzeigen = pgTable(
  "maengel_anzeigen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mangelId: text("mangel_id")
      .notNull()
      .references(() => maengel.id, { onDelete: "cascade" }),
    /** Adressat intern. */
    anzeigeAnUserId: text("anzeige_an_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Adressat extern (Name + Organisation, frei). */
    anzeigeAnExtern: text("anzeige_an_extern"),
    versendetAm: text("versendet_am").notNull(),
    versandweg: text("versandweg", {
      enum: ["email", "brief", "einschreiben", "uebergabe"],
    }).notNull(),
    inhaltText: text("inhalt_text").notNull(),
    antwortEingegangen: boolean("antwort_eingegangen")
      .notNull()
      .default(false),
    antwortText: text("antwort_text"),
    antwortDatum: text("antwort_datum"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceMangelIdx: index("idx_maengel_anzeigen_workspace_mangel").on(
      t.workspaceId,
      t.mangelId
    ),
    versendetIdx: index("idx_maengel_anzeigen_versendet").on(
      t.workspaceId,
      t.versendetAm
    ),
  })
);
