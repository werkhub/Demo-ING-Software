"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  aufmassCreateSchema,
  aufmassStatusUpdateSchema,
  aufmassZeileAddSchema,
  aufmassZeileStatusUpdateSchema,
  aufmassZeileUpdateSchema,
  formDataToObject,
  idOnlySchema,
} from "@/lib/validation/schemas";
import { evaluateFormula } from "@/lib/aufmass/formula";
import {
  computeAufmassTotals,
  isEditable,
  nextAllowedStatuses,
} from "@/lib/aufmass";

async function loadAufmassOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.aufmass)
    .where(
      and(
        eq(schema.aufmass.id, id),
        eq(schema.aufmass.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Aufmaß nicht gefunden.");
  return row;
}

async function loadZeileOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.id, id),
        eq(schema.aufmassZeilen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Zeile nicht gefunden.");
  return row;
}

async function recomputeAufmassTotals(aufmassId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const zeilen = await db
    .select()
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.workspaceId, workspaceId),
        eq(schema.aufmassZeilen.aufmassId, aufmassId)
      )
    );
  const totals = computeAufmassTotals(zeilen);
  await db
    .update(schema.aufmass)
    .set({
      totalNet: totals.totalNet,
      totalApprovedNet: totals.totalApprovedNet,
      updatedAt: new Date(),
    })
    .where(eq(schema.aufmass.id, aufmassId));
}

/**
 * Wertet eine Formel aus und liefert die DB-Felder zurück (computedQuantity,
 * formulaError, totalPrice). totalPrice = computedQuantity × unitPrice.
 */
function evaluateAndCompute(
  formula: string | null,
  unitPrice: number | null
): {
  computedQuantity: number | null;
  formulaError: string | null;
  totalPrice: number | null;
} {
  if (!formula) {
    return { computedQuantity: null, formulaError: null, totalPrice: null };
  }
  const result = evaluateFormula(formula);
  if (!result.ok) {
    return {
      computedQuantity: null,
      formulaError: result.error,
      totalPrice: null,
    };
  }
  const tp =
    unitPrice !== null
      ? Math.round(result.value * unitPrice * 100) / 100
      : null;
  return {
    computedQuantity: result.value,
    formulaError: null,
    totalPrice: tp,
  };
}

/* ============== AUFMASS CRUD ============== */

export async function createAufmass(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = aufmassCreateSchema.safeParse(formDataToObject(formData));
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

  const [lv] = await db
    .select({ id: schema.lv.id })
    .from(schema.lv)
    .where(
      and(
        eq(schema.lv.id, parsed.data.lvId),
        eq(schema.lv.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!lv) return fail("LV nicht gefunden.");

  const id = genId("auf");
  try {
    await db.insert(schema.aufmass).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      lvId: parsed.data.lvId,
      name: parsed.data.name,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Aufmaß konnte nicht angelegt werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/aufmass`);
  redirect(`/projekte/${parsed.data.projectId}/aufmass/${id}`);
}

export async function updateAufmassStatus(formData: FormData): Promise<void> {
  const parsed = aufmassStatusUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) throw new Error("Ungültiger Status.");
  const a = await loadAufmassOrThrow(parsed.data.id);

  if (!nextAllowedStatuses(a.status).includes(parsed.data.status)) {
    throw new Error(
      `Übergang von "${a.status}" nach "${parsed.data.status}" nicht erlaubt.`
    );
  }

  const now = new Date();
  const updates: Partial<typeof schema.aufmass.$inferInsert> = {
    status: parsed.data.status,
    updatedAt: now,
  };
  if (parsed.data.status === "eingereicht" && !a.submittedAt) {
    updates.submittedAt = now;
  }
  if (parsed.data.status === "geprueft" && !a.checkedAt) {
    updates.checkedAt = now;
  }
  if (parsed.data.status === "freigegeben" && !a.releasedAt) {
    updates.releasedAt = now;
  }
  await db
    .update(schema.aufmass)
    .set(updates)
    .where(eq(schema.aufmass.id, a.id));

  // Side-Effect: bei freigegeben → lv.status = "aufmass" (wenn noch nicht weiter)
  if (parsed.data.status === "freigegeben") {
    const [lv] = await db
      .select({ id: schema.lv.id, status: schema.lv.status })
      .from(schema.lv)
      .where(eq(schema.lv.id, a.lvId))
      .limit(1);
    if (lv && (lv.status === "auftrag" || lv.status === "angebot" || lv.status === "entwurf")) {
      await db
        .update(schema.lv)
        .set({ status: "aufmass", updatedAt: new Date() })
        .where(eq(schema.lv.id, lv.id));
    }
  }

  revalidatePath(`/projekte/${a.projectId}/aufmass/${a.id}`);
  revalidatePath(`/projekte/${a.projectId}/aufmass`);
  revalidatePath(`/projekte/${a.projectId}/lv`);
}

export async function deleteAufmass(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Aufmaß-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({ projectId: schema.aufmass.projectId })
    .from(schema.aufmass)
    .where(
      and(
        eq(schema.aufmass.id, parsed.data.id),
        eq(schema.aufmass.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;
  await db.delete(schema.aufmass).where(eq(schema.aufmass.id, parsed.data.id));
  revalidatePath(`/projekte/${existing.projectId}/aufmass`);
  redirect(`/projekte/${existing.projectId}/aufmass`);
}

/* ============== ZEILEN CRUD ============== */

export async function addAufmassZeile(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = aufmassZeileAddSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const a = await loadAufmassOrThrow(parsed.data.aufmassId);
  if (!isEditable(a.status)) {
    return fail("Aufmaß ist nicht mehr im Entwurf — Zeilen-Edits sind gesperrt.");
  }

  // Snapshot aus LV-Position, falls verlinkt — überschreibt nicht, falls
  // unit/unitPrice manuell mitgegeben wurden.
  let unit = parsed.data.unit;
  let unitPrice = parsed.data.unitPrice;
  if (parsed.data.lvItemId) {
    const [lvi] = await db
      .select({
        unit: schema.lvItems.unit,
        unitPrice: schema.lvItems.unitPrice,
      })
      .from(schema.lvItems)
      .where(
        and(
          eq(schema.lvItems.id, parsed.data.lvItemId),
          eq(schema.lvItems.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (lvi) {
      unit = unit ?? lvi.unit;
      unitPrice = unitPrice ?? lvi.unitPrice;
    }
  }

  const evaluated = evaluateAndCompute(parsed.data.formula, unitPrice);

  // Nächster sortIndex
  const allRows = await db
    .select({ sortIndex: schema.aufmassZeilen.sortIndex })
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.workspaceId, workspaceId),
        eq(schema.aufmassZeilen.aufmassId, a.id)
      )
    );
  const nextSort =
    allRows.length > 0 ? Math.max(...allRows.map((s) => s.sortIndex)) + 1 : 0;

  const id = genId("auz");
  try {
    await db.insert(schema.aufmassZeilen).values({
      id,
      workspaceId,
      aufmassId: a.id,
      lvItemId: parsed.data.lvItemId,
      ozOverride: parsed.data.ozOverride,
      description: parsed.data.description,
      formula: parsed.data.formula,
      computedQuantity: evaluated.computedQuantity,
      formulaError: evaluated.formulaError,
      unit,
      unitPrice,
      totalPrice: evaluated.totalPrice,
      sortIndex: nextSort,
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Zeile konnte nicht gespeichert werden.");
  }

  await recomputeAufmassTotals(a.id);
  revalidatePath(`/projekte/${a.projectId}/aufmass/${a.id}`);
  return { ok: true, data: { id } };
}

export async function updateAufmassZeile(formData: FormData): Promise<void> {
  const parsed = aufmassZeileUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const z = await loadZeileOrThrow(parsed.data.id);
  const a = await loadAufmassOrThrow(z.aufmassId);
  if (!isEditable(a.status)) {
    throw new Error(
      "Aufmaß ist nicht mehr im Entwurf — Zeilen-Edits sind gesperrt."
    );
  }

  const unit = parsed.data.unit ?? z.unit;
  const unitPrice = parsed.data.unitPrice ?? z.unitPrice;
  const evaluated = evaluateAndCompute(parsed.data.formula, unitPrice);

  await db
    .update(schema.aufmassZeilen)
    .set({
      ozOverride: parsed.data.ozOverride,
      description: parsed.data.description,
      formula: parsed.data.formula,
      computedQuantity: evaluated.computedQuantity,
      formulaError: evaluated.formulaError,
      unit,
      unitPrice,
      totalPrice: evaluated.totalPrice,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.aufmassZeilen.id, z.id));

  await recomputeAufmassTotals(z.aufmassId);
  revalidatePath(`/projekte/${a.projectId}/aufmass/${a.id}`);
}

export async function updateAufmassZeileStatus(
  formData: FormData
): Promise<void> {
  const parsed = aufmassZeileStatusUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    throw new Error("Ungültige Eingaben.");
  }
  const z = await loadZeileOrThrow(parsed.data.id);
  const a = await loadAufmassOrThrow(z.aufmassId);

  // approvedQuantity ist nur bei status=gekuerzt sinnvoll
  let approvedQuantity = parsed.data.approvedQuantity;
  let approvedTotal: number | null = null;
  if (parsed.data.status === "gekuerzt") {
    if (approvedQuantity === null || approvedQuantity === undefined) {
      throw new Error('Bei „gekürzt" muss die anerkannte Menge angegeben werden.');
    }
    if (z.unitPrice !== null) {
      approvedTotal =
        Math.round(approvedQuantity * z.unitPrice * 100) / 100;
    }
  } else {
    approvedQuantity = null;
  }

  await db
    .update(schema.aufmassZeilen)
    .set({
      status: parsed.data.status,
      approvedQuantity,
      approvedTotal,
      updatedAt: new Date(),
    })
    .where(eq(schema.aufmassZeilen.id, z.id));

  await recomputeAufmassTotals(z.aufmassId);
  revalidatePath(`/projekte/${a.projectId}/aufmass/${a.id}`);
}

export async function deleteAufmassZeile(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Zeilen-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({
      aufmassId: schema.aufmassZeilen.aufmassId,
    })
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.id, parsed.data.id),
        eq(schema.aufmassZeilen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;
  const a = await loadAufmassOrThrow(existing.aufmassId);
  if (!isEditable(a.status)) {
    throw new Error(
      "Aufmaß ist nicht mehr im Entwurf — Zeilen-Edits sind gesperrt."
    );
  }
  await db
    .delete(schema.aufmassZeilen)
    .where(eq(schema.aufmassZeilen.id, parsed.data.id));
  await recomputeAufmassTotals(existing.aufmassId);
  revalidatePath(`/projekte/${a.projectId}/aufmass/${a.id}`);
}
