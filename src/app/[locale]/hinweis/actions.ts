"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  meldungInputSchema,
  reporterReplySchema,
} from "@/lib/validation/schemas";
import {
  computeResponseDeadline,
  generateAccessToken,
} from "@/lib/hinschg";
import {
  getMeldungByAccessToken,
  isHinschgEnabledForWorkspace,
} from "@/db/queries";

/**
 * Öffentliche Meldungs-Einreichung — KEIN Auth, KEIN getCurrentWorkspaceId.
 * Workspace-ID kommt aus dem Form (Hidden-Field, gesetzt vom Server beim
 * Rendern der Form-Page basierend auf der gewählten Meldestelle).
 */
export async function submitMeldung(
  _prev: ActionResult<{ token: string }> | null,
  formData: FormData
): Promise<ActionResult<{ token: string }>> {
  const parsed = meldungInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  // Workspace muss existieren UND HinSchG muss aktiviert sein.
  const enabled = await isHinschgEnabledForWorkspace(parsed.data.workspaceId);
  if (!enabled) {
    return fail(
      "Diese Meldestelle ist aktuell nicht aktiv. Bitte wende dich direkt an deinen Arbeitgeber."
    );
  }

  const id = genId("hin");
  const accessToken = generateAccessToken();
  const submittedAt = new Date();
  const responseDeadline = computeResponseDeadline(submittedAt);
  const isAnonymous = !parsed.data.reporterContact;

  try {
    await db.insert(schema.hinschgMeldungen).values({
      id,
      workspaceId: parsed.data.workspaceId,
      accessToken,
      submittedAt,
      isAnonymous,
      reporterContact: parsed.data.reporterContact,
      reporterDisplayName: parsed.data.reporterDisplayName,
      category: parsed.data.category,
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText,
      status: "eingegangen",
      responseDeadline,
    });
  } catch {
    return fail("Meldung konnte nicht entgegengenommen werden. Bitte erneut versuchen.");
  }

  revalidatePath("/hinschg");

  // Erfolgsseite zeigt Token genau einmal an — daher als Query-Parameter.
  redirect(`/hinweis/erfolg?token=${encodeURIComponent(accessToken)}`);
}

/**
 * Folge-Nachricht des Hinweisgebenden per Token. Ist „from_reporter" — keine
 * authorUserId, keine Workspace-Auth nötig (Token ist die Berechtigung).
 */
export async function reporterReply(formData: FormData): Promise<void> {
  const parsed = reporterReplySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const meldung = await getMeldungByAccessToken(parsed.data.accessToken);
  if (!meldung) throw new Error("Meldung nicht gefunden.");

  await db.insert(schema.hinschgMessages).values({
    id: genId("hmsg"),
    workspaceId: meldung.workspaceId,
    meldungId: meldung.id,
    direction: "from_reporter",
    bodyText: parsed.data.bodyText,
  });
  await db
    .update(schema.hinschgMeldungen)
    .set({ updatedAt: new Date() })
    .where(eq(schema.hinschgMeldungen.id, meldung.id));

  revalidatePath(`/hinweis/status?token=${encodeURIComponent(parsed.data.accessToken)}`);
  revalidatePath(`/hinschg/${meldung.id}`);
}
