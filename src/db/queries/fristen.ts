import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { URGENCY_RANK, withDerivedFields } from "./_internal";

export async function getFristen(
  limit?: number,
  opts?: { includeCompleted?: boolean }
) {
  const workspaceId = await getCurrentWorkspaceId();
  const where = opts?.includeCompleted
    ? eq(schema.fristen.workspaceId, workspaceId)
    : and(
        eq(schema.fristen.workspaceId, workspaceId),
        eq(schema.fristen.completed, false)
      );

  const rows = await db.select().from(schema.fristen).where(where);
  const enriched = rows.map(withDerivedFields);

  enriched.sort((a, b) => {
    const r = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return r !== 0 ? r : a.daysRemaining - b.daysRemaining;
  });

  return limit ? enriched.slice(0, limit) : enriched;
}

export async function getAllFristen() {
  const workspaceId = await getCurrentWorkspaceId();
  const rows = await db
    .select()
    .from(schema.fristen)
    .where(eq(schema.fristen.workspaceId, workspaceId));
  const enriched = rows.map(withDerivedFields);
  enriched.sort((a, b) => {
    const r = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return r !== 0 ? r : a.daysRemaining - b.daysRemaining;
  });
  return enriched;
}

export async function getFristenByProject(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const rows = await db
    .select()
    .from(schema.fristen)
    .where(
      and(
        eq(schema.fristen.workspaceId, workspaceId),
        eq(schema.fristen.projectId, projectId)
      )
    );
  return rows.map(withDerivedFields);
}
