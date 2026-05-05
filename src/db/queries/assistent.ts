import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export async function getRecentQueries(limit = 5) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.queries)
    .where(eq(schema.queries.workspaceId, workspaceId))
    .orderBy(desc(schema.queries.createdAt))
    .limit(limit);
}

export async function getQueriesByProject(projectId: string, limit = 50) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.queries)
    .where(
      and(
        eq(schema.queries.workspaceId, workspaceId),
        eq(schema.queries.projectId, projectId)
      )
    )
    .orderBy(desc(schema.queries.createdAt))
    .limit(limit);
}

export async function getQueryById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [q] = await db
    .select()
    .from(schema.queries)
    .where(
      and(eq(schema.queries.id, id), eq(schema.queries.workspaceId, workspaceId))
    )
    .limit(1);
  return q;
}

export async function getAllQueries() {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.queries)
    .where(eq(schema.queries.workspaceId, workspaceId))
    .orderBy(desc(schema.queries.createdAt));
}
