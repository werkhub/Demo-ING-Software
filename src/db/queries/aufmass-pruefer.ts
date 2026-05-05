import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type {
  Aufmass,
  AufmassPrueferAccessLogEntry,
  AufmassPrueferToken,
  Project,
} from "@/db/schema";

/* ============== OFFICE-QUERIES (Auth-pflichtig) ============== */

export async function getTokensByAufmass(
  aufmassId: string
): Promise<AufmassPrueferToken[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.aufmassPrueferTokens)
    .where(
      and(
        eq(schema.aufmassPrueferTokens.workspaceId, workspaceId),
        eq(schema.aufmassPrueferTokens.aufmassId, aufmassId)
      )
    )
    .orderBy(desc(schema.aufmassPrueferTokens.createdAt));
}

export async function getActiveTokenById(
  tokenId: string
): Promise<AufmassPrueferToken | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.aufmassPrueferTokens)
    .where(
      and(
        eq(schema.aufmassPrueferTokens.id, tokenId),
        eq(schema.aufmassPrueferTokens.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getAccessLogByToken(
  tokenId: string
): Promise<AufmassPrueferAccessLogEntry[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.aufmassPrueferAccessLog)
    .where(
      and(
        eq(schema.aufmassPrueferAccessLog.workspaceId, workspaceId),
        eq(schema.aufmassPrueferAccessLog.tokenId, tokenId)
      )
    )
    .orderBy(desc(schema.aufmassPrueferAccessLog.accessedAt));
}

/* ============== PUBLIC-QUERIES (kein Workspace-Kontext) ============== */

export type PrueferTokenContext = {
  token: AufmassPrueferToken;
  aufmass: Aufmass;
  project: Pick<Project, "id" | "identifier" | "name" | "ag">;
};

/**
 * Public: Token + zugehöriges Aufmaß + Projekt-Stammdaten in einem Rutsch.
 * Bewusst KEIN getCurrentWorkspaceId — die Berechtigung kommt aus dem Token.
 */
export async function getByToken(
  token: string
): Promise<PrueferTokenContext | null> {
  if (!token || token.length < 10) return null;
  const [row] = await db
    .select({
      token: schema.aufmassPrueferTokens,
      aufmass: schema.aufmass,
      project: {
        id: schema.projects.id,
        identifier: schema.projects.identifier,
        name: schema.projects.name,
        ag: schema.projects.ag,
      },
    })
    .from(schema.aufmassPrueferTokens)
    .innerJoin(
      schema.aufmass,
      eq(schema.aufmassPrueferTokens.aufmassId, schema.aufmass.id)
    )
    .innerJoin(
      schema.projects,
      eq(schema.aufmass.projectId, schema.projects.id)
    )
    .where(eq(schema.aufmassPrueferTokens.token, token))
    .limit(1);
  return row ?? null;
}

/** Public: Zeilen zu einem Aufmaß per Token (kein Workspace-Filter). */
export async function getZeilenByTokenAufmass(aufmassId: string) {
  return db
    .select()
    .from(schema.aufmassZeilen)
    .where(eq(schema.aufmassZeilen.aufmassId, aufmassId))
    .orderBy(
      asc(schema.aufmassZeilen.sortIndex),
      asc(schema.aufmassZeilen.createdAt)
    );
}
