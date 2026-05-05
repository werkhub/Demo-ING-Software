"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  certificateInputSchema,
  certificateRequestSchema,
  certificateUpdateSchema,
  formDataToObject,
  idOnlySchema,
  paymentReleaseToggleSchema,
} from "@/lib/validation/schemas";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { validateUploadFile } from "@/lib/storage/validation";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import {
  CERTIFICATE_LABELS,
  CERTIFICATE_LEGAL_BASIS,
  computeComplianceStatus,
} from "@/lib/compliance/nu";
import {
  getCertificatesBySubcontractor,
  getSubcontractor,
} from "@/db/queries";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Wertet die Compliance nach jeder Mutation neu aus und stößt — wenn der
 * Status auf „critical" gewechselt hat — einen Auto-Vorgang an + sperrt die
 * Zahlungsfreigabe. Beim Wechsel zurück auf ok/warning wird die Sperre nicht
 * automatisch gelöst (manueller Toggle, weil die Entscheidung „freigeben" eine
 * bewusste sein soll).
 */
async function reconcileCompliance(subcontractorId: string): Promise<void> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const nu = await getSubcontractor(subcontractorId);
  if (!nu) return;
  const certs = await getCertificatesBySubcontractor(subcontractorId);
  const status = computeComplianceStatus(nu, certs);

  if (status.level === "critical" && !nu.paymentReleaseBlocked) {
    await db
      .update(schema.subcontractors)
      .set({ paymentReleaseBlocked: true, updatedAt: new Date() })
      .where(eq(schema.subcontractors.id, subcontractorId));

    const missingLabels = status.missing
      .map((k) => CERTIFICATE_LABELS[k])
      .join(", ");
    const expiredLabels = status.expired
      .map((e) => CERTIFICATE_LABELS[e.kind])
      .join(", ");
    const summary = [
      missingLabels ? `Fehlt: ${missingLabels}` : null,
      expiredLabels ? `Abgelaufen: ${expiredLabels}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "nu_compliance",
      title: `Compliance-Lücke ${nu.gewerk}: ${nu.name}`,
      category: "vertragspflicht",
      projectId: nu.projectId,
      // 7 Tage Vorlauf zur Klärung — Risiko § 14 AEntG / § 13 MiLoG ist akut
      dueDate: isoDateInDays(7),
      firstStep: {
        kind: "klassifikation",
        payload: {
          subcontractorId: nu.id,
          subcontractorName: nu.name,
          gewerk: nu.gewerk,
          missing: status.missing,
          expired: status.expired.map((e) => ({
            kind: e.kind,
            certId: e.cert.id,
            validUntil: e.cert.validUntil,
          })),
          summary,
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "§ 14 AEntG",
            sourceText:
              "Generalunternehmer-Haftung Mindestlohn — bei fehlender Bescheinigung haftet der AN für Lohnzahlungen des NU.",
          },
          {
            sourceKind: "intern",
            sourceRef: "§ 48b EStG",
            sourceText:
              "Ohne Freistellungsbescheinigung muss der AN 15 % Bauabzugsteuer einbehalten und abführen.",
          },
        ],
      },
      auditPayload: {
        subcontractorId: nu.id,
        missing: status.missing,
        expiredKinds: status.expired.map((e) => e.kind),
      },
    });

    revalidatePath("/vorgaenge");
  }
}

export async function addCertificate(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const file = formData.get("file");
  const fields = formDataToObject(formData);
  const parsed = certificateInputSchema.safeParse(fields);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const nu = await getSubcontractor(parsed.data.subcontractorId);
  if (!nu) return fail("NU nicht gefunden.");

  const id = genId("cert");
  let documentPath: string | null = null;
  let documentFilename: string | null = null;

  if (file instanceof File && file.size > 0) {
    const validation = validateUploadFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.ok) return fail(validation.reason);
    const buf = new Uint8Array(await file.arrayBuffer());
    const stored = await saveUpload({
      bucket: "nu_certificates",
      workspaceId,
      entityId: nu.id,
      fileName: `${id}_${file.name}`,
      data: buf,
    });
    documentPath = stored.storagePath;
    documentFilename = file.name;
  }

  try {
    await db.insert(schema.subcontractorCertificates).values({
      id,
      workspaceId,
      subcontractorId: nu.id,
      kind: parsed.data.kind,
      issuer: parsed.data.issuer,
      issuedAt: parsed.data.issuedAt,
      validUntil: parsed.data.validUntil,
      status: parsed.data.status,
      notes: parsed.data.notes,
      documentPath,
      documentFilename,
    });
  } catch {
    if (documentPath) await deleteUpload(documentPath);
    return fail("Bescheinigung konnte nicht gespeichert werden.");
  }

  await reconcileCompliance(nu.id);

  revalidatePath(`/nu/${nu.id}`);
  revalidatePath("/nu");
  revalidatePath(`/projekte/${nu.projectId}`);
  return ok({ id });
}

export async function updateCertificate(formData: FormData): Promise<void> {
  const parsed = certificateUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.subcontractorCertificates)
    .where(
      and(
        eq(schema.subcontractorCertificates.id, parsed.data.id),
        eq(schema.subcontractorCertificates.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Bescheinigung nicht gefunden.");

  await db
    .update(schema.subcontractorCertificates)
    .set({
      kind: parsed.data.kind,
      issuer: parsed.data.issuer,
      issuedAt: parsed.data.issuedAt,
      validUntil: parsed.data.validUntil,
      status: parsed.data.status,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.subcontractorCertificates.id, parsed.data.id));

  await reconcileCompliance(existing.subcontractorId);

  revalidatePath(`/nu/${existing.subcontractorId}`);
  revalidatePath("/nu");
}

export async function deleteCertificate(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Bescheinigungs-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.subcontractorCertificates)
    .where(
      and(
        eq(schema.subcontractorCertificates.id, parsed.data.id),
        eq(schema.subcontractorCertificates.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  if (existing.documentPath) {
    await deleteUpload(existing.documentPath);
  }

  await db
    .delete(schema.subcontractorCertificates)
    .where(eq(schema.subcontractorCertificates.id, parsed.data.id));

  await reconcileCompliance(existing.subcontractorId);

  revalidatePath(`/nu/${existing.subcontractorId}`);
  revalidatePath("/nu");
}

/**
 * Markiert eine Bescheinigung als „angefordert" — ohne Daten, nur als Tracker.
 * Erzeugt einen Platzhalter-Eintrag mit validUntil = heute (sofort als
 * „abgelaufen" sichtbar), Status „angefordert". Beim Eingang aktualisiert der
 * User Daten + Datei.
 */
export async function requestCertificate(formData: FormData): Promise<void> {
  const parsed = certificateRequestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Anforderung.");

  const workspaceId = await getCurrentWorkspaceId();
  const nu = await getSubcontractor(parsed.data.subcontractorId);
  if (!nu) throw new Error("NU nicht gefunden.");

  const id = genId("cert");
  await db.insert(schema.subcontractorCertificates).values({
    id,
    workspaceId,
    subcontractorId: nu.id,
    kind: parsed.data.kind,
    validUntil: new Date().toISOString().slice(0, 10),
    status: "angefordert",
    notes: `Angefordert am ${new Date().toLocaleDateString("de-DE")} — ${CERTIFICATE_LEGAL_BASIS[parsed.data.kind]}`,
  });

  revalidatePath(`/nu/${nu.id}`);
}

export async function togglePaymentRelease(formData: FormData): Promise<void> {
  const parsed = paymentReleaseToggleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Toggle-Wert.");

  const workspaceId = await getCurrentWorkspaceId();
  const [nu] = await db
    .select({ id: schema.subcontractors.id, projectId: schema.subcontractors.projectId })
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, parsed.data.id),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!nu) throw new Error("NU nicht gefunden.");

  await db
    .update(schema.subcontractors)
    .set({ paymentReleaseBlocked: parsed.data.blocked, updatedAt: new Date() })
    .where(eq(schema.subcontractors.id, parsed.data.id));

  revalidatePath(`/nu/${nu.id}`);
  revalidatePath("/nu");
  revalidatePath(`/projekte/${nu.projectId}`);
}
