/**
 * Permissions-Matrix — pro Workspace × Rolle × Resource × Action.
 *
 * Lookup-Reihenfolge in src/lib/auth/permissions.ts:
 *   1. users.permissionsOverrideJson (User-spezifisch)
 *   2. permissionsMatrix-Eintrag (Workspace-spezifisch, gf-editierbar)
 *   3. DEFAULT_MATRIX im Code (Single Source of Truth für Pre-Seed + Tests)
 *
 * Eine fehlende Zeile bedeutet "default-deny" — der Code-Fallback liefert
 * dann den Wert aus DEFAULT_MATRIX. Empty-Table = vollständige Defaults.
 */
import { pgTable, text, integer, index, uniqueIndex , boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";

export const permissionsMatrix = pgTable(
  "permissions_matrix",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    allowed: boolean("allowed").notNull().default(false),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    uniqueCell: uniqueIndex("idx_perm_matrix_unique").on(
      t.workspaceId,
      t.role,
      t.resource,
      t.action
    ),
    lookupIdx: index("idx_perm_matrix_lookup").on(
      t.workspaceId,
      t.role,
      t.resource
    ),
  })
);
