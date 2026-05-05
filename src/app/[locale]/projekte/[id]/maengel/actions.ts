"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  mangelAnzeigeAntwortSchema,
  mangelAnzeigeCreateSchema,
  mangelCreateSchema,
  mangelEditSchema,
  mangelStatusSchema,
  mangelDeleteSchema,
} from "@/lib/validation/maengel";
import { formDataToObject } from "@/lib/validation/schemas";
import { isAllowedTransition } from "@/lib/maengel/state-machine";
import { mangelTitle } from "@/lib/maengel";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadMangelOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.id, id),
        eq(schema.maengel.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Mangel nicht gefunden.");
  return row;
}

/**
 * Auto-Vorgang bei strittigem Mangel + aktiver Sicherheit für das Projekt
 * (Vertragserfüllungs- oder Mängelansprüchebürgschaft).
 *
 * Idempotenz: Marker `[auto-vorgang-sicherheit:<mangelId>]` im notes-Feld
 * des Mangels — verhindert Duplikate beim mehrfachen Status-Toggle.
 */
async function reconcileSicherheitInanspruchnahme(
  mangelId: string
): Promise<void> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const m = await loadMangelOrThrow(mangelId);
  if (m.status !== "strittig") return;

  const marker = `[auto-vorgang-sicherheit:${m.id}]`;
  if (m.notes?.includes(marker)) return;

  const securities = await db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.workspaceId, workspaceId),
        eq(schema.securities.projectId, m.projectId)
      )
    );
  const eligible = securities.filter(
    (s) =>
      (s.kind === "vertragserfuellung" || s.kind === "maengelanspruch") &&
      (s.status === "aktiv" || s.status === "rueckgabe_angefordert")
  );
  if (eligible.length === 0) return;

  await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "sicherheit_inanspruchnahme_pruefen",
    title: `Sicherheit-Inanspruchnahme prüfen: ${mangelTitle(m)}`,
    category: "vertragspflicht",
    projectId: m.projectId,
    dueDate: isoDateInDays(7),
    firstStep: {
      kind: "klassifikation",
      payload: {
        mangelId: m.id,
        phase: m.phase,
        prioritaet: m.prioritaet,
        eligibleSecurityIds: eligible.map((s) => s.id),
        triggeredBy: "mangel_strittig",
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 17 VOB/B",
          sourceText:
            "Sicherheit dient zur Erfüllung der Vertragspflichten und zur Mängelbeseitigung — bei strittigem Mangel kann der AG sie in Anspruch nehmen.",
        },
      ],
    },
    auditPayload: {
      mangelId: m.id,
      eligibleSecurityIds: eligible.map((s) => s.id),
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

/* ============== CRUD ============== */

export async function createMangel(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = mangelCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
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

  const id = genId("mng");
  try {
    await db.insert(schema.maengel).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      phase: parsed.data.phase,
      abnahmeId: parsed.data.abnahmeId,
      beschreibung: parsed.data.beschreibung,
      kategorie: parsed.data.kategorie,
      ortImBauwerk: parsed.data.ortImBauwerk,
      gemeldetVon: parsed.data.gemeldetVon,
      gemeldetAm: parsed.data.gemeldetAm,
      prioritaet: parsed.data.prioritaet,
      fristsetzungDatum: parsed.data.fristsetzungDatum,
      behebungBis: parsed.data.behebungBis,
      kostenGeschaetztCents: parsed.data.kostenGeschaetztCents,
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Mangel konnte nicht gespeichert werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/maengel`);
  return { ok: true, data: { id } };
}

export async function updateMangel(formData: FormData): Promise<void> {
  const parsed = mangelEditSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }

  const existing = await loadMangelOrThrow(parsed.data.id);
  if (!isAllowedTransition(existing.status, parsed.data.status)) {
    throw new Error(
      `Status-Übergang ${existing.status} → ${parsed.data.status} ist nicht zulässig.`
    );
  }

  const behobenAm =
    parsed.data.status === "behoben" && !parsed.data.behobenAm
      ? isoToday()
      : parsed.data.behobenAm;

  await db
    .update(schema.maengel)
    .set({
      phase: parsed.data.phase,
      abnahmeId: parsed.data.abnahmeId,
      beschreibung: parsed.data.beschreibung,
      kategorie: parsed.data.kategorie,
      ortImBauwerk: parsed.data.ortImBauwerk,
      gemeldetVon: parsed.data.gemeldetVon,
      gemeldetAm: parsed.data.gemeldetAm,
      prioritaet: parsed.data.prioritaet,
      fristsetzungDatum: parsed.data.fristsetzungDatum,
      behebungBis: parsed.data.behebungBis,
      status: parsed.data.status,
      behobenAm,
      behobenDurchNuId: parsed.data.behobenDurchNuId,
      kostenGeschaetztCents: parsed.data.kostenGeschaetztCents,
      kostenIstCents: parsed.data.kostenIstCents,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.maengel.id, parsed.data.id));

  if (parsed.data.status === "strittig") {
    await reconcileSicherheitInanspruchnahme(parsed.data.id);
  }

  revalidatePath(`/projekte/${existing.projectId}/maengel`);
  revalidatePath(`/projekte/${existing.projectId}/maengel/${parsed.data.id}`);
}

export async function transitionMangelStatus(formData: FormData): Promise<void> {
  const parsed = mangelStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Status.");

  const existing = await loadMangelOrThrow(parsed.data.id);
  if (!isAllowedTransition(existing.status, parsed.data.status)) {
    throw new Error(
      `Status-Übergang ${existing.status} → ${parsed.data.status} ist nicht zulässig.`
    );
  }

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

  if (parsed.data.status === "strittig") {
    await reconcileSicherheitInanspruchnahme(parsed.data.id);
  }

  revalidatePath(`/projekte/${existing.projectId}/maengel`);
  revalidatePath(`/projekte/${existing.projectId}/maengel/${parsed.data.id}`);
}

export async function deleteMangel(formData: FormData): Promise<void> {
  const parsed = mangelDeleteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Mangel-ID fehlt.");

  const existing = await loadMangelOrThrow(parsed.data.id);

  await db.delete(schema.maengel).where(eq(schema.maengel.id, parsed.data.id));

  revalidatePath(`/projekte/${existing.projectId}/maengel`);
  redirect(`/projekte/${existing.projectId}/maengel`);
}

/* ============== ANZEIGEN ============== */

export async function createMangelAnzeige(formData: FormData): Promise<void> {
  const parsed = mangelAnzeigeCreateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const m = await loadMangelOrThrow(parsed.data.mangelId);

  const id = genId("mna");
  await db.insert(schema.maengelAnzeigen).values({
    id,
    workspaceId,
    mangelId: m.id,
    anzeigeAnUserId: parsed.data.anzeigeAnUserId,
    anzeigeAnExtern: parsed.data.anzeigeAnExtern,
    versendetAm: parsed.data.versendetAm,
    versandweg: parsed.data.versandweg,
    inhaltText: parsed.data.inhaltText,
    notes: parsed.data.notes,
  });

  revalidatePath(`/projekte/${m.projectId}/maengel/${m.id}`);
  redirect(`/projekte/${m.projectId}/maengel/${m.id}`);
}

export async function recordAnzeigeAntwort(formData: FormData): Promise<void> {
  const parsed = mangelAnzeigeAntwortSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.maengelAnzeigen)
    .where(
      and(
        eq(schema.maengelAnzeigen.id, parsed.data.id),
        eq(schema.maengelAnzeigen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Anzeige nicht gefunden.");

  await db
    .update(schema.maengelAnzeigen)
    .set({
      antwortEingegangen: true,
      antwortText: parsed.data.antwortText,
      antwortDatum: parsed.data.antwortDatum,
    })
    .where(eq(schema.maengelAnzeigen.id, parsed.data.id));

  const [m] = await db
    .select({ projectId: schema.maengel.projectId })
    .from(schema.maengel)
    .where(eq(schema.maengel.id, existing.mangelId))
    .limit(1);
  if (m) {
    revalidatePath(`/projekte/${m.projectId}/maengel/${existing.mangelId}`);
  }
}
