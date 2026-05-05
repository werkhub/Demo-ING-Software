/**
 * Maschinen- und Geräteverwaltung mit Disposition + Wartungsfristen.
 *
 * Drei Tabellen:
 *   geraete                — Stamm + aktueller Status + Eigentum/Miete
 *   geraete_disposition    — Reservierung Gerät → Projekt (Datums-Fenster)
 *   geraete_wartung        — Prüfungen (UVV, TÜV) + Reparaturen
 *
 * UVV-Logik (§ 3 BetrSichV): jährliche Prüfungen. Wenn faellig_am ≤ today+30
 * und durchgefuehrt_am NULL → Auto-Vorgang (siehe lib/cron/reminders).
 *
 * Mietgeräte-Reminder: wenn miet_bis_datum ≤ today+14 → Auto-Vorgang
 * 'mietruecksgabe_faellig'.
 *
 * Idempotenz: Marker `[auto-vorgang:<sourceId>]` im notes-Feld der Quell-Zeile.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";
import { projects } from "./projekte";

export const geraete = pgTable(
  "geraete",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kategorie: text("kategorie", {
      enum: [
        "kran",
        "bagger",
        "radlader",
        "geruest",
        "handwerk",
        "fahrzeug",
        "sonstiges",
      ],
    }).notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    /** Interne Inventarnummer — eindeutig pro Workspace empfohlen. */
    inventarNr: text("inventar_nr"),
    hersteller: text("hersteller"),
    /** Baujahr als Integer (z. B. 2018) — keine Volldatums-Genauigkeit nötig. */
    baujahr: integer("baujahr"),
    status: text("status", {
      enum: [
        "verfuegbar",
        "disponiert",
        "in_wartung",
        "defekt",
        "ausgemustert",
      ],
    })
      .notNull()
      .default("verfuegbar"),
    eigentum: text("eigentum", {
      enum: ["eigen", "miete", "leasing"],
    })
      .notNull()
      .default("eigen"),
    /** Vermieter / Leasinggeber — nur bei eigentum != 'eigen' relevant. */
    mietPartner: text("miet_partner"),
    /** Rückgabe-/Vertragsende ISO YYYY-MM-DD — treibt Mietreminder. */
    mietBisDatum: text("miet_bis_datum"),
    kaufdatum: text("kaufdatum"),
    /** Kaufpreis in Cents — vermeidet Float-Rundungsfehler. */
    kaufpreisCents: integer("kaufpreis_cents"),
    /** Aktueller Buchwert in Cents — manuell gepflegt. */
    currentValueCents: integer("current_value_cents"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_geraete_workspace").on(t.workspaceId),
    workspaceStatusIdx: index("idx_geraete_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    workspaceKategorieIdx: index("idx_geraete_workspace_kategorie").on(
      t.workspaceId,
      t.kategorie
    ),
    mietBisIdx: index("idx_geraete_miet_bis").on(
      t.workspaceId,
      t.mietBisDatum
    ),
  })
);

/**
 * Reservierung eines Geräts auf einem Projekt für einen Datums-Zeitraum.
 *
 * Konflikt-Logik (Server-Action): zwei Dispositionen mit Status
 * `geplant` oder `aktiv` für dasselbe Gerät dürfen sich nicht überlappen.
 * DB hat keinen Trigger — Validierung erfolgt in actions.ts.
 */
export const geraeteDisposition = pgTable(
  "geraete_disposition",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    geraetId: text("geraet_id")
      .notNull()
      .references(() => geraete.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    vonDatum: text("von_datum").notNull(),
    bisDatum: text("bis_datum").notNull(),
    /** Optionale Tageszeit HH:MM — nur Anzeige-Information. */
    vonZeit: text("von_zeit"),
    bisZeit: text("bis_zeit"),
    /** Verantwortlicher Polier (User-Ref). */
    polierUserId: text("polier_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["geplant", "aktiv", "zurueck", "storniert"],
    })
      .notNull()
      .default("geplant"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    geraetVonIdx: index("idx_disposition_geraet_von").on(
      t.geraetId,
      t.vonDatum
    ),
    workspaceStatusIdx: index("idx_disposition_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    projektIdx: index("idx_disposition_projekt").on(t.projektId),
  })
);

/**
 * Wartungs-/Prüfungs-Eintrag pro Gerät. Plan + Ist in einer Zeile:
 *   - faelligAm gesetzt, durchgefuehrtAm NULL → geplant/offen
 *   - durchgefuehrtAm gesetzt → erledigt
 *
 * Reminder: art='uvv_pruefung' + faelligAm ≤ today+30 + offen → Auto-Vorgang.
 */
export const geraeteWartung = pgTable(
  "geraete_wartung",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    geraetId: text("geraet_id")
      .notNull()
      .references(() => geraete.id, { onDelete: "cascade" }),
    art: text("art", {
      enum: ["uvv_pruefung", "tuev", "inspektion", "reparatur"],
    }).notNull(),
    faelligAm: text("faellig_am").notNull(),
    durchgefuehrtAm: text("durchgefuehrt_am"),
    durchgefuehrtVon: text("durchgefuehrt_von"),
    kostenCents: integer("kosten_cents"),
    /** Dateiname Prüfzeugnis im Storage — keine direkte File-Verknüpfung. */
    prueferzeugnisFilename: text("prueferzeugnis_filename"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    geraetFaelligIdx: index("idx_wartung_geraet_faellig").on(
      t.geraetId,
      t.faelligAm
    ),
    workspaceArtIdx: index("idx_wartung_workspace_art").on(
      t.workspaceId,
      t.art
    ),
    workspaceFaelligIdx: index("idx_wartung_workspace_faellig").on(
      t.workspaceId,
      t.faelligAm
    ),
  })
);
