"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  idOnlySchema,
  lvImportSchema,
  lvItemAddSchema,
  lvItemUpdateSchema,
} from "@/lib/validation/schemas";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { validateUploadFile } from "@/lib/storage/validation";
import { parseGaebXml } from "@/lib/gaeb/parse";
import { GaebParseError } from "@/lib/gaeb/types";
import { computeItemTotal, computeTotals } from "@/lib/lv";

async function loadLvOrThrow(lvId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.lv)
    .where(and(eq(schema.lv.id, lvId), eq(schema.lv.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("LV nicht gefunden.");
  return row;
}

/**
 * Re-Computes lv.totalNet/Gross aus allen aktuellen Items und schreibt
 * zurück. Wird nach jeder Mutation aufgerufen.
 */
async function recomputeLvTotals(lvId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const items = await db
    .select()
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.workspaceId, workspaceId),
        eq(schema.lvItems.lvId, lvId)
      )
    );
  const totals = computeTotals(items);
  await db
    .update(schema.lv)
    .set({
      totalNet: totals.totalNet,
      totalGross: totals.totalGross,
      updatedAt: new Date(),
    })
    .where(eq(schema.lv.id, lvId));
}

/**
 * Importiert eine GAEB-Datei. Wenn schon ein LV für das Projekt existiert,
 * wird es ERSETZT (mit allen Items). Speicherung des Quell-XML im Storage.
 */
export async function importGaeb(
  _prev: ActionResult<{ lvId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ lvId: string }>> {
  const file = formData.get("file");
  const fields = formDataToObject(formData);
  const parsed = lvImportSchema.safeParse(fields);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  if (!(file instanceof File) || file.size === 0) {
    return fail("Bitte eine GAEB-Datei auswählen.");
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

  const fileValidation = validateUploadFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!fileValidation.ok) return fail(fileValidation.reason);

  // XML lesen und parsen
  let xml: string;
  try {
    xml = await file.text();
  } catch {
    return fail("Datei konnte nicht gelesen werden.");
  }
  let parsedGaeb;
  try {
    parsedGaeb = parseGaebXml(xml);
  } catch (e) {
    if (e instanceof GaebParseError) {
      return fail(e.message + (e.hint ? ` — ${e.hint}` : ""));
    }
    return fail("GAEB-Parser-Fehler: " + (e instanceof Error ? e.message : "unbekannt"));
  }

  // Existierendes LV löschen (CASCADE löscht auch Items)
  const lvId = genId("lv");
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.lv)
      .where(
        and(
          eq(schema.lv.workspaceId, workspaceId),
          eq(schema.lv.projectId, parsed.data.projectId)
        )
      );

    // Datei speichern
    const buf = new Uint8Array(await file.arrayBuffer());
    const stored = await saveUpload({
      bucket: "lv_imports",
      workspaceId,
      entityId: lvId,
      fileName: `${lvId}_${file.name}`,
      data: buf,
    });

    const status =
      parsedGaeb.docType === "X84"
        ? "auftrag"
        : parsedGaeb.docType === "X83"
          ? "angebot"
          : "entwurf";

    await tx.insert(schema.lv).values({
      id: lvId,
      workspaceId,
      projectId: parsed.data.projectId,
      name: "Hauptauftrag",
      partyAg: parsedGaeb.partyAg,
      partyAn: parsedGaeb.partyAn,
      currency: parsedGaeb.currency,
      status,
      gaebSourceFilename: file.name,
      gaebSourceVersion: parsedGaeb.versionLabel,
      gaebSourcePath: stored.storagePath,
      gaebImportedAt: new Date(),
      totalNet: parsedGaeb.totalNet,
      totalGross: 0, // wird gleich neu berechnet
    });

    // Items in zwei Pässen einfügen, damit parentId-Refs aufgelöst werden:
    // 1. Pass: alle ohne parentId
    // 2. Pass: alle mit parentId, dabei localId → echte ID mappen
    const idMap = new Map<string, string>();
    for (const it of parsedGaeb.items) {
      idMap.set(it.localId, genId("lvit"));
    }
    for (const it of parsedGaeb.items) {
      await tx.insert(schema.lvItems).values({
        id: idMap.get(it.localId)!,
        workspaceId,
        lvId,
        parentId: it.parentLocalId ? idMap.get(it.parentLocalId) ?? null : null,
        kind: it.kind,
        oz: it.oz,
        shortText: it.shortText,
        longText: it.longText,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        sortIndex: it.sortIndex,
        gaebExternalId: it.externalId,
      });
    }
  });

  await recomputeLvTotals(lvId);

  revalidatePath(`/projekte/${parsed.data.projectId}/lv`);
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  redirect(`/projekte/${parsed.data.projectId}/lv`);
}

export async function updateLvItem(formData: FormData): Promise<void> {
  const parsed = lvItemUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.id, parsed.data.id),
        eq(schema.lvItems.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Item nicht gefunden.");

  const totalPrice = computeItemTotal(parsed.data.quantity, parsed.data.unitPrice);

  await db
    .update(schema.lvItems)
    .set({
      kind: parsed.data.kind,
      oz: parsed.data.oz,
      shortText: parsed.data.shortText,
      longText: parsed.data.longText,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPrice: parsed.data.unitPrice,
      totalPrice,
      vatPercent: parsed.data.vatPercent,
      updatedAt: new Date(),
    })
    .where(eq(schema.lvItems.id, parsed.data.id));

  await recomputeLvTotals(existing.lvId);

  const lv = await loadLvOrThrow(existing.lvId);
  revalidatePath(`/projekte/${lv.projectId}/lv`);
  revalidatePath(`/projekte/${lv.projectId}/lv/${parsed.data.id}/edit`);
}

export async function addLvItem(formData: FormData): Promise<void> {
  const parsed = lvItemAddSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  const lv = await loadLvOrThrow(parsed.data.lvId);

  // Sortindex: hinten anstellen unter parent
  const siblings = await db
    .select({ sortIndex: schema.lvItems.sortIndex })
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.workspaceId, workspaceId),
        eq(schema.lvItems.lvId, lv.id),
        parsed.data.parentId
          ? eq(schema.lvItems.parentId, parsed.data.parentId)
          : isNull(schema.lvItems.parentId)
      )
    );
  const nextSort = siblings.length > 0
    ? Math.max(...siblings.map((s) => s.sortIndex)) + 1
    : 0;

  const totalPrice = computeItemTotal(parsed.data.quantity, parsed.data.unitPrice);
  await db.insert(schema.lvItems).values({
    id: genId("lvit"),
    workspaceId,
    lvId: lv.id,
    parentId: parsed.data.parentId,
    kind: parsed.data.kind,
    oz: parsed.data.oz,
    shortText: parsed.data.shortText,
    longText: parsed.data.longText,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    unitPrice: parsed.data.unitPrice,
    totalPrice,
    vatPercent: parsed.data.vatPercent,
    sortIndex: nextSort,
  });

  await recomputeLvTotals(lv.id);
  revalidatePath(`/projekte/${lv.projectId}/lv`);
}

export async function deleteLvItem(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Item-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({ lvId: schema.lvItems.lvId })
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.id, parsed.data.id),
        eq(schema.lvItems.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  await db
    .delete(schema.lvItems)
    .where(eq(schema.lvItems.id, parsed.data.id));

  await recomputeLvTotals(existing.lvId);
  const lv = await loadLvOrThrow(existing.lvId);
  revalidatePath(`/projekte/${lv.projectId}/lv`);
}

export async function deleteLv(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("LV-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({
      projectId: schema.lv.projectId,
      gaebSourcePath: schema.lv.gaebSourcePath,
    })
    .from(schema.lv)
    .where(
      and(
        eq(schema.lv.id, parsed.data.id),
        eq(schema.lv.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  if (existing.gaebSourcePath) {
    await deleteUpload(existing.gaebSourcePath);
  }
  await db.delete(schema.lv).where(eq(schema.lv.id, parsed.data.id));

  revalidatePath(`/projekte/${existing.projectId}/lv`);
  revalidatePath(`/projekte/${existing.projectId}`);
  redirect(`/projekte/${existing.projectId}/lv`);
}
