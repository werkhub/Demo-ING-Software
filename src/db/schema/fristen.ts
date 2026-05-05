import { pgTable, text, integer, index , boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";

export const fristen = pgTable(
  "fristen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    task: text("task").notNull(),
    /** ISO-Datum YYYY-MM-DD. daysRemaining/urgency werden zur Render-Zeit berechnet. */
    deadline: text("deadline").notNull(),
    /** Optional: rechtliche Quelle der Frist (z. B. "§ 13 Abs. 5 VOB/B") */
    legalBasis: text("legal_basis"),
    /** Optional: Verknüpfung zum Bautagebuch-Eintrag, der diese Frist ausgelöst hat. */
    sourceBautagebuchEntryId: text("source_bautagebuch_entry_id"),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_fristen_workspace").on(t.workspaceId),
    workspaceProjectIdx: index("idx_fristen_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceDeadlineIdx: index("idx_fristen_workspace_deadline").on(
      t.workspaceId,
      t.deadline
    ),
  })
);
