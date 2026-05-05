"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  vorgangDraftSchema,
  vorgangIdSchema,
  vorgangInputSchema,
  vorgangLinkSchema,
  vorgangStatusUpdateSchema,
  vorgangUpdateSchema,
} from "@/lib/validation/schemas";
import { computeVorgangRiskScore } from "@/lib/vorgang/risk-score";
import { classifyEingang } from "@/lib/vorgang/classifier";
import {
  ensureVorgang,
  logVorgangAudit,
  recomputeVorgangRiskScore,
} from "@/lib/vorgang/persist";
import { cleanupLinksForDeletedVorgang } from "@/lib/vorgang/link-cleanup";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { validateUploadFile } from "@/lib/storage/validation";
import { getAuditContext, logChange } from "@/lib/audit/log";

export async function createVorgang(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = vorgangInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const id = genId("vg");
  try {
    await db.insert(schema.vorgaenge).values({
      id,
      workspaceId,
      ...parsed.data,
      createdBy: userId,
      riskScore: computeVorgangRiskScore({
        category: parsed.data.category,
        status: parsed.data.status,
        dueDate: parsed.data.dueDate,
      }),
    });
    await logVorgangAudit({
      vorgangId: id,
      actorId: userId,
      action: "created",
      payload: { title: parsed.data.title },
    });
    const [created] = await db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.id, id))
      .limit(1);
    await logChange({
      workspaceId,
      entityType: "vorgang",
      entityId: id,
      action: "create",
      after: created,
      ctx: await getAuditContext(userId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return fail(`Vorgang konnte nicht angelegt werden: ${msg}`);
  }
  revalidatePath("/vorgaenge");
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect(`/vorgaenge/${id}`);
}

export async function updateVorgang(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const data = formDataToObject(formData);
  const idParse = vorgangIdSchema.safeParse({ id: data.id });
  if (!idParse.success) return fail("Ungültige Vorgang-ID.");
  const id = idParse.data.id;
  const parsed = vorgangUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const before = await ensureVorgang(id, workspaceId);
  await db
    .update(schema.vorgaenge)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schema.vorgaenge.id, id));
  await logVorgangAudit({
    vorgangId: id,
    actorId: userId,
    action: "updated",
    payload: { changes: Object.keys(parsed.data) },
  });
  const [after] = await db
    .select()
    .from(schema.vorgaenge)
    .where(eq(schema.vorgaenge.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "vorgang",
    entityId: id,
    action: "update",
    before,
    after,
    ctx: await getAuditContext(userId),
  });
  await recomputeVorgangRiskScore(id);
  revalidatePath("/vorgaenge");
  revalidatePath(`/vorgaenge/${id}`);
  return ok({ id });
}

export async function setVorgangStatus(formData: FormData): Promise<void> {
  const parsed = vorgangStatusUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Status-Wechsel.");
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(parsed.data.id, workspaceId);
  await db
    .update(schema.vorgaenge)
    .set({
      status: parsed.data.status,
      archivedAt: parsed.data.status === "archiviert" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.vorgaenge.id, parsed.data.id));
  await logVorgangAudit({
    vorgangId: parsed.data.id,
    actorId: userId,
    action: "status_changed",
    payload: { from: v.status, to: parsed.data.status },
  });
  const [afterStatus] = await db
    .select()
    .from(schema.vorgaenge)
    .where(eq(schema.vorgaenge.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "vorgang",
    entityId: parsed.data.id,
    action: "update",
    before: v,
    after: afterStatus,
    ctx: await getAuditContext(userId),
  });
  await recomputeVorgangRiskScore(parsed.data.id);
  revalidatePath("/vorgaenge");
  revalidatePath(`/vorgaenge/${parsed.data.id}`);
}

export async function deleteVorgang(formData: FormData): Promise<void> {
  const parsed = vorgangIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Vorgang-ID.");
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(parsed.data.id, workspaceId);
  const docs = await db
    .select()
    .from(schema.vorgangDocuments)
    .where(eq(schema.vorgangDocuments.vorgangId, v.id));
  await db.delete(schema.vorgaenge).where(eq(schema.vorgaenge.id, v.id));
  for (const d of docs) {
    await deleteUpload(d.storagePath);
  }
  // Eingehende Links anderer Vorgänge auf diesen Vorgang aufräumen (G).
  await cleanupLinksForDeletedVorgang(v.id);
  await logChange({
    workspaceId,
    entityType: "vorgang",
    entityId: v.id,
    action: "delete",
    before: v,
    ctx: await getAuditContext(userId),
  });
  revalidatePath("/vorgaenge");
  revalidatePath("/dashboard");
  redirect("/vorgaenge");
}

export async function uploadVorgangDocument(formData: FormData): Promise<void> {
  const vorgangId = String(formData.get("vorgangId") ?? "");
  const file = formData.get("file");
  if (!vorgangId || !(file instanceof File) || file.size === 0) {
    throw new Error("Datei oder Vorgang fehlt.");
  }
  const validation = validateUploadFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!validation.ok) throw new Error(validation.reason);
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(vorgangId, workspaceId);
  const buf = new Uint8Array(await file.arrayBuffer());
  const stored = await saveUpload({
    bucket: "vorgaenge",
    workspaceId: v.workspaceId,
    entityId: v.id,
    fileName: file.name,
    data: buf,
  });
  await db.insert(schema.vorgangDocuments).values({
    id: genId("vd"),
    vorgangId: v.id,
    fileName: stored.fileName,
    mimeType: file.type || "application/octet-stream",
    fileSize: stored.fileSize,
    storagePath: stored.storagePath,
    uploadedBy: userId,
  });
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "document_uploaded",
    payload: { fileName: stored.fileName },
  });
  await recomputeVorgangRiskScore(v.id);
  revalidatePath(`/vorgaenge/${v.id}`);
}

export async function deleteVorgangDocument(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Dokument-ID fehlt.");
  const [doc] = await db
    .select()
    .from(schema.vorgangDocuments)
    .where(eq(schema.vorgangDocuments.id, id))
    .limit(1);
  if (!doc) return;
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(doc.vorgangId, workspaceId);
  await db.delete(schema.vorgangDocuments).where(eq(schema.vorgangDocuments.id, id));
  await deleteUpload(doc.storagePath);
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "document_deleted",
    payload: { fileName: doc.fileName },
  });
  await recomputeVorgangRiskScore(v.id);
  revalidatePath(`/vorgaenge/${v.id}`);
}

export async function classifyVorgangFromDocument(formData: FormData): Promise<void> {
  const vorgangId = String(formData.get("vorgangId") ?? "");
  if (!vorgangId) throw new Error("Vorgang-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(vorgangId, workspaceId);
  const [doc] = await db
    .select()
    .from(schema.vorgangDocuments)
    .where(eq(schema.vorgangDocuments.vorgangId, v.id))
    .limit(1);
  const result = classifyEingang({
    fileName: doc?.fileName ?? v.title,
    text: doc?.ocrText ?? null,
  });
  const existing = await db
    .select({ id: schema.vorgangAnalysisSteps.id })
    .from(schema.vorgangAnalysisSteps)
    .where(eq(schema.vorgangAnalysisSteps.vorgangId, v.id));
  await db.insert(schema.vorgangAnalysisSteps).values({
    id: genId("vs"),
    vorgangId: v.id,
    stepIndex: existing.length,
    kind: "klassifikation",
    payloadJson: JSON.stringify(result),
    citations: "[]",
  });
  if (v.category === "sonstiges" && result.confidence >= 0.55) {
    await db
      .update(schema.vorgaenge)
      .set({ category: result.category, updatedAt: new Date() })
      .where(eq(schema.vorgaenge.id, v.id));
  }
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "classified",
    payload: result,
  });
  await recomputeVorgangRiskScore(v.id);
  revalidatePath(`/vorgaenge/${v.id}`);
}

export async function saveVorgangDraft(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = vorgangDraftSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(parsed.data.vorgangId, workspaceId);
  const [existing] = await db
    .select()
    .from(schema.vorgangDrafts)
    .where(
      and(
        eq(schema.vorgangDrafts.vorgangId, v.id),
        eq(schema.vorgangDrafts.status, "entwurf")
      )
    )
    .limit(1);
  let draftId: string;
  if (existing) {
    await db
      .update(schema.vorgangDrafts)
      .set({
        recipientEmail: parsed.data.recipientEmail,
        subject: parsed.data.subject,
        bodyMarkdown: parsed.data.bodyMarkdown,
        updatedAt: new Date(),
      })
      .where(eq(schema.vorgangDrafts.id, existing.id));
    draftId = existing.id;
  } else {
    draftId = genId("vd");
    await db.insert(schema.vorgangDrafts).values({
      id: draftId,
      vorgangId: v.id,
      kind: "email",
      recipientEmail: parsed.data.recipientEmail,
      subject: parsed.data.subject,
      bodyMarkdown: parsed.data.bodyMarkdown,
      status: "entwurf",
    });
  }
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "draft_saved",
    payload: { draftId },
  });
  revalidatePath(`/vorgaenge/${v.id}`);
  return ok({ id: draftId });
}

export async function sendVorgangDraft(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Draft-ID fehlt.");
  const [draft] = await db
    .select()
    .from(schema.vorgangDrafts)
    .where(eq(schema.vorgangDrafts.id, id))
    .limit(1);
  if (!draft) throw new Error("Entwurf nicht gefunden.");
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(draft.vorgangId, workspaceId);
  await db
    .update(schema.vorgangDrafts)
    .set({
      status: "gesendet",
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.vorgangDrafts.id, id));
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "draft_sent",
    payload: { draftId: id, to: draft.recipientEmail, subject: draft.subject },
  });
  revalidatePath(`/vorgaenge/${v.id}`);
}

export async function discardVorgangDraft(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Draft-ID fehlt.");
  const [draft] = await db
    .select()
    .from(schema.vorgangDrafts)
    .where(eq(schema.vorgangDrafts.id, id))
    .limit(1);
  if (!draft) return;
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(draft.vorgangId, workspaceId);
  await db
    .update(schema.vorgangDrafts)
    .set({ status: "verworfen", updatedAt: new Date() })
    .where(eq(schema.vorgangDrafts.id, id));
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "draft_discarded",
    payload: { draftId: id },
  });
  revalidatePath(`/vorgaenge/${v.id}`);
}

export async function addVorgangLink(formData: FormData): Promise<void> {
  const parsed = vorgangLinkSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Verknüpfung.");
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(parsed.data.vorgangId, workspaceId);
  await db
    .insert(schema.vorgangLinks)
    .values({
      id: genId("vl"),
      vorgangId: v.id,
      targetKind: parsed.data.targetKind,
      targetId: parsed.data.targetId,
    })
    .onConflictDoNothing();
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "link_added",
    payload: { targetKind: parsed.data.targetKind, targetId: parsed.data.targetId },
  });
  revalidatePath(`/vorgaenge/${v.id}`);
}

export async function removeVorgangLink(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Link-ID fehlt.");
  const [link] = await db
    .select()
    .from(schema.vorgangLinks)
    .where(eq(schema.vorgangLinks.id, id))
    .limit(1);
  if (!link) return;
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const v = await ensureVorgang(link.vorgangId, workspaceId);
  await db.delete(schema.vorgangLinks).where(eq(schema.vorgangLinks.id, id));
  await logVorgangAudit({
    vorgangId: v.id,
    actorId: userId,
    action: "link_removed",
    payload: { targetKind: link.targetKind, targetId: link.targetId },
  });
  revalidatePath(`/vorgaenge/${v.id}`);
}
