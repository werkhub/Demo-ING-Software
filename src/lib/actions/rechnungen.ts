"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import {
  formDataToObject,
  rechnungIdSchema,
  rechnungInputSchema,
  rechnungPositionSchema,
  rechnungStatusUpdateSchema,
} from "@/lib/validation/schemas";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { validateUploadFile } from "@/lib/storage/validation";
import { analyzeRechnung } from "@/lib/rechnungen/anomalie-engine";
import { computeVorgangRiskScore } from "@/lib/vorgang";
import { cleanupLinksToTarget } from "@/lib/vorgang/link-cleanup";
import { findOpenVorgangByLink } from "@/lib/vorgang/create-from-trigger";

async function ensureRechnung(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.id, id),
        eq(schema.rechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Rechnung nicht gefunden.");
  return row;
}

export async function createRechnungWithUpload(formData: FormData): Promise<void> {
  const file = formData.get("file");
  const fields = formDataToObject(formData);
  const parsed = rechnungInputSchema.safeParse(fields);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") || "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const rechnungId = genId("rg");

  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const validation = validateUploadFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.ok) throw new Error(validation.reason);
    const buf = new Uint8Array(await file.arrayBuffer());
    const stored = await saveUpload({
      bucket: "rechnungen",
      workspaceId,
      entityId: rechnungId,
      fileName: file.name,
      data: buf,
    });
    storagePath = stored.storagePath;
  }

  await db.insert(schema.rechnungen).values({
    id: rechnungId,
    workspaceId,
    projectId: parsed.data.projectId,
    supplierName: parsed.data.supplierName,
    invoiceDate: parsed.data.invoiceDate,
    dueDate: parsed.data.dueDate,
    totalNet: parsed.data.totalNet,
    totalGross: parsed.data.totalGross,
    currency: parsed.data.currency ?? "EUR",
    status: "eingegangen",
    uploadedBy: userId,
    sourceFilePath: storagePath,
  });

  revalidatePath("/rechnungen");
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect(`/rechnungen/${rechnungId}`);
}

export async function updateRechnungStatus(formData: FormData): Promise<void> {
  const parsed = rechnungStatusUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Status-Wechsel.");
  await ensureRechnung(parsed.data.id);
  await db
    .update(schema.rechnungen)
    .set({ status: parsed.data.status })
    .where(eq(schema.rechnungen.id, parsed.data.id));
  revalidatePath(`/rechnungen/${parsed.data.id}`);
  revalidatePath("/rechnungen");
}

export async function deleteRechnung(formData: FormData): Promise<void> {
  const parsed = rechnungIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Rechnungs-ID.");
  const r = await ensureRechnung(parsed.data.id);
  await db.delete(schema.rechnungen).where(eq(schema.rechnungen.id, r.id));
  if (r.sourceFilePath) await deleteUpload(r.sourceFilePath);
  // Eingehende Vorgang-Verknüpfungen aufräumen (G).
  await cleanupLinksToTarget({ targetKind: "rechnung", targetId: r.id });
  revalidatePath("/rechnungen");
  redirect("/rechnungen");
}

export async function addRechnungPosition(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = rechnungPositionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  await ensureRechnung(parsed.data.rechnungId);
  const id = genId("rp");
  try {
    await db.insert(schema.rechnungPositionen).values({
      id,
      rechnungId: parsed.data.rechnungId,
      positionIndex: parsed.data.positionIndex,
      lvPosition: parsed.data.lvPosition,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPrice: parsed.data.unitPrice,
      totalPrice: parsed.data.totalPrice,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannt";
    if (/UNIQUE/i.test(msg)) {
      return fail("Position-Index existiert bereits — bitte fortlaufend wählen.");
    }
    return fail(`Position konnte nicht angelegt werden: ${msg}`);
  }
  revalidatePath(`/rechnungen/${parsed.data.rechnungId}`);
  return ok({ id });
}

export async function deleteRechnungPosition(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Position-ID fehlt.");
  const [pos] = await db
    .select()
    .from(schema.rechnungPositionen)
    .where(eq(schema.rechnungPositionen.id, id))
    .limit(1);
  if (!pos) return;
  await ensureRechnung(pos.rechnungId);
  await db
    .delete(schema.rechnungPositionen)
    .where(eq(schema.rechnungPositionen.id, id));
  revalidatePath(`/rechnungen/${pos.rechnungId}`);
}

export async function runAnomalieEngine(formData: FormData): Promise<void> {
  const parsed = rechnungIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Rechnungs-ID.");
  await ensureRechnung(parsed.data.id);
  await analyzeRechnung(parsed.data.id);
  revalidatePath(`/rechnungen/${parsed.data.id}`);
  revalidatePath("/rechnungen");
}

/**
 * Aus einer Rechnung einen Vorgang Kategorie "vertragspflicht" erzeugen
 * und beidseitig verknüpfen. Realisiert RechnungVorgangLink-Aktion (UC5 → UC1).
 */
export async function escalateRechnungToVorgang(formData: FormData): Promise<void> {
  const parsed = rechnungIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Rechnungs-ID.");
  const r = await ensureRechnung(parsed.data.id);

  // Idempotenz: schon ein offener Vorgang zu dieser Rechnung? Dorthin umleiten.
  const existing = await findOpenVorgangByLink({
    workspaceId: r.workspaceId,
    targetKind: "rechnung",
    targetId: r.id,
  });
  if (existing) {
    revalidatePath(`/rechnungen/${r.id}`);
    redirect(`/vorgaenge/${existing}`);
  }

  const userId = await getCurrentUserId();
  const vorgangId = genId("vg");
  const title = `Anomalie-Eskalation · ${r.supplierName}${r.invoiceDate ? ` · ${r.invoiceDate}` : ""}`;
  await db.insert(schema.vorgaenge).values({
    id: vorgangId,
    workspaceId: r.workspaceId,
    projectId: r.projectId,
    title,
    category: "vertragspflicht",
    status: "offen",
    riskScore: computeVorgangRiskScore({
      category: "vertragspflicht",
      status: "offen",
      dueDate: null,
      documentCount: r.sourceFilePath ? 1 : 0,
    }),
    createdBy: userId,
  });
  await db.insert(schema.vorgangLinks).values({
    id: genId("vl"),
    vorgangId,
    targetKind: "rechnung",
    targetId: r.id,
  });
  await db.insert(schema.vorgangAuditLog).values({
    id: genId("au"),
    vorgangId,
    actorId: userId,
    action: "created",
    payloadJson: JSON.stringify({ title, source: "rechnung_escalation", rechnungId: r.id }),
  });
  revalidatePath("/vorgaenge");
  revalidatePath(`/rechnungen/${r.id}`);
  redirect(`/vorgaenge/${vorgangId}`);
}

/**
 * Markiert den Bauabzug einer NU-Eingangsrechnung als ans Finanzamt abgeführt.
 * Setzt das Datum aus dem Formular (oder „heute") in `bauabzugAnFinanzamtAbgefuehrtAm`.
 * Die eigentliche Anmeldung erfolgt extern (DATEV-Lohn / ELSTER-BUSt) — diese
 * Action dokumentiert den Status in LexBau.
 */
export async function registerBauabzugAbfuehrung(
  formData: FormData
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Rechnungs-ID fehlt.");
  const r = await ensureRechnung(id);
  if ((r.bauabzugEinbehaltCents ?? 0) <= 0) {
    throw new Error("Diese Rechnung hat keinen offenen Bauabzug-Einbehalt.");
  }
  const dateRaw = String(formData.get("abgefuehrtAm") ?? "").trim();
  const date =
    dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw
      : new Date().toISOString().slice(0, 10);
  await db
    .update(schema.rechnungen)
    .set({ bauabzugAnFinanzamtAbgefuehrtAm: date })
    .where(eq(schema.rechnungen.id, r.id));
  revalidatePath(`/rechnungen/${r.id}`);
}
