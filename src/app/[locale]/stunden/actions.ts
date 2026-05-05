"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  mitarbeiterIdSchema,
  mitarbeiterInputSchema,
  mitarbeiterUpdateSchema,
  stundenIdSchema,
  stundenInputSchema,
  stundenUpdateSchema,
  stundenWocheLockSchema,
} from "@/lib/validation/schemas";
import {
  daysOfIsoWeek,
  effectiveStundensatzCents,
  isUnplausibleHours,
  isoToday,
  isoWeekFromDateString,
} from "@/lib/stunden";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import { getAuditContext, logChange } from "@/lib/audit/log";

/* ============== HELPERS ============== */

async function loadMitarbeiterOrThrow(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.mitarbeiter)
    .where(
      and(
        eq(schema.mitarbeiter.id, id),
        eq(schema.mitarbeiter.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Mitarbeiter nicht gefunden.");
  return row;
}

async function isWeekLocked(
  workspaceId: string,
  jahr: number,
  kw: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.stundenWochenLock.id })
    .from(schema.stundenWochenLock)
    .where(
      and(
        eq(schema.stundenWochenLock.workspaceId, workspaceId),
        eq(schema.stundenWochenLock.jahr, jahr),
        eq(schema.stundenWochenLock.kw, kw)
      )
    )
    .limit(1);
  return Boolean(row);
}

async function projectInWorkspace(
  workspaceId: string,
  projectId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return Boolean(row);
}

async function checkPlausi(
  workspaceId: string,
  mitarbeiterId: string,
  datum: string,
  exceptStundenId: string | null
): Promise<{ totalHours: number; unplausibel: boolean }> {
  const rows = await db
    .select({
      id: schema.stunden.id,
      stunden: schema.stunden.stunden,
    })
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        eq(schema.stunden.mitarbeiterId, mitarbeiterId),
        eq(schema.stunden.datum, datum)
      )
    );
  const totalHours = rows
    .filter((r) => (exceptStundenId ? r.id !== exceptStundenId : true))
    .reduce((sum, r) => sum + r.stunden, 0);
  return { totalHours, unplausibel: isUnplausibleHours(totalHours) };
}

/* ============== MITARBEITER CRUD ============== */

export async function createMitarbeiter(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = mitarbeiterInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const id = genId("ma");
  await db.insert(schema.mitarbeiter).values({
    id,
    workspaceId,
    name: parsed.data.name,
    personalnummer: parsed.data.personalnummer,
    lohnart: parsed.data.lohnart,
    stundensatzCents: parsed.data.stundensatzCents,
    monatsgehaltCents: parsed.data.monatsgehaltCents,
    monatsSollStunden: parsed.data.monatsSollStunden,
    kostenstelle: parsed.data.kostenstelle,
    gewerk: parsed.data.gewerk,
    eintrittDatum: parsed.data.eintrittDatum,
    austrittDatum: parsed.data.austrittDatum,
    notes: parsed.data.notes,
    aktiv: true,
  });
  revalidatePath("/stunden");
  revalidatePath("/stunden/mitarbeiter");
  return ok({ id });
}

export async function updateMitarbeiter(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = mitarbeiterUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  await loadMitarbeiterOrThrow(workspaceId, parsed.data.id);
  await db
    .update(schema.mitarbeiter)
    .set({
      name: parsed.data.name,
      personalnummer: parsed.data.personalnummer,
      lohnart: parsed.data.lohnart,
      stundensatzCents: parsed.data.stundensatzCents,
      monatsgehaltCents: parsed.data.monatsgehaltCents,
      monatsSollStunden: parsed.data.monatsSollStunden,
      kostenstelle: parsed.data.kostenstelle,
      gewerk: parsed.data.gewerk,
      eintrittDatum: parsed.data.eintrittDatum,
      austrittDatum: parsed.data.austrittDatum,
      aktiv: parsed.data.aktiv,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.mitarbeiter.id, parsed.data.id));
  revalidatePath("/stunden/mitarbeiter");
  revalidatePath(`/stunden/mitarbeiter/${parsed.data.id}`);
  return ok({ id: parsed.data.id });
}

export async function deactivateMitarbeiter(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = mitarbeiterIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail("ID fehlt.");
  await loadMitarbeiterOrThrow(workspaceId, parsed.data.id);
  await db
    .update(schema.mitarbeiter)
    .set({ aktiv: false, austrittDatum: isoToday(), updatedAt: new Date() })
    .where(eq(schema.mitarbeiter.id, parsed.data.id));
  revalidatePath("/stunden/mitarbeiter");
  return ok(undefined);
}

/* ============== STUNDEN CRUD ============== */

export async function createStundenEintrag(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = stundenInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  // Lock-Check
  const isoWeek = isoWeekFromDateString(parsed.data.datum);
  if (await isWeekLocked(workspaceId, isoWeek.jahr, isoWeek.kw)) {
    return fail(
      `KW ${isoWeek.kw}/${isoWeek.jahr} ist gesperrt. Buchung nicht möglich.`
    );
  }

  // Projekt im Workspace?
  if (!(await projectInWorkspace(workspaceId, parsed.data.projektId))) {
    return fail("Projekt nicht im Workspace gefunden.");
  }

  // MA laden + Stundensatz-Snapshot
  const ma = await loadMitarbeiterOrThrow(workspaceId, parsed.data.mitarbeiterId);
  if (!ma.aktiv) {
    return fail("Mitarbeiter ist inaktiv. Reaktivieren oder anderen MA wählen.");
  }
  const stundensatz = effectiveStundensatzCents(ma);

  const id = genId("st");
  await db.insert(schema.stunden).values({
    id,
    workspaceId,
    mitarbeiterId: parsed.data.mitarbeiterId,
    projektId: parsed.data.projektId,
    datum: parsed.data.datum,
    stunden: parsed.data.stunden,
    taetigkeit: parsed.data.taetigkeit,
    lvPositionId: parsed.data.lvPositionId,
    leistungsphase: parsed.data.leistungsphase ?? null,
    stundensatzCents: stundensatz,
    notes: parsed.data.notes,
    createdBy: userId,
  });

  const [createdSt] = await db
    .select()
    .from(schema.stunden)
    .where(eq(schema.stunden.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "stunde",
    entityId: id,
    action: "create",
    after: createdSt,
    ctx: await getAuditContext(userId),
  });

  // Plausi-Check + ggf. Auto-Vorgang
  const plausi = await checkPlausi(
    workspaceId,
    parsed.data.mitarbeiterId,
    parsed.data.datum,
    null
  );
  if (plausi.unplausibel) {
    await createUnplausibelVorgang({
      workspaceId,
      userId,
      mitarbeiterId: parsed.data.mitarbeiterId,
      mitarbeiterName: ma.name,
      datum: parsed.data.datum,
      totalHours: plausi.totalHours,
      projektId: parsed.data.projektId,
    });
  }

  revalidatePath("/stunden");
  revalidatePath(`/projekte/${parsed.data.projektId}/stunden`);
  return ok({ id });
}

export async function updateStundenEintrag(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = stundenUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const [existing] = await db
    .select()
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.id, parsed.data.id),
        eq(schema.stunden.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return fail("Stunden-Eintrag nicht gefunden.");
  if (existing.gesperrt) {
    return fail("Eintrag ist gesperrt (Wochen-Lock). Keine Änderung möglich.");
  }
  // Lock-Check für neues Datum
  const isoWeek = isoWeekFromDateString(parsed.data.datum);
  if (await isWeekLocked(workspaceId, isoWeek.jahr, isoWeek.kw)) {
    return fail(
      `KW ${isoWeek.kw}/${isoWeek.jahr} ist gesperrt. Buchung nicht möglich.`
    );
  }
  await db
    .update(schema.stunden)
    .set({
      mitarbeiterId: parsed.data.mitarbeiterId,
      projektId: parsed.data.projektId,
      datum: parsed.data.datum,
      stunden: parsed.data.stunden,
      taetigkeit: parsed.data.taetigkeit,
      lvPositionId: parsed.data.lvPositionId,
      leistungsphase: parsed.data.leistungsphase ?? null,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.stunden.id, parsed.data.id));
  const userIdSt = await getCurrentUserId();
  const [afterSt] = await db
    .select()
    .from(schema.stunden)
    .where(eq(schema.stunden.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "stunde",
    entityId: parsed.data.id,
    action: "update",
    before: existing,
    after: afterSt,
    ctx: await getAuditContext(userIdSt),
  });
  revalidatePath("/stunden");
  return ok({ id: parsed.data.id });
}

export async function deleteStundenEintrag(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = stundenIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail("ID fehlt.");
  const [existing] = await db
    .select()
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.id, parsed.data.id),
        eq(schema.stunden.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return fail("Stunden-Eintrag nicht gefunden.");
  if (existing.gesperrt) {
    return fail("Eintrag ist gesperrt. Löschen nicht möglich.");
  }
  await db.delete(schema.stunden).where(eq(schema.stunden.id, parsed.data.id));
  const userId = await getCurrentUserId();
  await logChange({
    workspaceId,
    entityType: "stunde",
    entityId: parsed.data.id,
    action: "delete",
    before: existing,
    ctx: await getAuditContext(userId),
  });
  revalidatePath("/stunden");
  return ok(undefined);
}

/* ============== WOCHEN-LOCK ============== */

export async function lockWoche(
  _prev: ActionResult<{ jahr: number; kw: number }> | null,
  formData: FormData
): Promise<ActionResult<{ jahr: number; kw: number }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = stundenWocheLockSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const { jahr, kw, notes } = parsed.data;
  if (await isWeekLocked(workspaceId, jahr, kw)) {
    return fail(`KW ${kw}/${jahr} ist bereits gesperrt.`);
  }
  // Lock-Eintrag
  await db.insert(schema.stundenWochenLock).values({
    id: genId("wl"),
    workspaceId,
    jahr,
    kw,
    gesperrtVon: userId,
    notes,
  });
  // Alle stunden-Einträge in dieser Woche markieren
  const days = daysOfIsoWeek(jahr, kw);
  await db
    .update(schema.stunden)
    .set({
      gesperrt: true,
      gesperrtAm: new Date(),
      gesperrtVon: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        gte(schema.stunden.datum, days[0]),
        lte(schema.stunden.datum, days[6])
      )
    );
  revalidatePath("/stunden");
  return ok({ jahr, kw });
}

export async function unlockWoche(
  _prev: ActionResult<{ jahr: number; kw: number }> | null,
  formData: FormData
): Promise<ActionResult<{ jahr: number; kw: number }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = stundenWocheLockSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const { jahr, kw } = parsed.data;
  await db
    .delete(schema.stundenWochenLock)
    .where(
      and(
        eq(schema.stundenWochenLock.workspaceId, workspaceId),
        eq(schema.stundenWochenLock.jahr, jahr),
        eq(schema.stundenWochenLock.kw, kw)
      )
    );
  // Stunden-Einträge entsperren
  const days = daysOfIsoWeek(jahr, kw);
  await db
    .update(schema.stunden)
    .set({
      gesperrt: false,
      gesperrtAm: null,
      gesperrtVon: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        gte(schema.stunden.datum, days[0]),
        lte(schema.stunden.datum, days[6])
      )
    );
  revalidatePath("/stunden");
  return ok({ jahr, kw });
}

/* ============== AUTO-VORGANG: UNPLAUSIBEL ============== */

async function createUnplausibelVorgang(opts: {
  workspaceId: string;
  userId: string;
  mitarbeiterId: string;
  mitarbeiterName: string;
  datum: string;
  totalHours: number;
  projektId: string;
}): Promise<void> {
  // Idempotenz: Marker pro MA+Datum
  const markerKey = `[auto-vorgang-stundenplausi:${opts.mitarbeiterId}:${opts.datum}]`;
  const [ma] = await db
    .select({ notes: schema.mitarbeiter.notes })
    .from(schema.mitarbeiter)
    .where(eq(schema.mitarbeiter.id, opts.mitarbeiterId))
    .limit(1);
  if (ma?.notes?.includes(markerKey)) return;

  await createVorgangFromTrigger({
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    source: "stunden_unplausibel",
    title: `Stunden-Plausi: ${opts.mitarbeiterName} mit ${opts.totalHours.toFixed(2)}h am ${opts.datum}`,
    category: "vertragspflicht",
    projectId: opts.projektId,
    dueDate: isoToday(3),
    firstStep: {
      kind: "klassifikation",
      payload: {
        mitarbeiterId: opts.mitarbeiterId,
        mitarbeiterName: opts.mitarbeiterName,
        datum: opts.datum,
        totalHours: opts.totalHours,
        triggeredBy: "create_stunden",
      },
      citations: [
        {
          sourceKind: "intern",
          sourceRef: "§ 3 ArbZG",
          sourceText:
            "Werktägliche Arbeitszeit darf 8 Std. nicht überschreiten; Verlängerung auf max. 10 Std. nur unter Voraussetzungen.",
        },
      ],
    },
    auditPayload: {
      mitarbeiterId: opts.mitarbeiterId,
      datum: opts.datum,
      totalHours: opts.totalHours,
    },
  });

  await db
    .update(schema.mitarbeiter)
    .set({
      notes: ma?.notes ? `${ma.notes}\n${markerKey}` : markerKey,
      updatedAt: new Date(),
    })
    .where(eq(schema.mitarbeiter.id, opts.mitarbeiterId));
}

/* ============== REDIRECT-WRAPPERS ============== */

/**
 * Redirect-Wrapper für `<form action={createMitarbeiterRedirect}>` —
 * leitet bei Erfolg auf die MA-Liste, bei Fehler ins Edit-Formular zurück.
 */
export async function createMitarbeiterRedirect(formData: FormData): Promise<void> {
  const result = await createMitarbeiter(null, formData);
  if (!result.ok) {
    redirect(
      `/stunden/mitarbeiter/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect("/stunden/mitarbeiter");
}

export async function createStundenEintragRedirect(formData: FormData): Promise<void> {
  const result = await createStundenEintrag(null, formData);
  if (!result.ok) {
    const projektId = String(formData.get("projektId") ?? "");
    const target = projektId
      ? `/projekte/${projektId}/stunden?error=${encodeURIComponent(result.formError ?? "Fehler")}`
      : `/stunden?error=${encodeURIComponent(result.formError ?? "Fehler")}`;
    redirect(target);
  }
  redirect("/stunden");
}

export async function lockWocheRedirect(formData: FormData): Promise<void> {
  const result = await lockWoche(null, formData);
  if (!result.ok) {
    redirect(`/stunden?error=${encodeURIComponent(result.formError ?? "Fehler")}`);
  }
  redirect(`/stunden?jahr=${result.data.jahr}&kw=${result.data.kw}&locked=1`);
}

/* ============== AGGREGATIONS-HELPER (für Nachkalk Modul 4.1) ============== */

/**
 * Liefert Lohn-Cents pro LV-Position für ein Projekt.
 * Wird von der Nachkalkulation (Modul 4.1) genutzt.
 */
export async function lohnCentsPerLvPosition(
  workspaceId: string,
  projektId: string
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      lvPositionId: schema.stunden.lvPositionId,
      stunden: schema.stunden.stunden,
      stundensatzCents: schema.stunden.stundensatzCents,
    })
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        eq(schema.stunden.projektId, projektId),
        sql`${schema.stunden.lvPositionId} IS NOT NULL`
      )
    );
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!r.lvPositionId) continue;
    const lohn = Math.round(r.stunden * r.stundensatzCents);
    m.set(r.lvPositionId, (m.get(r.lvPositionId) ?? 0) + lohn);
  }
  return m;
}
