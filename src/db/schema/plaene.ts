/**
 * Versionierte Pläne + Dokumenten-Freigabe-Workflow.
 *
 *   plaene             — Plan-Stammdaten je Projekt.
 *   plaene_versionen   — Datei je Version (Zähler atomar in Server-Action).
 *   plaene_freigaben   — N:1 → eine Version, mehrere Freigaben (Bauherr,
 *                        Statiker, Polier). Aggregation in lib/plaene/index.ts:
 *                        wenn alle "zugestimmt" → Plan-Status freigegeben.
 *   dokumente          — Lose Projekt-Dokumente, kein Versions-Workflow.
 */
import { pgTable, text, integer, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";
import { projects } from "./projekte";

export const plaene = pgTable(
  "plaene",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    planTyp: text("plan_typ", {
      enum: [
        "architektur",
        "statik",
        "tga",
        "elektro",
        "sanitaer",
        "detail",
        "sonstiges",
      ],
    }).notNull(),
    planNr: text("plan_nr").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    masstab: text("masstab"),
    /** ISO YYYY-MM-DD — Plan-Datum (nicht Upload-Datum). */
    datum: text("datum"),
    planerName: text("planer_name"),
    status: text("status", {
      enum: ["entwurf", "zur_freigabe", "freigegeben", "aufgehoben"],
    })
      .notNull()
      .default("entwurf"),
    /** Verweis auf die zur Anzeige aktuelle Version (typischerweise höchste). */
    aktuelleVersionId: text("aktuelle_version_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjektIdx: index("idx_plaene_workspace_projekt").on(
      t.workspaceId,
      t.projektId
    ),
    workspaceTypIdx: index("idx_plaene_workspace_typ").on(
      t.workspaceId,
      t.planTyp
    ),
    workspaceStatusIdx: index("idx_plaene_workspace_status").on(
      t.workspaceId,
      t.status
    ),
  })
);

export const plaeneVersionen = pgTable(
  "plaene_versionen",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plaene.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    versionNr: integer("version_nr").notNull(),
    /** Index-Label nach Ingenieurbüro-Konvention.
     *  - Buchstaben (A, B, C, …) für Entwurfsstände (Vorab-Versionen)
     *  - Zahlen (0, 1, 2, 3, …) für freigegebene Versionen
     *  Bei Bestandsdaten = String(versionNr). */
    indexLabel: text("index_label"),
    /** Kategorie-Hinweis für die UI — beeinflusst Auto-Inkrementierung. */
    indexKategorie: text("index_kategorie", {
      enum: ["entwurf", "freigegeben"],
    }).default("freigegeben"),
    /** ISO YYYY-MM-DD — Datum der Version (z. B. "Stand 2026-05-04"). */
    datum: text("datum"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    kommentar: text("kommentar"),
    hochgeladenVon: text("hochgeladen_von").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    planIdx: index("idx_plaene_versionen_plan").on(t.planId),
    planVersionUnique: uniqueIndex("idx_plaene_versionen_unique").on(
      t.planId,
      t.versionNr
    ),
  })
);

export const plaeneFreigaben = pgTable(
  "plaene_freigaben",
  {
    id: text("id").primaryKey(),
    planVersionId: text("plan_version_id")
      .notNull()
      .references(() => plaeneVersionen.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Optional — interner User. Wenn null, ist es ein externer Freigeber (Bauherr). */
    freigabeDurchUserId: text("freigabe_durch_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    /** Anzeige-Name, wenn freigabe_durch_user_id null ist (extern). */
    freigabeDurchName: text("freigabe_durch_name"),
    /** Frei-Text-Rolle wie "Bauherr", "Statiker", "Polier". */
    freigabeRolle: text("freigabe_rolle"),
    freigabeStatus: text("freigabe_status", {
      enum: ["offen", "zugestimmt", "abgelehnt", "zurueckgestellt"],
    })
      .notNull()
      .default("offen"),
    freigabeKommentar: text("freigabe_kommentar"),
    /** ISO YYYY-MM-DD — Datum der Status-Änderung. */
    freigabeDatum: text("freigabe_datum"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    versionIdx: index("idx_plaene_freigaben_version").on(t.planVersionId),
    workspaceStatusIdx: index("idx_plaene_freigaben_workspace_status").on(
      t.workspaceId,
      t.freigabeStatus
    ),
  })
);

/**
 * Plan-Versand-Doku — wer hat welche Version wann erhalten?
 * Beweismittel bei Honorarstreit + Mängelhaftung („wir haben die alte
 * Version genommen, weil wir die neue nicht hatten").
 */
export const plaeneVersand = pgTable(
  "plaene_versand",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    planVersionId: text("plan_version_id")
      .notNull()
      .references(() => plaeneVersionen.id, { onDelete: "cascade" }),
    empfaengerName: text("empfaenger_name").notNull(),
    empfaengerEmail: text("empfaenger_email"),
    /** Frei-Text: "Bauherr", "Statiker", "Tragwerk", "GU", "Fachbauleitung". */
    empfaengerRolle: text("empfaenger_rolle"),
    /** ISO YYYY-MM-DD. */
    versandDatum: text("versand_datum").notNull(),
    versandweg: text("versandweg", {
      enum: ["email", "brief", "einschreiben", "uebergabe", "upload"],
    })
      .notNull()
      .default("email"),
    betreff: text("betreff"),
    kommentar: text("kommentar"),
    /** ISO YYYY-MM-DD — Eingangsbestätigung (für Beweissicherung). */
    eingangBestaetigtAm: text("eingang_bestaetigt_am"),
    versendetVon: text("versendet_von").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    versionIdx: index("idx_plaene_versand_version").on(t.planVersionId),
    workspaceDatumIdx: index("idx_plaene_versand_workspace_datum").on(
      t.workspaceId,
      t.versandDatum
    ),
  })
);

export const dokumente = pgTable(
  "dokumente",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Frei-Text-Kategorie ("Vertrag", "Protokoll", "Rechnung", …). */
    kategorie: text("kategorie").notNull().default("sonstiges"),
    bezeichnung: text("bezeichnung").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    hochgeladenVon: text("hochgeladen_von").references(() => users.id, {
      onDelete: "set null",
    }),
    /** 0–100 — Vertraulichkeits-Hinweis (UI rendert Badge). */
    vertraulichPct: integer("vertraulich_pct").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjektIdx: index("idx_dokumente_workspace_projekt").on(
      t.workspaceId,
      t.projektId
    ),
    workspaceKategorieIdx: index("idx_dokumente_workspace_kategorie").on(
      t.workspaceId,
      t.kategorie
    ),
  })
);
