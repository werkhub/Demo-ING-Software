import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type { Aufmass, AufmassZeile } from "@/db/schema";

export async function getAufmasseByProject(
  projectId: string
): Promise<Aufmass[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.aufmass)
    .where(
      and(
        eq(schema.aufmass.workspaceId, workspaceId),
        eq(schema.aufmass.projectId, projectId)
      )
    )
    .orderBy(desc(schema.aufmass.createdAt));
}

export async function getAufmass(id: string): Promise<Aufmass | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.aufmass)
    .where(
      and(
        eq(schema.aufmass.id, id),
        eq(schema.aufmass.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getAufmassZeilen(
  aufmassId: string
): Promise<AufmassZeile[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.workspaceId, workspaceId),
        eq(schema.aufmassZeilen.aufmassId, aufmassId)
      )
    )
    .orderBy(
      asc(schema.aufmassZeilen.sortIndex),
      asc(schema.aufmassZeilen.createdAt)
    );
}

export async function getAufmassZeile(
  id: string
): Promise<AufmassZeile | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.id, id),
        eq(schema.aufmassZeilen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}
