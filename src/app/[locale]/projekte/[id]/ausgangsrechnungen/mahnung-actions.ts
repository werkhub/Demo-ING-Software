"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  arMahnungCreateSchema,
  arMahnungMarkSentSchema,
  arMahnungUpdateBodySchema,
  formDataToObject,
  idOnlySchema,
} from "@/lib/validation/schemas";
import {
  STANDARD_FRIST_TAGE,
  STANDARD_MAHNGEBUEHR,
  computeVerzugszinsen,
  daysBetweenIso,
  defaultMahnungText,
  defaultZinsSatzPercent,
} from "@/lib/mahnung";
import { getProjectById } from "@/db/queries";

async function loadArOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungen.id, id),
        eq(schema.ausgangsrechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Rechnung nicht gefunden.");
  return row;
}

function isoDateInDays(fromIso: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso);
  if (!m) return fromIso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Void-Wrapper für direkte Form-Submission ohne useActionState.
 */
export async function createMahnungVoid(formData: FormData): Promise<void> {
  const r = await createMahnung(null, formData);
  if (!r.ok) {
    const fieldMsg = Object.values(r.fieldErrors ?? {})
      .flat()
      .join(" · ");
    throw new Error(
      r.formError ?? fieldMsg ?? "Mahnung konnte nicht erstellt werden."
    );
  }
}

/**
 * Erstellt eine Mahnung. Berechnet Verzugszinsen + Mahngebühr + neuen
 * dueDate automatisch (überschreibbar). Setzt AR-Status auf
 * mahnung_1/2/3.
 */
export async function createMahnung(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = arMahnungCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const workspaceId = await getCurrentWorkspaceId();
  const ar = await loadArOrThrow(parsed.data.ausgangsrechnungId);
  const project = await getProjectById(ar.projectId);
  if (!project) return fail("Projekt nicht gefunden.");

  // Mahnung nur sinnvoll, wenn AR überhaupt versendet ist.
  if (ar.status === "entwurf") {
    return fail("Rechnung ist noch im Entwurf — kann nicht gemahnt werden.");
  }
  if (ar.status === "bezahlt") {
    return fail("Rechnung ist bereits bezahlt.");
  }

  // Tage zwischen Rechnungs-/Fälligkeitsdatum und Mahn-Datum
  const startIso = ar.dueDate ?? ar.invoiceDate;
  const tage = Math.max(0, daysBetweenIso(startIso, parsed.data.issuedAt));

  const zinsSatz =
    parsed.data.zinsSatzPercent ?? defaultZinsSatzPercent(project.contractType);
  const basisbetrag = ar.payoutGross - (ar.paidAmount ?? 0);
  const verzugszinsen = computeVerzugszinsen(basisbetrag, zinsSatz, tage);
  const level = parsed.data.level as 1 | 2 | 3;
  const mahngebuehr = parsed.data.mahngebuehr ?? STANDARD_MAHNGEBUEHR[level];
  const newDueDate = isoDateInDays(parsed.data.issuedAt, STANDARD_FRIST_TAGE[level]);

  const id = genId("mhn");
  const bodyText = defaultMahnungText({
    level,
    ar: {
      number: ar.number,
      invoiceDate: ar.invoiceDate,
      payoutGross: basisbetrag,
      dueDate: ar.dueDate,
    },
    newDueDate,
    mahngebuehr,
    verzugszinsen,
    zinsSatzPercent: zinsSatz,
    zinsTage: tage,
    partyAg: ar.partyAg,
  });

  await db.transaction(async (tx) => {
    await tx.insert(schema.ausgangsrechnungMahnungen).values({
      id,
      workspaceId,
      ausgangsrechnungId: ar.id,
      level,
      issuedAt: parsed.data.issuedAt,
      dueDate: newDueDate,
      mahngebuehr,
      verzugszinsen,
      zinsSatzPercent: zinsSatz,
      zinsBasisBetrag: basisbetrag,
      zinsTage: tage,
      bodyText,
      notes: parsed.data.notes,
    });

    // AR-Status auf mahnung_X setzen (egal welcher Status vorher — wir
    // erlauben nur 1→2→3-Steigerung als UI-Workflow; höhere Levels
    // überschreiben niedrigere)
    const newArStatus =
      level === 1 ? "mahnung_1" : level === 2 ? "mahnung_2" : "mahnung_3";
    await tx
      .update(schema.ausgangsrechnungen)
      .set({ status: newArStatus, updatedAt: new Date() })
      .where(eq(schema.ausgangsrechnungen.id, ar.id));
  });

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
  revalidatePath("/ausgangsrechnungen");
  return { ok: true, data: { id } };
}

export async function updateMahnungBody(formData: FormData): Promise<void> {
  const parsed = arMahnungUpdateBodySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Mahn-Text zu kurz.");
  const workspaceId = await getCurrentWorkspaceId();
  const [m] = await db
    .select()
    .from(schema.ausgangsrechnungMahnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungMahnungen.id, parsed.data.id),
        eq(schema.ausgangsrechnungMahnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!m) throw new Error("Mahnung nicht gefunden.");
  if (m.sentAt) throw new Error("Mahnung wurde bereits versendet — Edit gesperrt.");

  await db
    .update(schema.ausgangsrechnungMahnungen)
    .set({ bodyText: parsed.data.bodyText, updatedAt: new Date() })
    .where(eq(schema.ausgangsrechnungMahnungen.id, m.id));

  const ar = await loadArOrThrow(m.ausgangsrechnungId);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}

export async function markMahnungSent(formData: FormData): Promise<void> {
  const parsed = arMahnungMarkSentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Versanddatum fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [m] = await db
    .select()
    .from(schema.ausgangsrechnungMahnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungMahnungen.id, parsed.data.id),
        eq(schema.ausgangsrechnungMahnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!m) throw new Error("Mahnung nicht gefunden.");
  if (m.sentAt) return; // idempotent

  await db
    .update(schema.ausgangsrechnungMahnungen)
    .set({ sentAt: new Date(parsed.data.sentAt), updatedAt: new Date() })
    .where(eq(schema.ausgangsrechnungMahnungen.id, m.id));

  const ar = await loadArOrThrow(m.ausgangsrechnungId);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}

export async function deleteMahnung(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Mahnungs-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [m] = await db
    .select()
    .from(schema.ausgangsrechnungMahnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungMahnungen.id, parsed.data.id),
        eq(schema.ausgangsrechnungMahnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!m) return;
  if (m.sentAt) {
    throw new Error("Versendete Mahnungen bleiben erhalten (Beweissicherung).");
  }

  const ar = await loadArOrThrow(m.ausgangsrechnungId);
  await db
    .delete(schema.ausgangsrechnungMahnungen)
    .where(eq(schema.ausgangsrechnungMahnungen.id, m.id));

  // AR-Status zurücksetzen wenn keine andere Mahnung mehr existiert
  const remaining = await db
    .select({ level: schema.ausgangsrechnungMahnungen.level })
    .from(schema.ausgangsrechnungMahnungen)
    .where(
      eq(schema.ausgangsrechnungMahnungen.ausgangsrechnungId, ar.id)
    );
  if (remaining.length === 0) {
    await db
      .update(schema.ausgangsrechnungen)
      .set({ status: "versendet", updatedAt: new Date() })
      .where(eq(schema.ausgangsrechnungen.id, ar.id));
  } else {
    const maxLevel = Math.max(...remaining.map((r) => r.level));
    const newStatus =
      maxLevel === 1 ? "mahnung_1" : maxLevel === 2 ? "mahnung_2" : "mahnung_3";
    await db
      .update(schema.ausgangsrechnungen)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(schema.ausgangsrechnungen.id, ar.id));
  }

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
  redirect(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}
