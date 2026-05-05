/**
 * Recht-Assistent — historisierte Q&A-Anfragen.
 * Tabelle heißt aus Legacy-Gründen schlicht `queries`.
 */
import { pgTable, text, integer, index , timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces, users } from "./core";
import { projects } from "./projekte";

export const queries = pgTable(
  "queries",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Optional: Anfrage zu einem konkreten Projekt — z. B. „BV-2024-014 …" */
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    category: text("category"),
    response: text("response"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_queries_workspace").on(t.workspaceId),
    workspaceUserIdx: index("idx_queries_workspace_user").on(
      t.workspaceId,
      t.userId
    ),
    workspaceProjectIdx: index("idx_queries_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceCreatedIdx: index("idx_queries_workspace_created").on(
      t.workspaceId,
      sql`${t.createdAt} DESC`
    ),
  })
);
