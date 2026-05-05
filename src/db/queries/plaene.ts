import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type {
  Dokument,
  Plan,
  PlanFreigabe,
  PlanTyp,
  PlanVersion,
} from "@/db/schema";

export async function getPlaeneByProject(
  projektId: string,
  filter?: { planTyp?: PlanTyp | "all" }
): Promise<Plan[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const conditions = [
    eq(schema.plaene.workspaceId, workspaceId),
    eq(schema.plaene.projektId, projektId),
  ];
  if (filter?.planTyp && filter.planTyp !== "all") {
    conditions.push(eq(schema.plaene.planTyp, filter.planTyp));
  }
  return db
    .select()
    .from(schema.plaene)
    .where(and(...conditions))
    .orderBy(desc(schema.plaene.updatedAt));
}

export async function getPlan(id: string): Promise<Plan | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.plaene)
    .where(
      and(eq(schema.plaene.id, id), eq(schema.plaene.workspaceId, workspaceId))
    )
    .limit(1);
  return row ?? null;
}

export async function getVersionsByPlan(
  planId: string
): Promise<PlanVersion[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.plaeneVersionen)
    .where(
      and(
        eq(schema.plaeneVersionen.planId, planId),
        eq(schema.plaeneVersionen.workspaceId, workspaceId)
      )
    )
    .orderBy(asc(schema.plaeneVersionen.versionNr));
}

export async function getVersion(id: string): Promise<PlanVersion | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.plaeneVersionen)
    .where(
      and(
        eq(schema.plaeneVersionen.id, id),
        eq(schema.plaeneVersionen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getFreigabenByVersion(
  planVersionId: string
): Promise<PlanFreigabe[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.plaeneFreigaben)
    .where(
      and(
        eq(schema.plaeneFreigaben.planVersionId, planVersionId),
        eq(schema.plaeneFreigaben.workspaceId, workspaceId)
      )
    )
    .orderBy(asc(schema.plaeneFreigaben.createdAt));
}

export async function getDokumenteByProject(
  projektId: string
): Promise<Dokument[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.dokumente)
    .where(
      and(
        eq(schema.dokumente.workspaceId, workspaceId),
        eq(schema.dokumente.projektId, projektId)
      )
    )
    .orderBy(desc(schema.dokumente.createdAt));
}
