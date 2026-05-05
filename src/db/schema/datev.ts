/**
 * DATEV-Export-Audit — eine Tabelle pro generiertem EXTF-File.
 *
 * Workspace-Felder (Berater-Nr, Mandant-Nr, Sammelkonten, Konten-Mapping)
 * leben in `workspaces` und werden via Migration 0035 ergänzt — siehe
 * core.ts für die vollständige Workspace-Definition.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";

export const datevExports = pgTable(
  "datev_exports",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    art: text("art", { enum: ["verkauf", "einkauf_nu", "lohn"] }).notNull(),
    /** ISO-Date YYYY-MM-DD. */
    zeitraumVon: text("zeitraum_von").notNull(),
    zeitraumBis: text("zeitraum_bis").notNull(),
    kontenrahmen: text("kontenrahmen", { enum: ["skr03", "skr04"] })
      .notNull()
      .default("skr03"),
    filename: text("filename").notNull(),
    filePath: text("file_path").notNull(),
    anzahlBuchungen: integer("anzahl_buchungen").notNull().default(0),
    summeCents: integer("summe_cents").notNull().default(0),
    waehrung: text("waehrung").notNull().default("EUR"),
    erstelltVon: text("erstellt_von"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceCreatedIdx: index("idx_datev_workspace_created").on(
      t.workspaceId,
      t.createdAt
    ),
    workspaceArtIdx: index("idx_datev_workspace_art").on(t.workspaceId, t.art),
  })
);
