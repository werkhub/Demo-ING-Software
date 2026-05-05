"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  prueferTokenCreateSchema,
  prueferTokenIdSchema,
} from "@/lib/validation/schemas";
import {
  computeExpiry,
  generatePrueferToken,
} from "@/lib/aufmass-pruefer";

/**
 * Office: Token erzeugen. Nur erlaubt, wenn das Aufmaß im Status
 * "eingereicht" oder "geprueft" ist — vorher ergibt eine externe Prüfung
 * keinen Sinn, danach ist das Aufmaß bereits freigegeben.
 */
export async function createPrueferToken(
  _prev: ActionResult<{ id: string; token: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; token: string }>> {
  const parsed = prueferTokenCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const [a] = await db
    .select({
      id: schema.aufmass.id,
      projectId: schema.aufmass.projectId,
      status: schema.aufmass.status,
    })
    .from(schema.aufmass)
    .where(
      and(
        eq(schema.aufmass.id, parsed.data.aufmassId),
        eq(schema.aufmass.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!a) return fail("Aufmaß nicht gefunden.");

  if (a.status !== "eingereicht" && a.status !== "geprueft") {
    return fail(
      "Prüfer-Token nur für eingereichte oder geprüfte Aufmaße möglich."
    );
  }

  const id = genId("ptok");
  const token = generatePrueferToken();
  const expiresAt = computeExpiry(parsed.data.validDays);

  try {
    await db.insert(schema.aufmassPrueferTokens).values({
      id,
      workspaceId,
      aufmassId: a.id,
      token,
      label: parsed.data.label,
      expiresAt,
      createdByUserId: userId,
    });
  } catch {
    return fail("Token konnte nicht angelegt werden.");
  }

  revalidatePath(`/projekte/${a.projectId}/aufmass/${a.id}`);
  return { ok: true, data: { id, token } };
}

/**
 * Void-Wrapper für die Inline-Form auf der Detail-Seite — wirft nicht, weil
 * eine erfolgreiche Token-Erzeugung den Page-Refresh über revalidatePath
 * triggert. Fehler-Fälle (z. B. ungültiger Status) werden geschluckt; die
 * Detail-Form ist nicht der richtige Ort für Field-Errors.
 */
export async function createPrueferTokenVoid(
  formData: FormData
): Promise<void> {
  await createPrueferToken(null, formData);
}

export async function revokePrueferToken(formData: FormData): Promise<void> {
  const parsed = prueferTokenIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Token-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [t] = await db
    .select({
      id: schema.aufmassPrueferTokens.id,
      aufmassId: schema.aufmassPrueferTokens.aufmassId,
      revokedAt: schema.aufmassPrueferTokens.revokedAt,
    })
    .from(schema.aufmassPrueferTokens)
    .where(
      and(
        eq(schema.aufmassPrueferTokens.id, parsed.data.tokenId),
        eq(schema.aufmassPrueferTokens.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!t) return;
  if (t.revokedAt !== null) return;

  const [a] = await db
    .select({ projectId: schema.aufmass.projectId })
    .from(schema.aufmass)
    .where(eq(schema.aufmass.id, t.aufmassId))
    .limit(1);

  await db
    .update(schema.aufmassPrueferTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.aufmassPrueferTokens.id, t.id));

  if (a) {
    revalidatePath(`/projekte/${a.projectId}/aufmass/${t.aufmassId}`);
  }
}
