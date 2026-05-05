import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export async function getBautagebuchEntries(limit?: number) {
  const workspaceId = await getCurrentWorkspaceId();
  const q = db
    .select()
    .from(schema.bautagebuchEntries)
    .where(eq(schema.bautagebuchEntries.workspaceId, workspaceId))
    .orderBy(desc(schema.bautagebuchEntries.createdAt));
  return limit ? q.limit(limit) : q;
}

export async function getBautagebuchEntryById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, id),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getBautagebuchInRange(opts: {
  projectId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();
  const all = await db
    .select()
    .from(schema.bautagebuchEntries)
    .where(eq(schema.bautagebuchEntries.workspaceId, workspaceId))
    .orderBy(desc(schema.bautagebuchEntries.entryDate));

  return all.filter((e) => {
    if (opts.projectId && e.projectId !== opts.projectId) return false;
    if (opts.fromDate && e.entryDate < opts.fromDate) return false;
    if (opts.toDate && e.entryDate > opts.toDate) return false;
    return true;
  });
}

export async function getBautagebuchByProject(projectId: string, limit = 100) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.workspaceId, workspaceId),
        eq(schema.bautagebuchEntries.projectId, projectId)
      )
    )
    .orderBy(desc(schema.bautagebuchEntries.createdAt))
    .limit(limit);
}

export async function getBautagebuchStats() {
  const workspaceId = await getCurrentWorkspaceId();
  const all = await db
    .select()
    .from(schema.bautagebuchEntries)
    .where(eq(schema.bautagebuchEntries.workspaceId, workspaceId));
  return {
    total: all.length,
    withTrigger: all.filter((e) => e.trigger).length,
    critical: all.filter((e) => e.urgency === "critical").length,
  };
}
