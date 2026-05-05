/**
 * Aufmaß-Prüfer-Tokens (Modul 13).
 *
 * Externe Prüfer (AG-Bauleitung, Architekt mit Bauleitung) prüfen ein
 * eingereichtes Aufmaß über einen Token-Link, ohne LexBau-Account.
 *
 * Datensparsamkeit: KEINE IP-Logs im Access-Log, nur Zeitstempel + Token-ID
 * + Aktion + ggf. betroffene Zeile.
 */
import { pgTable, text, integer, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";
import { aufmass, aufmassZeilen } from "./aufmass";

export const aufmassPrueferTokens = pgTable(
  "aufmass_pruefer_tokens",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    aufmassId: text("aufmass_id")
      .notNull()
      .references(() => aufmass.id, { onDelete: "cascade" }),
    /** UUID v4. */
    token: text("token").notNull(),
    /** Sprechende Bezeichnung des Prüfers ("Bauleiter Müller"). */
    label: text("label").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    tokenUnq: uniqueIndex("unq_aufmass_pruefer_token").on(t.token),
    workspaceAufmassIdx: index("idx_aufmass_pruefer_workspace_aufmass").on(
      t.workspaceId,
      t.aufmassId
    ),
  })
);

export const aufmassPrueferAccessLog = pgTable(
  "aufmass_pruefer_access_log",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tokenId: text("token_id")
      .notNull()
      .references(() => aufmassPrueferTokens.id, { onDelete: "cascade" }),
    accessedAt: timestamp("accessed_at")
      .notNull()
      .$defaultFn(() => new Date()),
    action: text("action", {
      enum: ["view", "approve", "reduce", "dispute"],
    }).notNull(),
    /** Bei Status-Aktionen die betroffene Zeile; bei "view" null. */
    aufmassZeileId: text("aufmass_zeile_id").references(
      () => aufmassZeilen.id,
      { onDelete: "set null" }
    ),
  },
  (t) => ({
    workspaceTokenIdx: index("idx_aufmass_pruefer_log_workspace_token").on(
      t.workspaceId,
      t.tokenId
    ),
  })
);
