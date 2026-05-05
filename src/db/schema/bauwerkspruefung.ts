/**
 * DIN 1076 Bauwerksprüfung — Brücken/Tunnel/Stützmauern/Lärmschutz.
 *
 *   bauwerke              — Bauwerksstamm je Projekt (z.B. Brücke "BW-7").
 *                           Hält die Plan-/Ist-Termine für Haupt- + Einfache
 *                           Prüfung. Aktuelle Zustandsnote ist eine
 *                           Materialisierung der letzten Prüfung.
 *   bauwerkspruefungen    — Prüf-Ereignisse mit Note + Bericht.
 */
import { pgTable, text, integer, real, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const bauwerke = pgTable(
  "bauwerke",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    bauwerksnummer: text("bauwerksnummer").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    bauwerksart: text("bauwerksart", {
      enum: [
        "bruecke",
        "tunnel",
        "stuetzmauer",
        "laermschutzwand",
        "ueberfuehrung",
        "unterfuehrung",
        "sonstiges",
      ],
    }).notNull(),
    baujahr: integer("baujahr"),
    letzteHauptpruefungAm: text("letzte_hauptpruefung_am"),
    naechsteHauptpruefungAm: text("naechste_hauptpruefung_am"),
    letzteEinfachePruefungAm: text("letzte_einfache_pruefung_am"),
    naechsteEinfachePruefungAm: text("naechste_einfache_pruefung_am"),
    aktuelleZustandsnote: real("aktuelle_zustandsnote"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => ({
    byProjekt: index("idx_bauwerke_projekt").on(t.projektId),
    byNaechsteHaupt: index("idx_bauwerke_naechste_haupt").on(
      t.workspaceId,
      t.naechsteHauptpruefungAm
    ),
    byNaechsteEinf: index("idx_bauwerke_naechste_einf").on(
      t.workspaceId,
      t.naechsteEinfachePruefungAm
    ),
  })
);

export const bauwerkspruefungen = pgTable(
  "bauwerkspruefungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    bauwerkId: text("bauwerk_id")
      .notNull()
      .references(() => bauwerke.id, { onDelete: "cascade" }),
    art: text("art", {
      enum: [
        "hauptpruefung",
        "einfache_pruefung",
        "besichtigung",
        "sonderpruefung",
      ],
    }).notNull(),
    geplantAm: text("geplant_am"),
    durchgefuehrtAm: text("durchgefuehrt_am"),
    pruefer: text("pruefer"),
    zustandsnote: real("zustandsnote"),
    bauwerksteil: text("bauwerksteil"),
    berichtPfad: text("bericht_pfad"),
    notes: text("notes"),
    status: text("status", {
      enum: ["geplant", "in_durchfuehrung", "abgeschlossen"],
    })
      .notNull()
      .default("geplant"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => ({
    byBauwerk: index("idx_pruefung_bauwerk").on(t.bauwerkId),
    byGeplant: index("idx_pruefung_geplant").on(t.workspaceId, t.geplantAm),
  })
);
