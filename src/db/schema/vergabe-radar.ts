/**
 * Workspace-skopierte Markierungen für den Ausschreibungs-Radar.
 *
 * Die Treffer-Items selbst leben (in dieser Demo-Phase) als TS-Konstanten in
 * src/lib/vergabe/feed-mock.ts — Watch- und Hide-Status wandern in diese
 * beiden schmalen Tabellen, damit sie:
 *   - workspace-skopiert sind (Mehrmandanten-tauglich)
 *   - Browser-/Geräte-Wechsel überleben
 *   - Server-Neustart überleben
 *
 * `tenderItemId` ist die stabile String-ID aus feed-mock.ts (z. B. "dtvp-2026-001").
 * Sobald echtes Scraping/API-Sync dazukommt, wandert das in eine eigene
 * tender_feed_items-Tabelle und diese beiden Tabellen verlinken via FK.
 */
import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "./core";

export const tenderFeedWatch = pgTable(
  "tender_feed_watch",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tenderItemId: text("tender_item_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    byWorkspace: index("idx_tender_watch_workspace").on(t.workspaceId),
    unq: uniqueIndex("unq_tender_watch_workspace_item").on(
      t.workspaceId,
      t.tenderItemId
    ),
  })
);

export const tenderFeedHidden = pgTable(
  "tender_feed_hidden",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tenderItemId: text("tender_item_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    byWorkspace: index("idx_tender_hidden_workspace").on(t.workspaceId),
    unq: uniqueIndex("unq_tender_hidden_workspace_item").on(
      t.workspaceId,
      t.tenderItemId
    ),
  })
);
