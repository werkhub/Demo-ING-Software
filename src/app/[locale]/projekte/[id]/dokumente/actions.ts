"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation/schemas";
import { dokumentCreateSchema, idOnlySchema } from "@/lib/validation/plaene";
import {
  deleteDokumentFolder,
  saveDokumentFile,
} from "@/lib/plaene/storage";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB Dokument-Limit

export async function createDokument(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const parsed = dokumentCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Datei fehlt.");
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("Datei ist zu groß (max 50 MB).");
  }

  const id = genId("dok");
  const projectId = parsed.data.projektId;

  try {
    const buffer = await file.arrayBuffer();
    const saved = await saveDokumentFile({
      workspaceId,
      dokumentId: id,
      filename: file.name,
      data: buffer,
    });
    await db.insert(schema.dokumente).values({
      id,
      workspaceId,
      projektId: projectId,
      kategorie: parsed.data.kategorie,
      bezeichnung: parsed.data.bezeichnung,
      filename: saved.filename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: saved.sizeBytes,
      hochgeladenVon: userId,
      vertraulichPct: parsed.data.vertraulichPct,
      notes: parsed.data.notes,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Dokument konnte nicht gespeichert werden."
    );
  }

  revalidatePath(`/projekte/${projectId}/dokumente`);
  redirect(`/projekte/${projectId}/dokumente`);
}

export async function deleteDokument(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Dokument-ID fehlt.");
  const [existing] = await db
    .select()
    .from(schema.dokumente)
    .where(
      and(
        eq(schema.dokumente.id, parsed.data.id),
        eq(schema.dokumente.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  await db
    .delete(schema.dokumente)
    .where(eq(schema.dokumente.id, parsed.data.id));
  await deleteDokumentFolder(workspaceId, parsed.data.id);

  revalidatePath(`/projekte/${existing.projektId}/dokumente`);
}
