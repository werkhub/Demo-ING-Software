import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export async function getRechnungen(opts?: { limit?: number }) {
  const workspaceId = await getCurrentWorkspaceId();
  const q = db
    .select()
    .from(schema.rechnungen)
    .where(eq(schema.rechnungen.workspaceId, workspaceId))
    .orderBy(desc(schema.rechnungen.uploadedAt));
  return opts?.limit ? q.limit(opts.limit) : q;
}

export async function getRechnungById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.id, id),
        eq(schema.rechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getRechnungPositionen(rechnungId: string) {
  return db
    .select()
    .from(schema.rechnungPositionen)
    .where(eq(schema.rechnungPositionen.rechnungId, rechnungId))
    .orderBy(asc(schema.rechnungPositionen.positionIndex));
}

export async function getRechnungAnomalien(rechnungId: string) {
  return db
    .select()
    .from(schema.rechnungAnomalien)
    .where(eq(schema.rechnungAnomalien.rechnungId, rechnungId))
    .orderBy(desc(schema.rechnungAnomalien.createdAt));
}
