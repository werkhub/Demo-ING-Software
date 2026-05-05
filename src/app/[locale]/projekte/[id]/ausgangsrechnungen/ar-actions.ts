"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { getAuditContext, logChange } from "@/lib/audit/log";
import { genId } from "@/lib/utils";
import { fail, fieldFail, type ActionResult } from "@/lib/action-result";
import {
  ausgangsrechnungCreateSchema,
  ausgangsrechnungMarkPaidSchema,
  ausgangsrechnungStatusUpdateSchema,
  ausgangsrechnungUpdateSchema,
  arPositionAddSchema,
  arPositionUpdateSchema,
  formDataToObject,
  idOnlySchema,
} from "@/lib/validation/schemas";
import {
  computeArTotals,
  defaultDueDate,
  formatInvoiceNumber,
  isArEditable,
  nextAllowedArStatuses,
} from "@/lib/ausgangsrechnungen";
import { saveUpload } from "@/lib/storage";
import { generateXrechnungXml } from "@/lib/xrechnung/generate";
import { validateForXrechnung } from "@/lib/xrechnung/validate";
import { generateZugferdPdf } from "@/lib/zugferd/generate";
import {
  computeSkontoAbzug,
  isWithinSkontoFrist,
} from "@/lib/mahnung";
import {
  getArPositionen,
  getProjectById,
} from "@/db/queries";

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
  if (!row) throw new Error("Ausgangsrechnung nicht gefunden.");
  return row;
}

async function recomputeArTotals(arId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const [ar] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungen.id, arId),
        eq(schema.ausgangsrechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!ar) return;
  const positionen = await db
    .select()
    .from(schema.ausgangsrechnungPositionen)
    .where(
      and(
        eq(schema.ausgangsrechnungPositionen.workspaceId, workspaceId),
        eq(schema.ausgangsrechnungPositionen.ausgangsrechnungId, arId)
      )
    );
  const totals = computeArTotals({
    positionen,
    previousAbschlaegeNet: ar.previousAbschlaegeNet,
    securityRetentionPercent: ar.securityRetentionPercent,
    vatPercent: ar.vatPercent,
  });
  await db
    .update(schema.ausgangsrechnungen)
    .set({
      totalPositionsNet: totals.totalPositionsNet,
      securityRetentionAmount: totals.securityRetentionAmount,
      payoutNet: totals.payoutNet,
      payoutVat: totals.payoutVat,
      payoutGross: totals.payoutGross,
      updatedAt: new Date(),
    })
    .where(eq(schema.ausgangsrechnungen.id, arId));
}

/**
 * Workspace-weiter, fortlaufender Counter pro Jahr. Transactional
 * inkrementiert — Race-Condition-frei dank UNIQUE(workspaceId, year).
 */
async function nextInvoiceNumber(workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `${workspaceId}:${year}`;
  // INSERT OR IGNORE + SELECT + UPDATE in Transaction
  return db.transaction(async (tx) => {
    await tx
      .insert(schema.ausgangsrechnungCounter)
      .values({
        id: counterId,
        workspaceId,
        year,
        nextNumber: 1,
      })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(schema.ausgangsrechnungCounter)
      .where(eq(schema.ausgangsrechnungCounter.id, counterId))
      .limit(1);
    if (!row) throw new Error("Counter konnte nicht initialisiert werden.");
    const n = row.nextNumber;
    await tx
      .update(schema.ausgangsrechnungCounter)
      .set({ nextNumber: n + 1 })
      .where(eq(schema.ausgangsrechnungCounter.id, counterId));
    return formatInvoiceNumber(year, n);
  });
}

/**
 * Importiert Aufmaß-Zeilen (anerkannte Mengen) als AR-Positionen. Bei
 * gekürzten Zeilen wird die approvedQuantity verwendet. Bestrittene Zeilen
 * werden NICHT übernommen (keine Auszahlung).
 */
async function importPositionsFromAufmass(
  arId: string,
  aufmassId: string,
  workspaceId: string
): Promise<void> {
  const zeilen = await db
    .select()
    .from(schema.aufmassZeilen)
    .where(
      and(
        eq(schema.aufmassZeilen.workspaceId, workspaceId),
        eq(schema.aufmassZeilen.aufmassId, aufmassId)
      )
    );
  let sortIndex = 0;
  for (const z of zeilen) {
    if (z.status === "bestritten") continue;
    const useApproved = z.status === "gekuerzt";
    const quantity = useApproved ? z.approvedQuantity : z.computedQuantity;
    if (quantity === null) continue;
    const totalPrice = useApproved
      ? z.approvedTotal
      : z.totalPrice;

    // OZ herausfinden — entweder ozOverride, oder vom verlinkten LV-Item
    let oz = z.ozOverride;
    if (!oz && z.lvItemId) {
      const [lvi] = await db
        .select({ oz: schema.lvItems.oz })
        .from(schema.lvItems)
        .where(eq(schema.lvItems.id, z.lvItemId))
        .limit(1);
      oz = lvi?.oz ?? null;
    }

    await db.insert(schema.ausgangsrechnungPositionen).values({
      id: genId("arp"),
      workspaceId,
      ausgangsrechnungId: arId,
      lvItemId: z.lvItemId,
      aufmassZeileId: z.id,
      oz,
      description: z.description,
      quantity,
      unit: z.unit,
      unitPrice: z.unitPrice,
      totalPrice,
      sortIndex,
    });
    sortIndex++;
  }
}

export async function createAusgangsrechnung(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = ausgangsrechnungCreateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();

  // Projekt + Aufmaß validieren
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return fail("Projekt nicht gefunden.");

  let lvId: string | null = null;
  let snapshotPartyAg = parsed.data.partyAg ?? project.ag;
  let snapshotPartyAgAddress = parsed.data.partyAgAddress ?? project.siteAddress;

  if (parsed.data.aufmassId) {
    const [aufmass] = await db
      .select()
      .from(schema.aufmass)
      .where(
        and(
          eq(schema.aufmass.id, parsed.data.aufmassId),
          eq(schema.aufmass.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!aufmass || aufmass.projectId !== project.id) {
      return fail("Aufmaß nicht gefunden oder gehört nicht zum Projekt.");
    }
    if (aufmass.status !== "freigegeben" && aufmass.status !== "abgerechnet") {
      return fail(
        "Aufmaß muss freigegeben sein, bevor es abgerechnet werden kann."
      );
    }
    lvId = aufmass.lvId;
  }

  // Workspace-Stammdaten als Default für AN-Snapshots
  const [workspace] = await db
    .select({ name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  const id = genId("ar");
  const number = await nextInvoiceNumber(workspaceId);
  const dueDate = parsed.data.dueDate ?? defaultDueDate(parsed.data.invoiceDate);

  // Subject-Default
  const subject =
    parsed.data.subjectLine ??
    (parsed.data.kind === "schluss"
      ? `Schlussrechnung — ${project.identifier}`
      : `${parsed.data.abschlagNo ?? ""}. Abschlagsrechnung — ${project.identifier}`.trim());

  try {
    await db.insert(schema.ausgangsrechnungen).values({
      id,
      workspaceId,
      projectId: project.id,
      lvId,
      aufmassId: parsed.data.aufmassId,
      number,
      kind: parsed.data.kind,
      abschlagNo: parsed.data.kind === "abschlag" ? parsed.data.abschlagNo : null,
      invoiceDate: parsed.data.invoiceDate,
      serviceStart: parsed.data.serviceStart,
      serviceEnd: parsed.data.serviceEnd,
      dueDate,
      skontoPercent: parsed.data.skontoPercent,
      skontoDays: parsed.data.skontoDays,
      vatPercent: parsed.data.vatPercent,
      partyAg: snapshotPartyAg,
      partyAgAddress: snapshotPartyAgAddress,
      partyAn: parsed.data.partyAn ?? workspace?.name ?? null,
      partyAnAddress: parsed.data.partyAnAddress,
      partyAnTaxId: parsed.data.partyAnTaxId,
      partyAnVatId: parsed.data.partyAnVatId,
      buyerReference: parsed.data.buyerReference,
      purchaseOrderRef: parsed.data.purchaseOrderRef,
      subjectLine: subject,
      previousAbschlaegeNet: parsed.data.previousAbschlaegeNet,
      securityRetentionPercent:
        parsed.data.securityRetentionPercent ??
        project.securityRetentionPercent ??
        null,
      notes: parsed.data.notes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    if (/UNIQUE/i.test(msg)) {
      return fail("Rechnungsnummer bereits vergeben (Race-Condition).");
    }
    return fail("Ausgangsrechnung konnte nicht angelegt werden.");
  }

  // Positionen aus Aufmaß übernehmen wenn verfügbar
  if (parsed.data.aufmassId) {
    await importPositionsFromAufmass(id, parsed.data.aufmassId, workspaceId);
  }

  await recomputeArTotals(id);

  const userId = await getCurrentUserId();
  const [createdAr] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(eq(schema.ausgangsrechnungen.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "ausgangsrechnung",
    entityId: id,
    action: "create",
    after: createdAr,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/ausgangsrechnungen");
  revalidatePath(`/projekte/${project.id}`);
  revalidatePath(`/projekte/${project.id}/ausgangsrechnungen`);
  redirect(`/projekte/${project.id}/ausgangsrechnungen/${id}`);
}

export async function updateAusgangsrechnung(formData: FormData): Promise<void> {
  const parsed = ausgangsrechnungUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const ar = await loadArOrThrow(parsed.data.id);
  if (!isArEditable(ar.status)) {
    throw new Error(
      "Rechnung ist nicht mehr im Entwurf — Edits sind aus Steuerrechtsgründen gesperrt."
    );
  }

  await db
    .update(schema.ausgangsrechnungen)
    .set({
      invoiceDate: parsed.data.invoiceDate,
      serviceStart: parsed.data.serviceStart,
      serviceEnd: parsed.data.serviceEnd,
      dueDate: parsed.data.dueDate ?? defaultDueDate(parsed.data.invoiceDate),
      skontoPercent: parsed.data.skontoPercent,
      skontoDays: parsed.data.skontoDays,
      vatPercent: parsed.data.vatPercent,
      subjectLine: parsed.data.subjectLine,
      previousAbschlaegeNet: parsed.data.previousAbschlaegeNet,
      securityRetentionPercent: parsed.data.securityRetentionPercent,
      partyAg: parsed.data.partyAg,
      partyAgAddress: parsed.data.partyAgAddress,
      partyAn: parsed.data.partyAn,
      partyAnAddress: parsed.data.partyAnAddress,
      partyAnTaxId: parsed.data.partyAnTaxId,
      partyAnVatId: parsed.data.partyAnVatId,
      buyerReference: parsed.data.buyerReference,
      purchaseOrderRef: parsed.data.purchaseOrderRef,
      schlusszahlungsVorbehalt: parsed.data.schlusszahlungsVorbehalt,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.ausgangsrechnungen.id, ar.id));

  await recomputeArTotals(ar.id);

  const userId = await getCurrentUserId();
  const [afterAr] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(eq(schema.ausgangsrechnungen.id, ar.id))
    .limit(1);
  await logChange({
    workspaceId: ar.workspaceId,
    entityType: "ausgangsrechnung",
    entityId: ar.id,
    action: "update",
    before: ar,
    after: afterAr,
    ctx: await getAuditContext(userId),
  });

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen`);
  revalidatePath("/ausgangsrechnungen");
}

export async function updateArStatus(formData: FormData): Promise<void> {
  const parsed = ausgangsrechnungStatusUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) throw new Error("Ungültiger Status.");
  const ar = await loadArOrThrow(parsed.data.id);

  if (!nextAllowedArStatuses(ar.status).includes(parsed.data.status)) {
    throw new Error(
      `Übergang von "${ar.status}" nach "${parsed.data.status}" nicht erlaubt.`
    );
  }

  const now = new Date();
  const updates: Partial<typeof schema.ausgangsrechnungen.$inferInsert> = {
    status: parsed.data.status,
    updatedAt: now,
  };
  if (parsed.data.status === "versendet" && !ar.sentAt) {
    updates.sentAt = now;
  }
  await db
    .update(schema.ausgangsrechnungen)
    .set(updates)
    .where(eq(schema.ausgangsrechnungen.id, ar.id));

  // Side-Effect: Schlussrechnung versendet → lv.status = abgerechnet
  if (
    parsed.data.status === "versendet" &&
    ar.kind === "schluss" &&
    ar.lvId
  ) {
    await db
      .update(schema.lv)
      .set({ status: "abgerechnet", updatedAt: now })
      .where(eq(schema.lv.id, ar.lvId));
  }
  // Side-Effect: aufmass.status = abgerechnet wenn Aufmaß-bezogene Schlussrechnung
  if (
    parsed.data.status === "versendet" &&
    ar.kind === "schluss" &&
    ar.aufmassId
  ) {
    await db
      .update(schema.aufmass)
      .set({ status: "abgerechnet", updatedAt: now })
      .where(eq(schema.aufmass.id, ar.aufmassId));
  }

  const userId = await getCurrentUserId();
  const [afterArSt] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(eq(schema.ausgangsrechnungen.id, ar.id))
    .limit(1);
  await logChange({
    workspaceId: ar.workspaceId,
    entityType: "ausgangsrechnung",
    entityId: ar.id,
    action: "update",
    before: ar,
    after: afterArSt,
    ctx: await getAuditContext(userId),
  });

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen`);
  revalidatePath("/ausgangsrechnungen");
}

export async function markArPaid(formData: FormData): Promise<void> {
  const parsed = ausgangsrechnungMarkPaidSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) throw new Error("Ungültige Zahlungsdaten.");
  const ar = await loadArOrThrow(parsed.data.id);

  // Skonto-Auto-Abzug: Zahlung innerhalb skontoFrist gilt als „voll", auch
  // wenn der gezahlte Betrag um den Skonto-Anteil reduziert ist. Sonst
  // müsste der User selbst rechnen, ob z.B. 11078,90 (= 11305 − 226,10)
  // = "voll bezahlt" oder "teilweise" bedeutet.
  let effectiveFullThreshold = ar.payoutGross;
  if (
    isWithinSkontoFrist(
      {
        invoiceDate: ar.invoiceDate,
        skontoDays: ar.skontoDays,
        skontoPercent: ar.skontoPercent,
      },
      parsed.data.paidAt
    )
  ) {
    const abzug = computeSkontoAbzug(ar.payoutGross, ar.skontoPercent ?? 0);
    effectiveFullThreshold = ar.payoutGross - abzug;
  }

  const isFullPayment = parsed.data.paidAmount >= effectiveFullThreshold - 0.01;
  const newStatus = isFullPayment ? "bezahlt" : "teilweise_bezahlt";

  await db
    .update(schema.ausgangsrechnungen)
    .set({
      status: newStatus,
      paidAt: new Date(parsed.data.paidAt),
      paidAmount: parsed.data.paidAmount,
      updatedAt: new Date(),
    })
    .where(eq(schema.ausgangsrechnungen.id, ar.id));

  const userId = await getCurrentUserId();
  const [afterPaid] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(eq(schema.ausgangsrechnungen.id, ar.id))
    .limit(1);
  await logChange({
    workspaceId: ar.workspaceId,
    entityType: "ausgangsrechnung",
    entityId: ar.id,
    action: "update",
    before: ar,
    after: afterPaid,
    ctx: await getAuditContext(userId),
  });

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen`);
  revalidatePath("/ausgangsrechnungen");
}

export async function deleteAusgangsrechnung(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Rechnungs-ID fehlt.");
  const ar = await loadArOrThrow(parsed.data.id);
  if (!isArEditable(ar.status)) {
    throw new Error(
      "Rechnung ist nicht mehr im Entwurf — Löschen aus Steuerrechtsgründen gesperrt."
    );
  }
  await db
    .delete(schema.ausgangsrechnungen)
    .where(eq(schema.ausgangsrechnungen.id, ar.id));
  const userId = await getCurrentUserId();
  await logChange({
    workspaceId: ar.workspaceId,
    entityType: "ausgangsrechnung",
    entityId: ar.id,
    action: "delete",
    before: ar,
    ctx: await getAuditContext(userId),
  });
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen`);
  revalidatePath("/ausgangsrechnungen");
  redirect(`/projekte/${ar.projectId}/ausgangsrechnungen`);
}

/* ============== POSITIONEN ============== */

/**
 * Void-Wrapper für direkte Form-Submission ohne useActionState (z. B. in
 * Server-Component-Edit-Seite). Wirft bei Fehler als Server-Error.
 */
export async function addArPositionVoid(formData: FormData): Promise<void> {
  const r = await addArPosition(null, formData);
  if (!r.ok) {
    const fieldMsg = Object.values(r.fieldErrors ?? {})
      .flat()
      .join(" · ");
    throw new Error(
      r.formError ?? fieldMsg ?? "Position konnte nicht gespeichert werden."
    );
  }
}

export async function addArPosition(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = arPositionAddSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const workspaceId = await getCurrentWorkspaceId();
  const ar = await loadArOrThrow(parsed.data.ausgangsrechnungId);
  if (!isArEditable(ar.status)) {
    return fail("Rechnung ist nicht mehr im Entwurf — Positionen-Edits gesperrt.");
  }

  const totalPrice =
    parsed.data.quantity !== null && parsed.data.unitPrice !== null
      ? Math.round(parsed.data.quantity * parsed.data.unitPrice * 100) / 100
      : null;

  const allRows = await db
    .select({ sortIndex: schema.ausgangsrechnungPositionen.sortIndex })
    .from(schema.ausgangsrechnungPositionen)
    .where(
      and(
        eq(schema.ausgangsrechnungPositionen.workspaceId, workspaceId),
        eq(schema.ausgangsrechnungPositionen.ausgangsrechnungId, ar.id)
      )
    );
  const nextSort =
    allRows.length > 0 ? Math.max(...allRows.map((s) => s.sortIndex)) + 1 : 0;

  const id = genId("arp");
  await db.insert(schema.ausgangsrechnungPositionen).values({
    id,
    workspaceId,
    ausgangsrechnungId: ar.id,
    oz: parsed.data.oz,
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    unitPrice: parsed.data.unitPrice,
    totalPrice,
    vatPercent: parsed.data.vatPercent,
    sortIndex: nextSort,
  });

  await recomputeArTotals(ar.id);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
  return { ok: true, data: { id } };
}

export async function updateArPosition(formData: FormData): Promise<void> {
  const parsed = arPositionUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  const [pos] = await db
    .select()
    .from(schema.ausgangsrechnungPositionen)
    .where(
      and(
        eq(schema.ausgangsrechnungPositionen.id, parsed.data.id),
        eq(schema.ausgangsrechnungPositionen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!pos) throw new Error("Position nicht gefunden.");
  const ar = await loadArOrThrow(pos.ausgangsrechnungId);
  if (!isArEditable(ar.status)) {
    throw new Error("Rechnung nicht mehr im Entwurf.");
  }

  const totalPrice =
    parsed.data.quantity !== null && parsed.data.unitPrice !== null
      ? Math.round(parsed.data.quantity * parsed.data.unitPrice * 100) / 100
      : null;

  await db
    .update(schema.ausgangsrechnungPositionen)
    .set({
      oz: parsed.data.oz,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPrice: parsed.data.unitPrice,
      totalPrice,
      vatPercent: parsed.data.vatPercent,
      updatedAt: new Date(),
    })
    .where(eq(schema.ausgangsrechnungPositionen.id, pos.id));

  await recomputeArTotals(ar.id);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}

export async function deleteArPosition(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Position-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const [pos] = await db
    .select({
      ausgangsrechnungId: schema.ausgangsrechnungPositionen.ausgangsrechnungId,
    })
    .from(schema.ausgangsrechnungPositionen)
    .where(
      and(
        eq(schema.ausgangsrechnungPositionen.id, parsed.data.id),
        eq(schema.ausgangsrechnungPositionen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!pos) return;
  const ar = await loadArOrThrow(pos.ausgangsrechnungId);
  if (!isArEditable(ar.status)) {
    throw new Error("Rechnung nicht mehr im Entwurf.");
  }
  await db
    .delete(schema.ausgangsrechnungPositionen)
    .where(eq(schema.ausgangsrechnungPositionen.id, parsed.data.id));
  await recomputeArTotals(ar.id);
  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}

/* ============== XRECHNUNG-EXPORT ============== */

/**
 * Generiert die XRechnung-XML zur AR und speichert sie im Storage. Ersetzt
 * eine bestehende XRechnung-Datei (Re-Generation erlaubt). Validiert vorab
 * die EN-16931-Pflichtfelder — bei fehlenden Werten klare Fehlermeldung.
 */
export async function generateXRechnung(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Rechnungs-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const ar = await loadArOrThrow(parsed.data.id);

  const project = await getProjectById(ar.projectId);
  if (!project) throw new Error("Projekt nicht gefunden.");
  const positionen = await getArPositionen(ar.id);

  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error("Workspace nicht gefunden.");

  const validation = validateForXrechnung({
    ar,
    positionen,
    project,
    workspace,
  });
  if (!validation.ok) {
    throw new Error(
      `XRechnung-Pflichtfelder fehlen: ${validation.missing.join(" · ")}`
    );
  }

  const xml = generateXrechnungXml({ ar, positionen, project, workspace });
  const stored = await saveUpload({
    bucket: "ausgangsrechnungen",
    workspaceId,
    entityId: ar.id,
    fileName: `xrechnung_${ar.number}.xml`,
    data: new TextEncoder().encode(xml),
  });

  await db
    .update(schema.ausgangsrechnungen)
    .set({
      xrechnungXmlPath: stored.storagePath,
      xrechnungGeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.ausgangsrechnungen.id, ar.id));

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}

/**
 * Erzeugt eine ZUGFeRD-2.3-PDF/A-3 (XRechnung-Profil): hybrides PDF mit
 * Layout + eingebetteter XRechnung-XML. Nutzt die identische XML wie M10.
 */
export async function generateZugferd(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Rechnungs-ID fehlt.");
  const workspaceId = await getCurrentWorkspaceId();
  const ar = await loadArOrThrow(parsed.data.id);

  const project = await getProjectById(ar.projectId);
  if (!project) throw new Error("Projekt nicht gefunden.");
  const positionen = await getArPositionen(ar.id);

  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error("Workspace nicht gefunden.");

  const ctx = { ar, positionen, project, workspace };
  const validation = validateForXrechnung(ctx);
  if (!validation.ok) {
    throw new Error(
      `XRechnung-Pflichtfelder fehlen: ${validation.missing.join(" · ")}`
    );
  }

  const xml = generateXrechnungXml(ctx);
  const pdfBytes = await generateZugferdPdf(ctx, xml);

  const stored = await saveUpload({
    bucket: "ausgangsrechnungen",
    workspaceId,
    entityId: ar.id,
    fileName: `zugferd_${ar.number}.pdf`,
    data: pdfBytes,
  });

  await db
    .update(schema.ausgangsrechnungen)
    .set({
      zugferdPdfPath: stored.storagePath,
      zugferdGeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.ausgangsrechnungen.id, ar.id));

  revalidatePath(`/projekte/${ar.projectId}/ausgangsrechnungen/${ar.id}`);
}

/* ============== HOAI-SCHLUSSRECHNUNG (Sprint 4 Pivot) ============== */

import { calculate } from "@/lib/hoai/calculator";
import { LP_LABEL } from "@/lib/hoai/leistungsphasen";
import { buildHoaiBreakdown } from "@/lib/hoai/schlussrechnung";
import type {
  HoaiHonorarzone,
  HoaiLeistungsbild,
  HoaiSatz,
} from "@/db/schema";
import type { Leistungsphase } from "@/lib/hoai/types";

/**
 * Erzeugt eine HOAI-Schlussrechnung für ein Projekt mit konfigurierter HOAI:
 *   - Liest alle vorigen ARs des Projekts (status != entwurf), aggregiert
 *     deren Positionen pro lpReferenz → "vorher pro LP"
 *   - Berechnet Soll-Honorar pro LP via HOAI-Calculator
 *   - Erzeugt neue AR mit kind=schluss, status=entwurf
 *   - Eine Position pro LP mit Restbetrag
 *   - Speichert hoaiBreakdownJson als Snapshot
 *
 * Liefert die ID der neuen AR oder einen Fehler.
 */
export async function createHoaiSchlussrechnung(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const projectId = String(formData.get("projektId") ?? "");
  if (!projectId) return fail("Projekt-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return fail("Projekt nicht gefunden.");

  // HOAI-Konfig prüfen
  if (
    !project.hoaiLeistungsbild ||
    !project.hoaiHonorarzone ||
    !project.hoaiAnrechenbareKostenCents ||
    !project.hoaiBeauftragteLpsJson
  ) {
    return fail(
      "HOAI-Konfiguration fehlt. Bitte erst unter /projekte/[id]/hoai einrichten."
    );
  }

  let beauftragteLps: Leistungsphase[];
  try {
    const parsed = JSON.parse(project.hoaiBeauftragteLpsJson);
    if (!Array.isArray(parsed))
      return fail("HOAI-LP-Liste am Projekt ist kaputt.");
    beauftragteLps = parsed.filter(
      (n) => typeof n === "number" && n >= 1 && n <= 9
    ) as Leistungsphase[];
  } catch {
    return fail("HOAI-LP-Liste am Projekt ist kaputt (JSON-Fehler).");
  }
  if (beauftragteLps.length === 0) {
    return fail("Keine Leistungsphasen am Projekt beauftragt.");
  }

  // Soll-Honorar pro LP berechnen
  const calc = calculate({
    leistungsbild: project.hoaiLeistungsbild as HoaiLeistungsbild,
    zone: project.hoaiHonorarzone as HoaiHonorarzone,
    satz: (project.hoaiSatz ?? "mittel") as HoaiSatz,
    anrechenbareKostenCents: project.hoaiAnrechenbareKostenCents,
    beauftragteLps,
    umbauZuschlagPct: project.hoaiUmbauZuschlagPct ?? 0,
    nebenkostenPauschalePct: project.hoaiNebenkostenPct ?? 0,
  });
  if (!calc.ok) {
    return fail(`HOAI-Berechnung fehlgeschlagen: ${calc.error.kind}`);
  }
  const sollPerLp = calc.result.lpAufsplittCents;

  // Bisherige AR-Positionen mit lpReferenz aggregieren (über ALLE Status
  // außer "entwurf" — Entwurf ist noch nicht versendet)
  const prevPositions = await db
    .select({
      lpReferenz: schema.ausgangsrechnungPositionen.lpReferenz,
      totalPrice: schema.ausgangsrechnungPositionen.totalPrice,
      status: schema.ausgangsrechnungen.status,
    })
    .from(schema.ausgangsrechnungPositionen)
    .innerJoin(
      schema.ausgangsrechnungen,
      eq(
        schema.ausgangsrechnungen.id,
        schema.ausgangsrechnungPositionen.ausgangsrechnungId
      )
    )
    .where(
      and(
        eq(schema.ausgangsrechnungen.workspaceId, workspaceId),
        eq(schema.ausgangsrechnungen.projectId, projectId)
      )
    );

  const vorherPerLp: Partial<Record<Leistungsphase, number>> = {};
  for (const p of prevPositions) {
    if (p.status === "entwurf") continue;
    if (p.lpReferenz === null || p.totalPrice === null) continue;
    const lp = p.lpReferenz as Leistungsphase;
    vorherPerLp[lp] = (vorherPerLp[lp] ?? 0) + Math.round(p.totalPrice * 100);
  }

  const breakdown = buildHoaiBreakdown(sollPerLp, vorherPerLp);

  // Workspace-Snapshot
  const [workspace] = await db
    .select({ name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  const id = genId("ar");
  const number = await nextInvoiceNumber(workspaceId);
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = defaultDueDate(today);
  const summeNetto = breakdown.jetztSummeCents / 100;
  const vatPct = 19;
  const vat = Math.round(summeNetto * vatPct) / 100;
  const brutto = summeNetto + vat;

  await db.insert(schema.ausgangsrechnungen).values({
    id,
    workspaceId,
    projectId: project.id,
    lvId: null,
    aufmassId: null,
    number,
    kind: "schluss",
    abschlagNo: null,
    invoiceDate: today,
    dueDate,
    vatPercent: vatPct,
    partyAg: project.ag,
    partyAgAddress: project.siteAddress,
    partyAn: workspace?.name ?? null,
    subjectLine: `HOAI-Schlussrechnung — ${project.identifier}`,
    previousAbschlaegeNet: breakdown.vorherSummeCents / 100,
    securityRetentionPercent: null,
    securityRetentionAmount: 0,
    totalPositionsNet: summeNetto,
    payoutNet: summeNetto,
    payoutVat: vat,
    payoutGross: brutto,
    status: "entwurf",
    hoaiBreakdownJson: JSON.stringify(breakdown.rows),
  });

  // Eine Position pro LP mit jetztCents > 0
  const positionRows = breakdown.rows.filter((r) => r.jetztCents > 0);
  if (positionRows.length > 0) {
    await db.insert(schema.ausgangsrechnungPositionen).values(
      positionRows.map((r, idx) => ({
        id: genId("arp"),
        workspaceId,
        ausgangsrechnungId: id,
        lvItemId: null,
        aufmassZeileId: null,
        oz: `LP${r.lp}`,
        description: `${LP_LABEL[r.lp]} — Anteil ${(r.jetztPct * 100 - r.vorherPct * 100).toFixed(0)} % (vorher ${(r.vorherPct * 100).toFixed(0)} %, jetzt ${(r.jetztPct * 100).toFixed(0)} %)`,
        quantity: 1,
        unit: "psch",
        unitPrice: r.jetztCents / 100,
        totalPrice: r.jetztCents / 100,
        vatPercent: vatPct,
        sortIndex: idx,
        lpReferenz: r.lp,
      }))
    );
  }

  revalidatePath(`/projekte/${projectId}/ausgangsrechnungen`);
  revalidatePath(`/projekte/${projectId}/ausgangsrechnungen/${id}`);
  return { ok: true, data: { id } };
}
