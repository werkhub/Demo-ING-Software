"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  exportPersonalData,
  exportPersonalDataPdf,
  loeschPersonalData,
  type DsgvoBucket,
  type DsgvoExportBundle,
} from "@/lib/dsgvo/auskunft";
import { getAuditContext } from "@/lib/audit/log";
import {
  auskunftSchema,
  loeschenSchema,
} from "@/lib/validation/dsgvo";

function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "except") {
      const all = formData.getAll(k).map((x) => String(x));
      out[k] = all;
    } else {
      out[k] = typeof v === "string" ? v : v;
    }
  }
  return out;
}

async function requireWorkspaceAdmin(): Promise<{
  workspaceId: string;
  userId: string;
}> {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const [user] = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user || user.role !== "admin") {
    throw new Error(
      "Nur Workspace-Administrator:innen dürfen DSGVO-Anfragen bearbeiten."
    );
  }
  return { workspaceId, userId };
}

/**
 * Liefert das JSON-Bundle als ActionResult — die Page rendert es als
 * Preview. PDF-Download läuft separat über `/datenschutz/auskunft/pdf`.
 */
export async function runAuskunftAction(
  _prev: ActionResult<DsgvoExportBundle> | null,
  formData: FormData
): Promise<ActionResult<DsgvoExportBundle>> {
  const parsed = auskunftSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const { workspaceId } = await requireWorkspaceAdmin();
  try {
    const bundle = await exportPersonalData(
      workspaceId,
      parsed.data.identifier
    );
    return ok(bundle);
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Unbekannter Fehler bei der Auskunft."
    );
  }
}

/**
 * Erzeugt PDF und gibt es als data URL zurück, damit das Frontend einen
 * direkten Download anbieten kann ohne weitere Route. Bei großen Bundles
 * wäre eine Stream-Route besser; der DSGVO-Anwendungsfall ist klein genug.
 */
export async function runAuskunftPdfAction(
  _prev: ActionResult<{ filename: string; dataUrl: string }> | null,
  formData: FormData
): Promise<ActionResult<{ filename: string; dataUrl: string }>> {
  const parsed = auskunftSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const { workspaceId } = await requireWorkspaceAdmin();
  try {
    const bytes = await exportPersonalDataPdf(
      workspaceId,
      parsed.data.identifier
    );
    const b64 = Buffer.from(bytes).toString("base64");
    const safeId = parsed.data.identifier.replace(/[^a-z0-9._@-]/gi, "_");
    const filename = `dsgvo-auskunft-${safeId}.pdf`;
    return ok({
      filename,
      dataUrl: `data:application/pdf;base64,${b64}`,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "PDF-Export fehlgeschlagen."
    );
  }
}

export async function runLoeschenAction(
  _prev: ActionResult<{
    buckets: Array<{ bucket: DsgvoBucket; affected: number }>;
  }> | null,
  formData: FormData
): Promise<
  ActionResult<{ buckets: Array<{ bucket: DsgvoBucket; affected: number }> }>
> {
  const parsed = loeschenSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  const { workspaceId, userId } = await requireWorkspaceAdmin();
  const ctx = await getAuditContext(userId);
  try {
    const result = await loeschPersonalData({
      workspaceId,
      identifier: parsed.data.identifier,
      reason: parsed.data.reason,
      except: (parsed.data.except as DsgvoBucket[] | undefined) ?? [],
      ctx,
    });
    revalidatePath("/datenschutz/loeschen");
    revalidatePath("/audit");
    return ok(result);
  } catch (e) {
    return fail(
      e instanceof Error
        ? e.message
        : "Anonymisierung fehlgeschlagen."
    );
  }
}
