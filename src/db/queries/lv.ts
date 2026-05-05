import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type { Lv, LvItem } from "@/db/schema";

export async function getLvByProject(projectId: string): Promise<Lv | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.lv)
    .where(
      and(
        eq(schema.lv.workspaceId, workspaceId),
        eq(schema.lv.projectId, projectId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getLv(id: string): Promise<Lv | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.lv)
    .where(
      and(eq(schema.lv.id, id), eq(schema.lv.workspaceId, workspaceId))
    )
    .limit(1);
  return row ?? null;
}

export async function getLvItems(lvId: string): Promise<LvItem[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.workspaceId, workspaceId),
        eq(schema.lvItems.lvId, lvId)
      )
    )
    .orderBy(asc(schema.lvItems.sortIndex), asc(schema.lvItems.createdAt));
}

export async function getLvItem(id: string): Promise<LvItem | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.id, id),
        eq(schema.lvItems.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}
