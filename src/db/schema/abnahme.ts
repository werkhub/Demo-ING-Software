/**
 * Abnahme-Modul — formelles Abnahmeprotokoll.
 *
 * Rechtsgrundlagen:
 *   § 12 VOB/B   — Abnahme (förmlich, fiktiv, durch Bezug, durch Schlusszahlung)
 *   § 640 BGB    — Abnahme im BGB-Werkvertrag
 *   § 11 IV VOB/B — Vertragsstrafe MUSS bei Abnahme vorbehalten werden, sonst verfällt
 *   § 13 IV VOB/B — Verjährung Mängelansprüche (4 J. VOB / 5 J. BGB)
 *
 * 1:n-Beziehung: ein Projekt kann mehrere Abnahmen haben (Teilabnahmen,
 * verweigerte Abnahmen + spätere förmliche Abnahmen). Mängel hängen seit
 * Migration 0029 NICHT mehr an `abnahme_maengel`, sondern am phasen-
 * übergreifenden `maengel`-Modul (siehe `./maengel.ts`).
 */
import { pgTable, text, integer, index, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const abnahmen = pgTable(
  "abnahmen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "foermlich",
        "fiktiv",
        "konkludent",
        "teilabnahme",
        "verweigert",
      ],
    })
      .notNull()
      .default("foermlich"),
    /** ISO-Date — Pflicht. Für „verweigert" das Datum des Verweigerungstermins. */
    abnahmeDate: text("abnahme_date").notNull(),
    abnahmeOrt: text("abnahme_ort"),
    /** Bei Teilabnahme: welcher Bauteil/Gewerk umfasst ist. */
    scope: text("scope"),
    gesamtbeurteilung: text("gesamtbeurteilung", {
      enum: [
        "mangelfrei",
        "mit_unwesentlichen_maengeln",
        "mit_wesentlichen_maengeln",
        "verweigert",
      ],
    })
      .notNull()
      .default("mit_unwesentlichen_maengeln"),
    /** JSON-Array: [{name, role, signed: bool}] — wer war anwesend. */
    attendees: text("attendees"),
    /* ---- Vertragsstrafe (§ 11 Abs. 4 VOB/B) — kritisch ---- */
    vertragsstrafeAgreed: boolean("vertragsstrafe_agreed")
      .notNull()
      .default(false),
    vertragsstrafeReserved: boolean("vertragsstrafe_reserved")
      .notNull()
      .default(false),
    /** Wortlaut des Vorbehalts — Beweismittel für spätere Geltendmachung. */
    vertragsstrafeReservationText: text("vertragsstrafe_reservation_text"),
    /* ---- Übergabeunterlagen ---- */
    handoverComplete: boolean("handover_complete")
      .notNull()
      .default(false),
    handoverNotes: text("handover_notes"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_abnahmen_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceDateIdx: index("idx_abnahmen_workspace_date").on(
      t.workspaceId,
      t.abnahmeDate
    ),
  })
);

// HINWEIS: `abnahme_maengel` wurde mit Migration 0029 entfernt. Mängel werden
// nun phasen-übergreifend in `maengel` (siehe ./maengel.ts) verwaltet. Bei
// phase=abnahme verlinkt `maengel.abnahmeId` auf `abnahmen.id`.
