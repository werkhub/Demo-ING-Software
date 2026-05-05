"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { parseErechnungXml } from "@/lib/erechnung/parser";
import { validate } from "@/lib/erechnung/validator";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

const MAX_XML_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadErechnungXml(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const file = formData.get("xmlFile");
  if (!(file instanceof File)) {
    return fail("Keine Datei hochgeladen.");
  }
  if (file.size === 0) return fail("Datei ist leer.");
  if (file.size > MAX_XML_SIZE) return fail("Datei zu groß (max. 5 MB).");

  let xmlText: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    // BOM tolerant
    xmlText = buf.toString("utf8").replace(/^﻿/, "");
  } catch (e) {
    return fail(`Datei konnte nicht gelesen werden: ${e instanceof Error ? e.message : String(e)}`);
  }

  let parsed: ReturnType<typeof parseErechnungXml>;
  try {
    parsed = parseErechnungXml(xmlText);
  } catch (e) {
    return fail(`XML-Parser-Fehler: ${e instanceof Error ? e.message : String(e)}`);
  }
  const validation = validate(parsed);

  // Insert in rechnungen-Tabelle
  const id = genId("er");
  await db.insert(schema.rechnungen).values({
    id,
    workspaceId,
    supplierName: parsed.lieferantName ?? "Unbekannt (XML-Import)",
    invoiceDate: parsed.rechnungsdatum,
    dueDate: parsed.faelligkeit,
    totalNet: parsed.gesamtNettoCents > 0 ? parsed.gesamtNettoCents / 100 : null,
    totalGross: parsed.bruttoSummeCents > 0 ? parsed.bruttoSummeCents / 100 : null,
    xmlFilename: file.name,
    xmlFormat: parsed.format,
    xmlValidationStatus: validation.status,
    xmlValidationErrorsJson: JSON.stringify({
      errors: validation.errors,
      warnings: validation.warnings,
    }),
    xmlExtractedJson: JSON.stringify(parsed),
    bg25LieferantName: parsed.lieferantName,
    bg25LieferantUstId: parsed.lieferantUstId,
    bt2Rechnungsdatum: parsed.rechnungsdatum,
    bt5Waehrung: parsed.waehrung ?? "EUR",
  });

  // Auto-Vorgang bei invalid oder warnings (Buchhaltung soll prüfen)
  if (validation.status !== "valid") {
    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "rechnung_anomalie",
      title: `E-Rechnung-Eingang: ${parsed.lieferantName ?? "Unbekannt"} ${parsed.rechnungsnr ?? ""} — ${validation.status}`,
      category: "vertragspflicht",
      projectId: null,
      dueDate: null,
      firstStep: {
        kind: "klassifikation",
        payload: {
          rechnungId: id,
          format: parsed.format,
          validationStatus: validation.status,
          errors: validation.errors,
          warnings: validation.warnings,
          rechnungsnr: parsed.rechnungsnr,
          lieferantName: parsed.lieferantName,
          bruttoSummeCents: parsed.bruttoSummeCents,
          triggeredBy: "erechnung_upload",
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "EN 16931 / XRechnung 3.0",
            sourceText:
              "Pflichtangaben einer E-Rechnung — fehlende oder unplausible Felder müssen vor Zahlung geklärt werden.",
          },
        ],
      },
      auditPayload: {
        rechnungId: id,
        validationStatus: validation.status,
      },
    });
  }

  revalidatePath("/eingangsrechnungen");
  return ok({ id });
}

export async function uploadErechnungXmlRedirect(formData: FormData): Promise<void> {
  const result = await uploadErechnungXml(null, formData);
  if (!result.ok) {
    redirect(
      `/eingangsrechnungen/upload?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/rechnungen/${result.data.id}`);
}

export async function deleteErechnung(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("ID fehlt.");
  await db
    .delete(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.id, id),
        eq(schema.rechnungen.workspaceId, workspaceId)
      )
    );
  revalidatePath("/eingangsrechnungen");
  return ok(undefined);
}
