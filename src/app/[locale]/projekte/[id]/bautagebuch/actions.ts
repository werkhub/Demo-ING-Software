"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId, getCurrentUserId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { enrichEntryWithWeather } from "@/lib/bautagebuch/witterung-pipeline";

const FOTO_MAX_BYTES = 5 * 1024 * 1024;
const FOTO_ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Zieht Wetter via Open-Meteo, persistiert die Werte und prüft die Schwellen
 * (Frost, Sturm, Starkregen, Hitze). Bei Treffer wird ein Behinderungs-Eintrag
 * angelegt und ein Vorgang nach § 6 Abs. 1 VOB/B erzeugt.
 */
export async function enrichBautagebuchWithWeather(
  formData: FormData
): Promise<ActionResult<{
  behinderungId: string | null;
  vorgangId: string | null;
}>> {
  const eintragId = String(formData.get("eintragId") ?? "");
  if (!eintragId) return fail("Eintrag-ID fehlt.");

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const result = await enrichEntryWithWeather(eintragId, workspaceId, {
    userId,
  });
  if (!result.ok) return fail(result.reason);

  const projectId = formData.get("projectId");
  if (typeof projectId === "string" && projectId) {
    revalidatePath(`/projekte/${projectId}/bautagebuch`);
    revalidatePath(`/projekte/${projectId}`);
  }
  revalidatePath("/bautagebuch");
  if (result.vorgangId) revalidatePath(`/vorgaenge/${result.vorgangId}`);

  return ok({
    behinderungId: result.behinderungId,
    vorgangId: result.vorgangId,
  });
}

export async function uploadBautagebuchFoto(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const eintragId = String(formData.get("eintragId") ?? "");
  const file = formData.get("file");
  const captionRaw = formData.get("caption");
  const caption = typeof captionRaw === "string" ? captionRaw.trim() : null;

  if (!eintragId) return fail("Eintrag-ID fehlt.");
  if (!(file instanceof File)) return fail("Keine Datei übermittelt.");
  if (file.size === 0) return fail("Datei ist leer.");
  if (file.size > FOTO_MAX_BYTES) {
    return fail(
      `Datei zu groß (${Math.round(file.size / 1024)} KB). Maximum: 5 MB.`
    );
  }
  if (!FOTO_ALLOWED_MIMES.has(file.type)) {
    return fail(`Dateityp ${file.type || "unbekannt"} nicht erlaubt. Nur JPEG, PNG, WebP.`);
  }

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [entry] = await db
    .select({
      id: schema.bautagebuchEntries.id,
      projectId: schema.bautagebuchEntries.projectId,
    })
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, eintragId),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!entry) return fail("Eintrag nicht gefunden.");

  let stored;
  try {
    const data = await file.arrayBuffer();
    stored = await saveUpload({
      bucket: "bautagebuch",
      workspaceId,
      entityId: eintragId,
      fileName: file.name,
      data,
    });
  } catch (e) {
    return fail(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
  }

  const id = genId("bf");
  try {
    await db.insert(schema.bautagebuchFotos).values({
      id,
      workspaceId,
      eintragId,
      projektId: entry.projectId,
      filename: stored.fileName,
      mimeType: file.type,
      sizeBytes: stored.fileSize,
      storagePath: stored.storagePath,
      caption: caption || null,
      uploadedBy: userId,
    });
  } catch (e) {
    // Cleanup: gespeicherte Datei wieder löschen
    await deleteUpload(stored.storagePath).catch(() => undefined);
    return fail(`DB-Insert fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (entry.projectId) {
    revalidatePath(`/projekte/${entry.projectId}/bautagebuch`);
    revalidatePath(`/projekte/${entry.projectId}`);
  }
  return ok({ id });
}

export async function deleteBautagebuchFoto(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Foto-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [foto] = await db
    .select()
    .from(schema.bautagebuchFotos)
    .where(
      and(
        eq(schema.bautagebuchFotos.id, id),
        eq(schema.bautagebuchFotos.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!foto) return;

  await deleteUpload(foto.storagePath).catch(() => undefined);
  await db
    .delete(schema.bautagebuchFotos)
    .where(eq(schema.bautagebuchFotos.id, id));

  if (foto.projektId) {
    revalidatePath(`/projekte/${foto.projektId}/bautagebuch`);
  }
}
