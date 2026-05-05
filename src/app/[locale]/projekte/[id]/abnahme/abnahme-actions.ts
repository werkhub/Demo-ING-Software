"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  abnahmeInputSchema,
  abnahmeUpdateSchema,
  formDataToObject,
  idOnlySchema,
  mangelInputSchema,
  mangelStatusUpdateSchema,
  mangelUpdateSchema,
} from "@/lib/validation/schemas";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import {
  ABNAHME_KIND_LABEL,
  attendeesFromFreetext,
  computeWarrantyEnd,
  vertragsstrafeAtRisk,
} from "@/lib/abnahme";
import { getAuditContext, logChange } from "@/lib/audit/log";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadProject(workspaceId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row;
}

async function loadAbnahmeOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.abnahmen)
    .where(
      and(
        eq(schema.abnahmen.id, id),
        eq(schema.abnahmen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Abnahme nicht gefunden.");
  return row;
}

/**
 * Auto-Vorgang bei kritischer Vertragsstrafe-Situation: agreed=true UND
 * reserved=false bei einer NICHT verweigerten Abnahme. § 11 Abs. 4 VOB/B —
 * der Vorbehalt MUSS bei der Abnahme erfolgen, sonst verfällt die Strafe
 * unwiderruflich. Idempotent über notes-Marker.
 */
async function reconcileVertragsstrafe(abnahmeId: string): Promise<void> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const a = await loadAbnahmeOrThrow(abnahmeId);
  if (
    !vertragsstrafeAtRisk({
      kind: a.kind,
      vertragsstrafeAgreed: a.vertragsstrafeAgreed,
      vertragsstrafeReserved: a.vertragsstrafeReserved,
    })
  ) {
    return;
  }

  const marker = `[auto-vorgang-vertragsstrafe:${a.id}]`;
  if (a.notes?.includes(marker)) return;

  await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "vertragsstrafe_vorbehalt_fehlt",
    title: `Vertragsstrafe verfällt — Vorbehalt fehlt (${ABNAHME_KIND_LABEL[a.kind]})`,
    category: "vertragspflicht",
    projectId: a.projectId,
    dueDate: isoToday(), // sofort handeln — Frist heute
    firstStep: {
      kind: "klassifikation",
      payload: {
        abnahmeId: a.id,
        abnahmeDate: a.abnahmeDate,
        kind: a.kind,
        warning:
          "Vertragsstrafe wurde im Vertrag vereinbart, aber bei der Abnahme NICHT vorbehalten. Sie verfällt mit der Abnahme — § 11 Abs. 4 VOB/B.",
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 11 Abs. 4 VOB/B",
          sourceText:
            "Hat sich der Auftraggeber die Vertragsstrafe nicht spätestens bei der Abnahme vorbehalten, ist sie verwirkt.",
        },
      ],
    },
    auditPayload: {
      abnahmeId: a.id,
      abnahmeDate: a.abnahmeDate,
      vertragsstrafeAgreed: a.vertragsstrafeAgreed,
      vertragsstrafeReserved: a.vertragsstrafeReserved,
    },
  });

  await db
    .update(schema.abnahmen)
    .set({
      notes: a.notes ? `${a.notes}\n${marker}` : marker,
      updatedAt: new Date(),
    })
    .where(eq(schema.abnahmen.id, a.id));

  revalidatePath("/vorgaenge");
}

/**
 * Setzt projects.abnahmeDate + projects.warrantyEnd, falls sie noch leer sind
 * (kein Überschreiben — User hat ggf. manuell etwas eingetragen). Nur bei
 * förmlichen + Teilabnahmen.
 */
async function syncProjectAbnahmeDates(
  projectId: string,
  abnahmeDate: string,
  kind: string
): Promise<void> {
  if (kind === "verweigert") return;
  const workspaceId = await getCurrentWorkspaceId();
  const project = await loadProject(workspaceId, projectId);
  if (!project) return;
  const updates: Partial<typeof schema.projects.$inferInsert> = {};
  if (!project.abnahmeDate) updates.abnahmeDate = abnahmeDate;
  if (!project.warrantyEnd && project.contractType) {
    const warranty = computeWarrantyEnd(abnahmeDate, project.contractType);
    if (warranty) updates.warrantyEnd = warranty;
  }
  if (Object.keys(updates).length === 0) return;
  await db
    .update(schema.projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

/**
 * Auto-Vorgang bei überfälligem Mangel: fristsetzungDatum < heute UND status
 * aktiv (offen/in_bearbeitung/strittig). Idempotent über notes-Marker.
 * Seit Migration 0029 auf der phasen-übergreifenden `maengel`-Tabelle.
 */
async function reconcileMangelDeadline(mangelId: string): Promise<void> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const [m] = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.id, mangelId),
        eq(schema.maengel.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!m) return;
  if (
    m.status !== "offen" &&
    m.status !== "in_bearbeitung" &&
    m.status !== "strittig"
  ) {
    return;
  }
  if (!m.fristsetzungDatum) return;
  const today = isoToday();
  if (m.fristsetzungDatum >= today) return;

  const marker = `[auto-vorgang:${m.id}]`;
  if (m.notes?.includes(marker)) return;

  const titleSnippet = m.beschreibung.split("\n", 1)[0]?.slice(0, 80) ?? m.id;
  await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "mangel_frist_ueberzogen",
    title: `Mangel-Nachbesserungsfrist abgelaufen: ${titleSnippet}`,
    category: "maengelruege",
    projectId: m.projectId,
    dueDate: isoDateInDays(7),
    firstStep: {
      kind: "klassifikation",
      payload: {
        mangelId: m.id,
        abnahmeId: m.abnahmeId,
        phase: m.phase,
        prioritaet: m.prioritaet,
        kategorie: m.kategorie,
        ortImBauwerk: m.ortImBauwerk,
        fristsetzungDatum: m.fristsetzungDatum,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 13 Abs. 5 VOB/B",
          sourceText:
            "Verlangt der Auftraggeber Mängelbeseitigung, hat er eine angemessene Frist zu setzen. Wird sie ergebnislos abgelaufen, kann er die Mängel auf Kosten des AN beseitigen lassen.",
        },
      ],
    },
    auditPayload: {
      mangelId: m.id,
      abnahmeId: m.abnahmeId,
      fristsetzungDatum: m.fristsetzungDatum,
    },
  });

  await db
    .update(schema.maengel)
    .set({
      notes: m.notes ? `${m.notes}\n${marker}` : marker,
      updatedAt: new Date(),
    })
    .where(eq(schema.maengel.id, m.id));

  revalidatePath("/vorgaenge");
}

export async function createAbnahme(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const fields = formDataToObject(formData);
  const parsed = abnahmeInputSchema.safeParse(fields);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const project = await loadProject(workspaceId, parsed.data.projectId);
  if (!project) return fail("Projekt nicht gefunden.");

  const id = genId("abn");
  const attendeesJson = attendeesFromFreetext(parsed.data.attendees);

  try {
    await db.insert(schema.abnahmen).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      kind: parsed.data.kind,
      abnahmeDate: parsed.data.abnahmeDate,
      abnahmeOrt: parsed.data.abnahmeOrt,
      scope: parsed.data.scope,
      gesamtbeurteilung: parsed.data.gesamtbeurteilung,
      attendees: attendeesJson,
      vertragsstrafeAgreed: parsed.data.vertragsstrafeAgreed,
      vertragsstrafeReserved: parsed.data.vertragsstrafeReserved,
      vertragsstrafeReservationText: parsed.data.vertragsstrafeReservationText,
      handoverComplete: parsed.data.handoverComplete,
      handoverNotes: parsed.data.handoverNotes,
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Abnahmeprotokoll konnte nicht gespeichert werden.");
  }

  const userId = await getCurrentUserId();
  const [createdAbn] = await db
    .select()
    .from(schema.abnahmen)
    .where(eq(schema.abnahmen.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "abnahme",
    entityId: id,
    action: "create",
    after: createdAbn,
    ctx: await getAuditContext(userId),
  });

  await syncProjectAbnahmeDates(
    parsed.data.projectId,
    parsed.data.abnahmeDate,
    parsed.data.kind
  );
  await reconcileVertragsstrafe(id);

  revalidatePath(`/projekte/${parsed.data.projectId}`);
  revalidatePath(`/projekte/${parsed.data.projectId}/abnahme`);
  redirect(`/projekte/${parsed.data.projectId}/abnahme/${id}`);
}

export async function updateAbnahme(formData: FormData): Promise<void> {
  const parsed = abnahmeUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const existing = await loadAbnahmeOrThrow(parsed.data.id);
  const attendeesJson = attendeesFromFreetext(parsed.data.attendees);

  await db
    .update(schema.abnahmen)
    .set({
      kind: parsed.data.kind,
      abnahmeDate: parsed.data.abnahmeDate,
      abnahmeOrt: parsed.data.abnahmeOrt,
      scope: parsed.data.scope,
      gesamtbeurteilung: parsed.data.gesamtbeurteilung,
      attendees: attendeesJson,
      vertragsstrafeAgreed: parsed.data.vertragsstrafeAgreed,
      vertragsstrafeReserved: parsed.data.vertragsstrafeReserved,
      vertragsstrafeReservationText: parsed.data.vertragsstrafeReservationText,
      handoverComplete: parsed.data.handoverComplete,
      handoverNotes: parsed.data.handoverNotes,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.abnahmen.id, parsed.data.id));

  const userIdUpd = await getCurrentUserId();
  const [afterAbn] = await db
    .select()
    .from(schema.abnahmen)
    .where(eq(schema.abnahmen.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId: existing.workspaceId,
    entityType: "abnahme",
    entityId: parsed.data.id,
    action: "update",
    before: existing,
    after: afterAbn,
    ctx: await getAuditContext(userIdUpd),
  });

  await reconcileVertragsstrafe(parsed.data.id);

  revalidatePath(`/projekte/${existing.projectId}/abnahme/${parsed.data.id}`);
  revalidatePath(`/projekte/${existing.projectId}/abnahme`);
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function deleteAbnahme(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Abnahme-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const [existing] = await db
    .select()
    .from(schema.abnahmen)
    .where(
      and(
        eq(schema.abnahmen.id, parsed.data.id),
        eq(schema.abnahmen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  await db
    .delete(schema.abnahmen)
    .where(eq(schema.abnahmen.id, parsed.data.id));

  await logChange({
    workspaceId,
    entityType: "abnahme",
    entityId: parsed.data.id,
    action: "delete",
    before: existing,
    ctx: await getAuditContext(userId),
  });

  revalidatePath(`/projekte/${existing.projectId}/abnahme`);
  revalidatePath(`/projekte/${existing.projectId}`);
  redirect(`/projekte/${existing.projectId}/abnahme`);
}

/* ============== MÄNGEL (Quick-Capture aus Abnahme-Detail) ============== */

export async function addMangel(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = mangelInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const [abnahme] = await db
    .select({
      id: schema.abnahmen.id,
      projectId: schema.abnahmen.projectId,
    })
    .from(schema.abnahmen)
    .where(
      and(
        eq(schema.abnahmen.id, parsed.data.abnahmeId),
        eq(schema.abnahmen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!abnahme) return fail("Abnahme nicht gefunden.");

  const id = genId("mng");
  try {
    await db.insert(schema.maengel).values({
      id,
      workspaceId,
      projectId: abnahme.projectId,
      phase: "abnahme",
      abnahmeId: abnahme.id,
      beschreibung: parsed.data.beschreibung,
      kategorie: parsed.data.kategorie,
      ortImBauwerk: parsed.data.ortImBauwerk,
      gemeldetAm: isoToday(),
      prioritaet: parsed.data.prioritaet,
      fristsetzungDatum: parsed.data.fristsetzungDatum,
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Mangel konnte nicht gespeichert werden.");
  }

  const userId = await getCurrentUserId();
  const [createdM] = await db
    .select()
    .from(schema.maengel)
    .where(eq(schema.maengel.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "mangel",
    entityId: id,
    action: "create",
    after: createdM,
    ctx: await getAuditContext(userId),
  });

  await reconcileMangelDeadline(id);

  revalidatePath(
    `/projekte/${abnahme.projectId}/abnahme/${parsed.data.abnahmeId}`
  );
  revalidatePath(`/projekte/${abnahme.projectId}/maengel`);
  return { ok: true, data: { id } };
}

export async function updateMangel(formData: FormData): Promise<void> {
  const parsed = mangelUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.id, parsed.data.id),
        eq(schema.maengel.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Mangel nicht gefunden.");

  const behobenAm =
    parsed.data.status === "behoben" && !parsed.data.behobenAm
      ? isoToday()
      : parsed.data.behobenAm;

  await db
    .update(schema.maengel)
    .set({
      beschreibung: parsed.data.beschreibung,
      prioritaet: parsed.data.prioritaet,
      kategorie: parsed.data.kategorie,
      ortImBauwerk: parsed.data.ortImBauwerk,
      fristsetzungDatum: parsed.data.fristsetzungDatum,
      status: parsed.data.status,
      behobenAm,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.maengel.id, parsed.data.id));

  const userIdM = await getCurrentUserId();
  const [afterM] = await db
    .select()
    .from(schema.maengel)
    .where(eq(schema.maengel.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "mangel",
    entityId: parsed.data.id,
    action: "update",
    before: existing,
    after: afterM,
    ctx: await getAuditContext(userIdM),
  });

  await reconcileMangelDeadline(parsed.data.id);

  if (existing.abnahmeId) {
    revalidatePath(
      `/projekte/${existing.projectId}/abnahme/${existing.abnahmeId}`
    );
  }
  revalidatePath(`/projekte/${existing.projectId}/maengel/${parsed.data.id}`);
}

export async function updateMangelStatus(formData: FormData): Promise<void> {
  const parsed = mangelStatusUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Status.");

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.id, parsed.data.id),
        eq(schema.maengel.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Mangel nicht gefunden.");

  const behobenAm =
    parsed.data.status === "behoben" && !existing.behobenAm
      ? isoToday()
      : existing.behobenAm;

  await db
    .update(schema.maengel)
    .set({
      status: parsed.data.status,
      behobenAm,
      updatedAt: new Date(),
    })
    .where(eq(schema.maengel.id, parsed.data.id));

  const userIdMs = await getCurrentUserId();
  const [afterMs] = await db
    .select()
    .from(schema.maengel)
    .where(eq(schema.maengel.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "mangel",
    entityId: parsed.data.id,
    action: "update",
    before: existing,
    after: afterMs,
    ctx: await getAuditContext(userIdMs),
  });

  if (existing.abnahmeId) {
    revalidatePath(
      `/projekte/${existing.projectId}/abnahme/${existing.abnahmeId}`
    );
  }
  revalidatePath(`/projekte/${existing.projectId}/maengel`);
}

export async function deleteMangel(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Mangel-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const [existing] = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.id, parsed.data.id),
        eq(schema.maengel.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  await db
    .delete(schema.maengel)
    .where(eq(schema.maengel.id, parsed.data.id));

  await logChange({
    workspaceId,
    entityType: "mangel",
    entityId: parsed.data.id,
    action: "delete",
    before: existing,
    ctx: await getAuditContext(userId),
  });

  if (existing.abnahmeId) {
    revalidatePath(
      `/projekte/${existing.projectId}/abnahme/${existing.abnahmeId}`
    );
  }
  revalidatePath(`/projekte/${existing.projectId}/maengel`);
}
