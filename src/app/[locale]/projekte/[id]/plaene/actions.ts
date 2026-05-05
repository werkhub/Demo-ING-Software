"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation/schemas";
import {
  freigabeCreateSchema,
  freigabeUpdateSchema,
  idOnlySchema,
  planCreateSchema,
  planUpdateSchema,
  planVersandBestaetigenSchema,
  planVersandCreateSchema,
  versionCreateSchema,
} from "@/lib/validation/plaene";
import { aggregateFreigabeStatus } from "@/lib/plaene";
import { nextIndexLabel } from "@/lib/plaene/index-label";
import {
  deletePlanFolder,
  savePlanVersionFile,
} from "@/lib/plaene/storage";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import type { FreigabeStatus, Plan, PlanVersion } from "@/db/schema";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB Plan-PDFs / DWGs

async function loadPlan(id: string, workspaceId: string): Promise<Plan | null> {
  const [row] = await db
    .select()
    .from(schema.plaene)
    .where(
      and(eq(schema.plaene.id, id), eq(schema.plaene.workspaceId, workspaceId))
    )
    .limit(1);
  return row ?? null;
}

async function loadVersion(
  id: string,
  workspaceId: string
): Promise<PlanVersion | null> {
  const [row] = await db
    .select()
    .from(schema.plaeneVersionen)
    .where(
      and(
        eq(schema.plaeneVersionen.id, id),
        eq(schema.plaeneVersionen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

async function nextVersionNr(planId: string): Promise<number> {
  const [row] = await db
    .select({ max: max(schema.plaeneVersionen.versionNr) })
    .from(schema.plaeneVersionen)
    .where(eq(schema.plaeneVersionen.planId, planId));
  return (row?.max ?? 0) + 1;
}

/**
 * Aggregiert alle Freigaben der aktuellen Plan-Version und passt den
 * Plan-Status entsprechend an. Wenn alle "zugestimmt" → "freigegeben" + Vorgang
 * "plan_freigegeben" (Info, keine Frist). Idempotent über Plan-Status-Check.
 */
async function reconcilePlanStatus(planId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const plan = await loadPlan(planId, workspaceId);
  if (!plan || !plan.aktuelleVersionId) return;
  const freigaben = await db
    .select({ status: schema.plaeneFreigaben.freigabeStatus })
    .from(schema.plaeneFreigaben)
    .where(eq(schema.plaeneFreigaben.planVersionId, plan.aktuelleVersionId));
  const agg = aggregateFreigabeStatus(
    freigaben.map((f) => f.status as FreigabeStatus)
  );
  if (!agg.nextPlanStatus) return;
  if (agg.nextPlanStatus === plan.status) return;

  await db
    .update(schema.plaene)
    .set({ status: agg.nextPlanStatus, updatedAt: new Date() })
    .where(eq(schema.plaene.id, planId));

  if (agg.nextPlanStatus === "freigegeben") {
    const userId = await getCurrentUserId();
    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "plan_freigegeben",
      title: `Plan freigegeben: ${plan.planNr} — ${plan.bezeichnung}`,
      category: "sonstiges",
      projectId: plan.projektId,
      dueDate: null,
      firstStep: {
        kind: "klassifikation",
        payload: {
          planId: plan.id,
          planNr: plan.planNr,
          planTyp: plan.planTyp,
          versionId: plan.aktuelleVersionId,
          freigabenTotal: agg.total,
        },
      },
      auditPayload: {
        planId: plan.id,
        triggeredBy: "freigabe_aggregation",
      },
    });
  }
}

/* ============== PLAN CRUD ============== */

export async function createPlan(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const obj = formDataToObject(formData);
  const parsed = planCreateSchema.safeParse(obj);
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Optional: erste Version mitgegeben?
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file.size > MAX_UPLOAD_BYTES) {
    return fail("Datei ist zu groß (max 25 MB).");
  }

  const planId = genId("pln");
  const now = new Date();
  let projectIdRedirect = parsed.data.projektId;

  try {
    await db.insert(schema.plaene).values({
      id: planId,
      workspaceId,
      projektId: parsed.data.projektId,
      planTyp: parsed.data.planTyp,
      planNr: parsed.data.planNr,
      bezeichnung: parsed.data.bezeichnung,
      masstab: parsed.data.masstab,
      datum: parsed.data.datum,
      planerName: parsed.data.planerName,
      status: "entwurf",
      notes: parsed.data.notes,
      createdAt: now,
      updatedAt: now,
    });

    if (hasFile) {
      const versionId = genId("plv");
      const buffer = await file.arrayBuffer();
      const saved = await savePlanVersionFile({
        workspaceId,
        planId,
        versionNr: 1,
        filename: file.name,
        data: buffer,
      });
      await db.insert(schema.plaeneVersionen).values({
        id: versionId,
        planId,
        workspaceId,
        versionNr: 1,
        datum: parsed.data.datum,
        filename: saved.filename,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: saved.sizeBytes,
        kommentar: "Initialversion",
        hochgeladenVon: userId,
      });
      await db
        .update(schema.plaene)
        .set({ aktuelleVersionId: versionId, updatedAt: new Date() })
        .where(eq(schema.plaene.id, planId));
    }
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Plan konnte nicht angelegt werden."
    );
  }

  revalidatePath(`/projekte/${projectIdRedirect}/plaene`);
  revalidatePath(`/projekte/${projectIdRedirect}`);
  redirect(`/projekte/${projectIdRedirect}/plaene/${planId}`);
}

export async function updatePlan(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = planUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const existing = await loadPlan(parsed.data.id, workspaceId);
  if (!existing) throw new Error("Plan nicht gefunden.");

  await db
    .update(schema.plaene)
    .set({
      planTyp: parsed.data.planTyp,
      planNr: parsed.data.planNr,
      bezeichnung: parsed.data.bezeichnung,
      masstab: parsed.data.masstab,
      datum: parsed.data.datum,
      planerName: parsed.data.planerName,
      status: parsed.data.status,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.plaene.id, parsed.data.id));

  revalidatePath(`/projekte/${existing.projektId}/plaene/${existing.id}`);
  revalidatePath(`/projekte/${existing.projektId}/plaene`);
}

export async function deletePlan(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Plan-ID fehlt.");
  const plan = await loadPlan(parsed.data.id, workspaceId);
  if (!plan) return;

  await db.delete(schema.plaene).where(eq(schema.plaene.id, parsed.data.id));
  await deletePlanFolder(workspaceId, parsed.data.id);

  revalidatePath(`/projekte/${plan.projektId}/plaene`);
  redirect(`/projekte/${plan.projektId}/plaene`);
}

/* ============== VERSIONEN ============== */

export async function addPlanVersion(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const parsed = versionCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const plan = await loadPlan(parsed.data.planId, workspaceId);
  if (!plan) return fail("Plan nicht gefunden.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Datei fehlt.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("Datei ist zu groß (max 25 MB).");
  }

  const versionId = genId("plv");
  let projectId = plan.projektId;
  try {
    const versionNr = await nextVersionNr(plan.id);
    const buffer = await file.arrayBuffer();
    const saved = await savePlanVersionFile({
      workspaceId,
      planId: plan.id,
      versionNr,
      filename: file.name,
      data: buffer,
    });
    // Index-Label: User-Eingabe (parsed.data.indexLabel) oder Auto-Vorschlag.
    let indexLabel = parsed.data.indexLabel;
    if (!indexLabel) {
      const existing = await db
        .select({ label: schema.plaeneVersionen.indexLabel })
        .from(schema.plaeneVersionen)
        .where(eq(schema.plaeneVersionen.planId, plan.id));
      indexLabel = nextIndexLabel(
        existing.map((r) => r.label ?? "").filter(Boolean),
        parsed.data.indexKategorie
      );
    }
    await db.insert(schema.plaeneVersionen).values({
      id: versionId,
      planId: plan.id,
      workspaceId,
      versionNr,
      indexLabel,
      indexKategorie: parsed.data.indexKategorie,
      datum: parsed.data.datum,
      filename: saved.filename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: saved.sizeBytes,
      kommentar: parsed.data.kommentar,
      hochgeladenVon: userId,
    });
    // Status auf zur_freigabe wenn vorher entwurf, neue Version wird Pflicht-Reviewing.
    const nextStatus =
      plan.status === "freigegeben" || plan.status === "zur_freigabe"
        ? "zur_freigabe"
        : plan.status;
    await db
      .update(schema.plaene)
      .set({
        aktuelleVersionId: versionId,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.plaene.id, plan.id));
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Version konnte nicht gespeichert werden."
    );
  }

  revalidatePath(`/projekte/${projectId}/plaene/${plan.id}`);
  revalidatePath(`/projekte/${projectId}/plaene`);
  redirect(`/projekte/${projectId}/plaene/${plan.id}`);
}

/* ============== FREIGABEN ============== */

export async function addFreigabe(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = freigabeCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const version = await loadVersion(parsed.data.planVersionId, workspaceId);
  if (!version) return fail("Version nicht gefunden.");
  if (!parsed.data.freigabeDurchUserId && !parsed.data.freigabeDurchName) {
    return fail("Entweder interner User oder externer Name erforderlich.");
  }

  const id = genId("plf");
  await db.insert(schema.plaeneFreigaben).values({
    id,
    planVersionId: parsed.data.planVersionId,
    workspaceId,
    freigabeDurchUserId: parsed.data.freigabeDurchUserId,
    freigabeDurchName: parsed.data.freigabeDurchName,
    freigabeRolle: parsed.data.freigabeRolle,
    freigabeStatus: "offen",
  });

  // Plan-Status auf "zur_freigabe" wenn entwurf — Workflow startet jetzt.
  const plan = await loadPlan(version.planId, workspaceId);
  if (plan && plan.status === "entwurf") {
    await db
      .update(schema.plaene)
      .set({ status: "zur_freigabe", updatedAt: new Date() })
      .where(eq(schema.plaene.id, plan.id));
  }

  revalidatePath(`/projekte/${plan?.projektId}/plaene/${version.planId}`);
  return { ok: true, data: { id } };
}

export async function updateFreigabe(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = freigabeUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const [existing] = await db
    .select()
    .from(schema.plaeneFreigaben)
    .where(
      and(
        eq(schema.plaeneFreigaben.id, parsed.data.id),
        eq(schema.plaeneFreigaben.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Freigabe nicht gefunden.");

  const today = new Date().toISOString().slice(0, 10);
  await db
    .update(schema.plaeneFreigaben)
    .set({
      freigabeStatus: parsed.data.freigabeStatus,
      freigabeKommentar: parsed.data.freigabeKommentar,
      freigabeDatum: today,
    })
    .where(eq(schema.plaeneFreigaben.id, parsed.data.id));

  const version = await loadVersion(existing.planVersionId, workspaceId);
  if (version) {
    await reconcilePlanStatus(version.planId);
    const plan = await loadPlan(version.planId, workspaceId);
    if (plan) {
      revalidatePath(`/projekte/${plan.projektId}/plaene/${plan.id}`);
      revalidatePath("/vorgaenge");
    }
  }
}

export async function deleteFreigabe(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Freigabe-ID fehlt.");
  const [existing] = await db
    .select()
    .from(schema.plaeneFreigaben)
    .where(
      and(
        eq(schema.plaeneFreigaben.id, parsed.data.id),
        eq(schema.plaeneFreigaben.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  await db
    .delete(schema.plaeneFreigaben)
    .where(eq(schema.plaeneFreigaben.id, parsed.data.id));

  const version = await loadVersion(existing.planVersionId, workspaceId);
  if (version) {
    const plan = await loadPlan(version.planId, workspaceId);
    if (plan) {
      revalidatePath(`/projekte/${plan.projektId}/plaene/${plan.id}`);
    }
  }
}

/* ============== HELPERS FÜR UI ============== */

export async function listVersionsForPlan(
  planId: string
): Promise<PlanVersion[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.plaeneVersionen)
    .where(
      and(
        eq(schema.plaeneVersionen.planId, planId),
        eq(schema.plaeneVersionen.workspaceId, workspaceId)
      )
    )
    .orderBy(asc(schema.plaeneVersionen.versionNr));
}

/* ============== PLAN-VERSAND (Sprint 3) ============== */

/**
 * Dokumentiert den Versand einer Plan-Version. Erstellt einen Vorgang im
 * Bautagebuch-Sinne — wer hat was wann erhalten.
 */
export async function recordPlanVersand(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = planVersandCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  // Plan-Version im Workspace?
  const [version] = await db
    .select({
      id: schema.plaeneVersionen.id,
      planId: schema.plaeneVersionen.planId,
      workspaceId: schema.plaeneVersionen.workspaceId,
    })
    .from(schema.plaeneVersionen)
    .where(
      and(
        eq(schema.plaeneVersionen.id, parsed.data.planVersionId),
        eq(schema.plaeneVersionen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!version) return fail("Plan-Version nicht gefunden.");

  const id = genId("pvs");
  await db.insert(schema.plaeneVersand).values({
    id,
    workspaceId,
    planVersionId: parsed.data.planVersionId,
    empfaengerName: parsed.data.empfaengerName,
    empfaengerEmail: parsed.data.empfaengerEmail,
    empfaengerRolle: parsed.data.empfaengerRolle,
    versandDatum: parsed.data.versandDatum,
    versandweg: parsed.data.versandweg,
    betreff: parsed.data.betreff,
    kommentar: parsed.data.kommentar,
    versendetVon: userId,
  });

  // Plan-ID auflösen für revalidate
  const [plan] = await db
    .select({ projektId: schema.plaene.projektId })
    .from(schema.plaene)
    .where(eq(schema.plaene.id, version.planId))
    .limit(1);

  if (plan) {
    revalidatePath(`/projekte/${plan.projektId}/plaene/${version.planId}`);
  }
  return { ok: true, data: { id } };
}

/**
 * Markiert die Eingangsbestätigung eines Versands. Wichtig für Beweis-
 * sicherung („Plan war beim Bauherrn") in Honorarstreit oder Mängel-
 * Diskussion.
 */
export async function bestaetigePlanVersand(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = planVersandBestaetigenSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const [versand] = await db
    .select({
      id: schema.plaeneVersand.id,
      planVersionId: schema.plaeneVersand.planVersionId,
    })
    .from(schema.plaeneVersand)
    .where(
      and(
        eq(schema.plaeneVersand.id, parsed.data.id),
        eq(schema.plaeneVersand.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!versand) return fail("Versand-Eintrag nicht gefunden.");

  await db
    .update(schema.plaeneVersand)
    .set({ eingangBestaetigtAm: parsed.data.eingangBestaetigtAm })
    .where(eq(schema.plaeneVersand.id, parsed.data.id));

  // Plan + Projekt auflösen für revalidate
  const [version] = await db
    .select({ planId: schema.plaeneVersionen.planId })
    .from(schema.plaeneVersionen)
    .where(eq(schema.plaeneVersionen.id, versand.planVersionId))
    .limit(1);
  if (version) {
    const [plan] = await db
      .select({ projektId: schema.plaene.projektId })
      .from(schema.plaene)
      .where(eq(schema.plaene.id, version.planId))
      .limit(1);
    if (plan) {
      revalidatePath(`/projekte/${plan.projektId}/plaene/${version.planId}`);
    }
  }
  return { ok: true, data: undefined };
}
