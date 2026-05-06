import { pgTable, text, integer, real, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces, users } from "./core";
import { projects } from "./projekte";

export const bautagebuchEntries = pgTable(
  "bautagebuch_entries",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    /** Tatsächliches Tagesdatum (YYYY-MM-DD), kann von createdAt abweichen
     *  wenn Eintrag nachträglich erfasst wird. */
    entryDate: text("entry_date").notNull(),
    /** Strukturierte Kategorie für Filter und Auswertungen. */
    category: text("category", {
      enum: [
        "allgemein",
        "anordnung",
        "behinderung",
        "mangel",
        "bedenken",
        "lieferung",
        "besichtigung",
        "personal",
      ],
    })
      .notNull()
      .default("allgemein"),
    text: text("text").notNull(),
    /** Witterung am Tag — Voraussetzung für witterungsbedingte Behinderung. */
    weatherCondition: text("weather_condition", {
      enum: ["sonnig", "bewoelkt", "regen", "schnee", "frost", "sturm", "nebel"],
    }),
    temperatureCelsius: integer("temperature_celsius"),
    /** Tageshöchst-/Tiefst-Temperatur (°C) — befüllt durch Wetter-API. */
    weatherTempMin: real("weather_temp_min"),
    weatherTempMax: real("weather_temp_max"),
    /** Tagesniederschlag in mm — Schwellwert >25 mm/Tag triggert Starkregen-Behinderung. */
    weatherPrecipitationMm: real("weather_precipitation_mm"),
    /** Spitzenwind in km/h — Schwellwert >60 km/h triggert Sturm-Behinderung. */
    weatherWindKmh: real("weather_wind_kmh"),
    /** Quelle der strukturierten Wetter-Werte: manuell vom AN oder via Open-Meteo. */
    weatherSource: text("weather_source", { enum: ["manual", "api"] }),
    /** Zeitpunkt des letzten erfolgreichen API-Pulls (für Re-Sync-Logik). */
    weatherFetchedAt: timestamp("weather_fetched_at"),
    /** Eigene Mannschaft Stundenzahl — Beweis für Stillstand-Schadensersatz. */
    staffHoursOwn: real("staff_hours_own"),
    /** NU-Mannschaft Stundenzahl. */
    staffHoursSubcontractors: real("staff_hours_subcontractors"),
    /** Eingesetzte Geräte/Maschinen — Vorhalte-Kosten bei Behinderung. */
    equipment: text("equipment"),
    /** Verweis auf externe Anlagen (Foto-Ordner, Cloud-Pfade). */
    attachmentRefs: text("attachment_refs"),
    trigger: text("trigger"),
    triggerLabel: text("trigger_label"),
    urgency: text("urgency", { enum: ["critical", "warning", "info"] })
      .notNull()
      .default("info"),
    suggestion: text("suggestion"),
    /* ---- Strukturierte Doku-Felder (befüllt vom Sprach-Eintrag) ---- */
    /** JSON: [{name, funktion, firma, von?, bis?}] — Anwesende Personen. */
    anwesendeJson: text("anwesende_json"),
    /** JSON: [{gewerk, bauteil, beschreibung}] — geleistete Arbeiten. */
    arbeitenJson: text("arbeiten_json"),
    /** JSON: [{lieferant, material, menge, einheit, lieferscheinNr}]. */
    lieferungenJson: text("lieferungen_json"),
    /**
     * JSON: [{erteilerName, beschreibung, mehrkostenVorbehaltErforderlich,
     *         mehrkostenVorbehaltGesetzt}] — AG-/Bauleitung-Anordnungen vor Ort.
     */
    anordnungenJson: text("anordnungen_json"),
    /**
     * JSON: [{art ("unfall"|"beinahe"|"gefahr"), beschreibung,
     *         personenschaden, dguvMeldepflichtig}] — Sicherheitsvorfälle.
     */
    vorfaelleJson: text("vorfaelle_json"),
    /* ---- Beweissicherung ---- */
    /** SHA-256 Hash der signierten Eintrags-Snapshot — Manipulations-Detektion. */
    signatureHash: text("signature_hash"),
    /** Zeitpunkt der digitalen Signatur. Vor Signatur null. */
    signedAt: timestamp("signed_at"),
    /** Anzeigename des Signierenden (oft = authorName). */
    signedBy: text("signed_by"),
    /** Nach Signatur true — UI verhindert Edit (rechtliche Beweis-Stabilität). */
    locked: boolean("locked").notNull().default(false),
    /** Optional: GPS-Position bei Eintragserstellung (Vor-Ort-Nachweis). */
    gpsLat: real("gps_lat"),
    gpsLon: real("gps_lon"),
    /** Anzahl angehängter Fotos (Platzhalter — Foto-Persistenz folgt). */
    photoCount: integer("photo_count").notNull().default(0),
    /** Quelle des Eintrags — manuell oder via Sprach-Aufnahme. */
    source: text("source", { enum: ["manual", "voice"] })
      .notNull()
      .default("manual"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_bautagebuch_workspace").on(t.workspaceId),
    workspaceProjectIdx: index("idx_bautagebuch_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceCreatedIdx: index("idx_bautagebuch_workspace_created").on(
      t.workspaceId,
      sql`${t.createdAt} DESC`
    ),
    workspaceProjectDateIdx: index("idx_bautagebuch_workspace_project_date").on(
      t.workspaceId,
      t.projectId,
      sql`${t.entryDate} DESC`
    ),
  })
);

/**
 * Beweissicherungs-Checklisten pro Projekt + Anlass-Typ. Ersetzt das alte
 * localStorage-basierte Beweissicherungs-Tool durch echte Persistenz.
 */
export const beweisChecklists = pgTable(
  "beweis_checklists",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** "mangel" | "behinderung" | "anordnung" | "abnahme" | … */
    anlass: text("anlass").notNull(),
    /** JSON-serialisierter State der Häkchen: { [checkId]: boolean }. */
    checksState: text("checks_state").notNull().default("{}"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_beweis_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    projectAnlassUnq: uniqueIndex("unq_beweis_project_anlass").on(
      t.projectId,
      t.anlass
    ),
  })
);

/**
 * Foto-Anhänge zu Bautagebuch-Einträgen. Beweissicherung pro Tag — Mängel,
 * Witterungsschäden, Behinderungen werden mit Bildern dokumentiert.
 *
 * Storage läuft über den Standard-Driver (storage/<wsId>/bautagebuch/<entryId>/),
 * `storagePath` ist driver-relativ.
 */
export const bautagebuchFotos = pgTable(
  "bautagebuch_fotos",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eintragId: text("eintrag_id")
      .notNull()
      .references(() => bautagebuchEntries.id, { onDelete: "cascade" }),
    /** Denormalisiert für schnellen Workspace-/Projekt-Filter ohne Join. */
    projektId: text("projekt_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Driver-relativer Pfad — wird durch saveUpload() gesetzt. */
    storagePath: text("storage_path").notNull(),
    caption: text("caption"),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceEintragIdx: index("idx_bautagebuch_fotos_workspace_eintrag").on(
      t.workspaceId,
      t.eintragId
    ),
    workspaceProjektIdx: index("idx_bautagebuch_fotos_workspace_projekt").on(
      t.workspaceId,
      t.projektId
    ),
  })
);

/**
 * Witterungsbedingte Behinderungen — automatisch erzeugt aus Wetter-Schwellen
 * (Frost <-5 °C, Sturm >60 km/h, Starkregen >25 mm/Tag, Hitze >32 °C) oder
 * manuell vom AN erfasst (Art = sonstiges).
 *
 * `ankuendigungVersendet` = 1 sobald eine BHA gemäß § 6 Abs. 1 VOB/B versendet
 * wurde (Verlinkung läuft über Vorgang-Audit). Der Cron eskaliert offene
 * Behinderungen (= 0) nach einem Tag in einen Vorgang.
 */
export const behinderungen = pgTable(
  "behinderungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Optional: auslösender Bautagebuch-Eintrag (bei Auto-Erkennung gesetzt). */
    eintragId: text("eintrag_id").references(() => bautagebuchEntries.id, {
      onDelete: "set null",
    }),
    art: text("art", {
      enum: ["frost", "sturm", "starkregen", "hitze", "sonstiges"],
    }).notNull(),
    /** Beginn (YYYY-MM-DD). */
    vonDatum: text("von_datum").notNull(),
    /** Ende (YYYY-MM-DD) — null = noch andauernd. */
    bisDatum: text("bis_datum"),
    /** Menschenlesbare Begründung („Spitzenwind 72 km/h"). */
    schwellwertText: text("schwellwert_text").notNull(),
    /** Geschätzte Stillstandsdauer in Stunden (Schadensersatz-Grundlage). */
    dauerStunden: real("dauer_stunden"),
    /** 0/1 — wurde die BHA bereits gemäß § 6 VOB/B angekündigt? */
    ankuendigungVersendet: boolean("ankuendigung_versendet")
      .notNull()
      .default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjektIdx: index("idx_behinderungen_workspace_projekt").on(
      t.workspaceId,
      t.projektId
    ),
    workspaceVonIdx: index("idx_behinderungen_workspace_von").on(
      t.workspaceId,
      t.vonDatum
    ),
  })
);
