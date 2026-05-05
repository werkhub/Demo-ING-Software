import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export async function getVorgaenge(opts?: {
  projectId?: string | null;
  status?: string | null;
  category?: string | null;
  limit?: number;
}) {
  const workspaceId = await getCurrentWorkspaceId();
  const conditions = [eq(schema.vorgaenge.workspaceId, workspaceId)];
  if (opts?.projectId) conditions.push(eq(schema.vorgaenge.projectId, opts.projectId));
  if (opts?.status)
    conditions.push(eq(schema.vorgaenge.status, opts.status as never));
  if (opts?.category)
    conditions.push(eq(schema.vorgaenge.category, opts.category as never));
  const q = db
    .select()
    .from(schema.vorgaenge)
    .where(and(...conditions))
    .orderBy(desc(schema.vorgaenge.createdAt));
  return opts?.limit ? q.limit(opts.limit) : q;
}

export async function getVorgangById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.id, id),
        eq(schema.vorgaenge.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getVorgangDocuments(vorgangId: string) {
  return db
    .select()
    .from(schema.vorgangDocuments)
    .where(eq(schema.vorgangDocuments.vorgangId, vorgangId))
    .orderBy(desc(schema.vorgangDocuments.uploadedAt));
}

export async function getVorgangSteps(vorgangId: string) {
  return db
    .select()
    .from(schema.vorgangAnalysisSteps)
    .where(eq(schema.vorgangAnalysisSteps.vorgangId, vorgangId))
    .orderBy(asc(schema.vorgangAnalysisSteps.stepIndex));
}

export async function getVorgangCitations(vorgangId: string) {
  return db
    .select()
    .from(schema.vorgangCitations)
    .where(eq(schema.vorgangCitations.vorgangId, vorgangId));
}

export async function getVorgangDrafts(vorgangId: string) {
  return db
    .select()
    .from(schema.vorgangDrafts)
    .where(eq(schema.vorgangDrafts.vorgangId, vorgangId))
    .orderBy(desc(schema.vorgangDrafts.updatedAt));
}

export async function getVorgangAuditLog(vorgangId: string, limit = 100) {
  return db
    .select()
    .from(schema.vorgangAuditLog)
    .where(eq(schema.vorgangAuditLog.vorgangId, vorgangId))
    .orderBy(desc(schema.vorgangAuditLog.createdAt))
    .limit(limit);
}

export async function getVorgangLinks(vorgangId: string) {
  return db
    .select()
    .from(schema.vorgangLinks)
    .where(eq(schema.vorgangLinks.vorgangId, vorgangId));
}

export async function getVorgaengeByProject(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.workspaceId, workspaceId),
        eq(schema.vorgaenge.projectId, projectId)
      )
    )
    .orderBy(desc(schema.vorgaenge.createdAt));
}

export async function getVorgangStats() {
  const workspaceId = await getCurrentWorkspaceId();
  const all = await db
    .select()
    .from(schema.vorgaenge)
    .where(eq(schema.vorgaenge.workspaceId, workspaceId));
  const offen = all.filter(
    (v) => v.status !== "abgeschlossen" && v.status !== "archiviert"
  );
  const highRisk = offen.filter((v) => v.riskScore >= 60).length;
  const byStatus = {
    offen: all.filter((v) => v.status === "offen").length,
    in_bearbeitung: all.filter((v) => v.status === "in_bearbeitung").length,
    wartet_auf_anwalt: all.filter((v) => v.status === "wartet_auf_anwalt").length,
    abgeschlossen: all.filter((v) => v.status === "abgeschlossen").length,
    archiviert: all.filter((v) => v.status === "archiviert").length,
  };
  return {
    total: all.length,
    open: offen.length,
    highRisk,
    byStatus,
  };
}
