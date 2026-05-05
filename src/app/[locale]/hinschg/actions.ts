"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import {
  formDataToObject,
  hinschgSettingsSchema,
  meldungAckSchema,
  meldungInternalUpdateSchema,
  meldungOfficeReplySchema,
  meldungStatusUpdateSchema,
} from "@/lib/validation/schemas";

async function loadMeldungOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.hinschgMeldungen)
    .where(
      and(
        eq(schema.hinschgMeldungen.id, id),
        eq(schema.hinschgMeldungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Meldung nicht gefunden.");
  return row;
}

export async function ackMeldung(formData: FormData): Promise<void> {
  const parsed = meldungAckSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Meldungs-ID fehlt.");
  const m = await loadMeldungOrThrow(parsed.data.id);
  if (m.acknowledgedAt) return; // idempotent

  const now = new Date();
  await db
    .update(schema.hinschgMeldungen)
    .set({
      acknowledgedAt: now,
      status: m.status === "eingegangen" ? "in_pruefung" : m.status,
      updatedAt: now,
    })
    .where(eq(schema.hinschgMeldungen.id, m.id));

  // System-Message in den Faden, damit der Hinweisgeber im Status sieht,
  // dass der Eingang bestätigt wurde.
  await db.insert(schema.hinschgMessages).values({
    id: genId("hmsg"),
    workspaceId: m.workspaceId,
    meldungId: m.id,
    direction: "from_office",
    bodyText:
      "Eingangsbestätigung: Ihre Meldung ist bei uns eingegangen und wird bearbeitet. Wir melden uns spätestens innerhalb der gesetzlichen 3-Monats-Frist (§ 17 II HinSchG).",
    authorUserId: await getCurrentUserId(),
  });

  revalidatePath(`/hinschg/${m.id}`);
  revalidatePath("/hinschg");
}

export async function updateMeldungStatus(formData: FormData): Promise<void> {
  const parsed = meldungStatusUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Status.");
  const m = await loadMeldungOrThrow(parsed.data.id);

  const closedAt =
    (parsed.data.status === "abgeschlossen" ||
      parsed.data.status === "unbegruendet") &&
    !m.closedAt
      ? new Date()
      : m.closedAt;

  await db
    .update(schema.hinschgMeldungen)
    .set({
      status: parsed.data.status,
      closedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.hinschgMeldungen.id, m.id));

  revalidatePath(`/hinschg/${m.id}`);
  revalidatePath("/hinschg");
}

export async function officeReply(formData: FormData): Promise<void> {
  const parsed = meldungOfficeReplySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const m = await loadMeldungOrThrow(parsed.data.id);
  const userId = await getCurrentUserId();
  const now = new Date();

  await db.insert(schema.hinschgMessages).values({
    id: genId("hmsg"),
    workspaceId: m.workspaceId,
    meldungId: m.id,
    direction: "from_office",
    bodyText: parsed.data.bodyText,
    authorUserId: userId,
  });

  const updates: Partial<typeof schema.hinschgMeldungen.$inferInsert> = {
    updatedAt: now,
  };
  if (parsed.data.responseSummary) {
    updates.responseSummary = parsed.data.responseSummary;
  }
  if (parsed.data.setStatus) {
    updates.status = parsed.data.setStatus;
    if (
      (parsed.data.setStatus === "abgeschlossen" ||
        parsed.data.setStatus === "unbegruendet") &&
      !m.closedAt
    ) {
      updates.closedAt = now;
    }
  }

  await db
    .update(schema.hinschgMeldungen)
    .set(updates)
    .where(eq(schema.hinschgMeldungen.id, m.id));

  revalidatePath(`/hinschg/${m.id}`);
  revalidatePath("/hinschg");
}

export async function updateMeldungInternal(
  formData: FormData
): Promise<void> {
  const parsed = meldungInternalUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) throw new Error("Ungültige Eingaben.");
  const m = await loadMeldungOrThrow(parsed.data.id);

  await db
    .update(schema.hinschgMeldungen)
    .set({
      internalNotes: parsed.data.internalNotes,
      assignedToUserId: parsed.data.assignedToUserId,
      updatedAt: new Date(),
    })
    .where(eq(schema.hinschgMeldungen.id, m.id));

  revalidatePath(`/hinschg/${m.id}`);
}

/**
 * Workspace-Settings: HinSchG-Modul aktivieren/deaktivieren + Office-Mail.
 * Nur Admin-Rolle (UI versteckt sonst), aber zusätzliche Server-Side-Prüfung
 * folgt mit zentralem Auth-Helper (für Phase 1 ist UI-Filter ausreichend).
 */
export async function updateHinschgSettings(formData: FormData): Promise<void> {
  const parsed = hinschgSettingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  await db
    .update(schema.workspaces)
    .set({
      hinschgEnabled: parsed.data.hinschgEnabled,
      hinschgOfficeContactEmail: parsed.data.hinschgOfficeContactEmail,
    })
    .where(eq(schema.workspaces.id, workspaceId));

  revalidatePath("/workspace");
  revalidatePath("/hinschg");
  revalidatePath("/", "layout"); // Sidebar-Refresh
}
