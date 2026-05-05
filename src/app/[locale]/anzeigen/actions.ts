"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  anzeigeInputSchema,
  anzeigeMarkAcknowledgedSchema,
  anzeigeMarkRespondedSchema,
  anzeigeMarkSentSchema,
  anzeigeUpdateSchema,
  formDataToObject,
  idOnlySchema,
} from "@/lib/validation/schemas";
import {
  ACKNOWLEDGEMENT_WARN_DAYS,
  ANZEIGE_KIND_LABEL,
  ANZEIGE_LEGAL_BASIS,
} from "@/lib/anzeigen";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadAnzeigeOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.id, id),
        eq(schema.anzeigen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Anzeige nicht gefunden.");
  return row;
}

/**
 * Eskalations-Reconcile: Wenn `versendet` UND `sentAt` älter als die Schwelle
 * UND noch kein `acknowledgedAt` UND noch kein Auto-Vorgang erzeugt — dann
 * erzeuge Auto-Vorgang „Zugangsbestätigung BHA fehlt". Idempotent über
 * Marker im notes-Feld.
 */
async function reconcileAcknowledgement(anzeigeId: string): Promise<void> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [a] = await db
    .select()
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.id, anzeigeId),
        eq(schema.anzeigen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!a) return;

  if (a.status !== "versendet") return;
  if (a.acknowledgedAt) return;
  if (!a.sentAt) return;

  const sentDate = new Date(a.sentAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACKNOWLEDGEMENT_WARN_DAYS);
  if (sentDate.getTime() > cutoff.getTime()) return;

  const marker = `[auto-vorgang:${a.id}]`;
  if (a.notes?.includes(marker)) return;

  await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "bha_zugangsfrist",
    title: `Zugangsbestätigung fehlt: ${ANZEIGE_KIND_LABEL[a.kind]} (${a.title})`,
    category: "vertragspflicht",
    projectId: a.projectId,
    dueDate: isoDateInDays(7),
    firstStep: {
      kind: "klassifikation",
      payload: {
        anzeigeId: a.id,
        kind: a.kind,
        sentAt: a.sentAt,
        recipientName: a.recipientName,
        recipientEmail: a.recipientEmail,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: ANZEIGE_LEGAL_BASIS[a.kind],
          sourceText:
            "Pflicht des AN zur unverzüglichen schriftlichen Anzeige; Zugangsnachweis ist Beweismittel für Anspruchssicherung.",
        },
      ],
    },
    auditPayload: {
      anzeigeId: a.id,
      sentAt: a.sentAt,
      ackOverdueDays: ACKNOWLEDGEMENT_WARN_DAYS,
    },
  });

  await db
    .update(schema.anzeigen)
    .set({
      notes: a.notes ? `${a.notes}\n${marker}` : marker,
      updatedAt: new Date(),
    })
    .where(eq(schema.anzeigen.id, a.id));

  revalidatePath("/vorgaenge");
}

export async function createAnzeige(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const fields = formDataToObject(formData);
  const parsed = anzeigeInputSchema.safeParse(fields);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return fail("Projekt nicht gefunden.");

  const id = genId("anz");
  const legalBasis = ANZEIGE_LEGAL_BASIS[parsed.data.kind];

  try {
    await db.insert(schema.anzeigen).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      kind: parsed.data.kind,
      status: "entwurf",
      title: parsed.data.title,
      subjectMatter: parsed.data.subjectMatter,
      bodyMarkdown: parsed.data.bodyMarkdown,
      legalBasis,
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail,
      recipientRole: parsed.data.recipientRole,
      obstructionStart: parsed.data.obstructionStart,
      estimatedDurationDays: parsed.data.estimatedDurationDays,
      estimatedExtraCost: parsed.data.estimatedExtraCost,
      causedBy: parsed.data.causedBy,
      concernAbout: parsed.data.concernAbout,
      potentialDamage: parsed.data.potentialDamage,
      proposedSolution: parsed.data.proposedSolution,
      sourceBautagebuchEntryId: parsed.data.sourceBautagebuchEntryId,
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Anzeige konnte nicht gespeichert werden.");
  }

  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  // Server-Action-Pattern: bei Erfolg direkt auf die Detail-Seite redirecten
  // (wirft NEXT_REDIRECT, wird vom Framework behandelt).
  redirect(`/anzeigen/${id}`);
}

export async function updateAnzeige(formData: FormData): Promise<void> {
  const parsed = anzeigeUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const existing = await loadAnzeigeOrThrow(parsed.data.id);
  if (existing.status !== "entwurf") {
    throw new Error(
      "Nach dem Versand sind nur noch Workflow-Aktionen erlaubt."
    );
  }

  await db
    .update(schema.anzeigen)
    .set({
      title: parsed.data.title,
      subjectMatter: parsed.data.subjectMatter,
      bodyMarkdown: parsed.data.bodyMarkdown,
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail,
      recipientRole: parsed.data.recipientRole,
      obstructionStart: parsed.data.obstructionStart,
      estimatedDurationDays: parsed.data.estimatedDurationDays,
      estimatedExtraCost: parsed.data.estimatedExtraCost,
      causedBy: parsed.data.causedBy,
      concernAbout: parsed.data.concernAbout,
      potentialDamage: parsed.data.potentialDamage,
      proposedSolution: parsed.data.proposedSolution,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.anzeigen.id, parsed.data.id));

  revalidatePath(`/anzeigen/${parsed.data.id}`);
  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function markAnzeigeSent(formData: FormData): Promise<void> {
  const parsed = anzeigeMarkSentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiges Versanddatum.");

  const existing = await loadAnzeigeOrThrow(parsed.data.id);
  if (existing.status !== "entwurf") {
    throw new Error("Nur Entwürfe können versendet werden.");
  }

  await db
    .update(schema.anzeigen)
    .set({
      status: "versendet",
      sentAt: parsed.data.sentAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.anzeigen.id, parsed.data.id));

  await reconcileAcknowledgement(parsed.data.id);

  revalidatePath(`/anzeigen/${parsed.data.id}`);
  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function markAnzeigeAcknowledged(
  formData: FormData
): Promise<void> {
  const parsed = anzeigeMarkAcknowledgedSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) throw new Error("Ungültiges Bestätigungsdatum.");

  const existing = await loadAnzeigeOrThrow(parsed.data.id);
  if (existing.status !== "versendet") {
    throw new Error("Nur versendete Anzeigen können bestätigt werden.");
  }

  await db
    .update(schema.anzeigen)
    .set({
      status: "bestaetigt",
      acknowledgedAt: parsed.data.acknowledgedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.anzeigen.id, parsed.data.id));

  revalidatePath(`/anzeigen/${parsed.data.id}`);
  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function markAnzeigeResponded(formData: FormData): Promise<void> {
  const parsed = anzeigeMarkRespondedSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Antwort-Daten."
    );
  }

  const existing = await loadAnzeigeOrThrow(parsed.data.id);
  if (existing.status === "entwurf") {
    throw new Error("Antwort kann erst nach Versand erfasst werden.");
  }

  await db
    .update(schema.anzeigen)
    .set({
      status: parsed.data.rejected ? "zurueckgewiesen" : "bestaetigt",
      responseReceivedAt: parsed.data.responseReceivedAt,
      responseSummary: parsed.data.responseSummary || null,
      // Wenn AG die Anzeige sofort beantwortet hat, gilt das auch als Zugang.
      acknowledgedAt: existing.acknowledgedAt ?? parsed.data.responseReceivedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.anzeigen.id, parsed.data.id));

  revalidatePath(`/anzeigen/${parsed.data.id}`);
  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function markAnzeigeResolved(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Anzeige-ID fehlt.");

  const existing = await loadAnzeigeOrThrow(parsed.data.id);
  await db
    .update(schema.anzeigen)
    .set({ status: "erledigt", updatedAt: new Date() })
    .where(eq(schema.anzeigen.id, parsed.data.id));

  revalidatePath(`/anzeigen/${parsed.data.id}`);
  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function deleteAnzeige(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Anzeige-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({ projectId: schema.anzeigen.projectId, status: schema.anzeigen.status })
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.id, parsed.data.id),
        eq(schema.anzeigen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  // Nur Entwürfe sind löschbar — versendete Anzeigen bleiben für die
  // Beweissicherung im System (auf „erledigt" setzen statt löschen).
  if (existing.status !== "entwurf") {
    throw new Error(
      "Versendete Anzeigen bleiben erhalten (Beweissicherung). Bitte auf 'Erledigt' setzen."
    );
  }

  await db
    .delete(schema.anzeigen)
    .where(eq(schema.anzeigen.id, parsed.data.id));

  revalidatePath("/anzeigen");
  revalidatePath(`/projekte/${existing.projectId}`);
}

