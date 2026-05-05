"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  idOnlySchema,
  securityInputSchema,
  securityStatusUpdateSchema,
  securityUpdateSchema,
} from "@/lib/validation/schemas";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { validateUploadFile } from "@/lib/storage/validation";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import { getAuditContext, logChange } from "@/lib/audit/log";
import {
  SECURITY_LABELS,
  SECURITY_LEGAL_BASIS,
  effectiveValidUntil,
  securityState,
} from "@/lib/sicherheiten";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadProject(workspaceId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row;
}

/**
 * Wertet eine Sicherheit nach jeder Mutation neu aus und stößt einen
 * Auto-Vorgang an, sobald sie in den Status „overdue" wechselt — solange sie
 * noch nicht freigegeben/verfallen ist. Idempotent durch Markierung im
 * notes-Feld („auto-vorgang erzeugt am …"). Keine Sperre wie bei NU-Compliance,
 * weil Sicherheits-Rückgabe AG-seitig hängen kann.
 */
async function reconcileSecurity(securityId: string): Promise<void> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [sec] = await db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.id, securityId),
        eq(schema.securities.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!sec) return;

  const project = await loadProject(workspaceId, sec.projectId);
  if (!project) return;

  const state = securityState(sec, project);
  if (state !== "overdue") return;
  if (sec.status === "freigegeben" || sec.status === "verfallen") return;

  // Idempotenz: prüfe, ob es schon einen offenen Vorgang gibt, der diese
  // Sicherheit als Cross-Domain-Link führt. Securities sind kein VorgangLinkKind
  // (würde Schema-Migration brauchen), daher behelfen wir uns mit einem
  // Marker im notes-Feld. Akzeptable Kompromisslösung für Phase 1.
  const marker = `[auto-vorgang:${sec.id}]`;
  if (sec.notes?.includes(marker)) return;

  const eff = effectiveValidUntil(sec, project);
  const overdueDays =
    eff && /^\d{4}-\d{2}-\d{2}$/.test(eff)
      ? Math.max(
          0,
          Math.round(
            (Date.now() - new Date(eff).getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "sicherheit_ueberfaellig",
    title: `Sicherheit überfällig: ${SECURITY_LABELS[sec.kind]} (${project.identifier})`,
    category: "vertragspflicht",
    projectId: sec.projectId,
    dueDate: isoDateInDays(7),
    firstStep: {
      kind: "klassifikation",
      payload: {
        securityId: sec.id,
        kind: sec.kind,
        amount: sec.amount,
        provider: sec.provider,
        referenceNumber: sec.referenceNumber,
        validUntil: eff,
        overdueDays,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: SECURITY_LEGAL_BASIS[sec.kind],
          sourceText:
            "Sicherheit ist nach Wegfall des Sicherungszwecks unverzüglich zurückzugeben — Verwertungsverbot nach § 17 VOB/B.",
        },
      ],
    },
    auditPayload: {
      securityId: sec.id,
      kind: sec.kind,
      overdueDays,
    },
  });

  // Marker setzen, damit kein Duplikat-Vorgang entsteht.
  await db
    .update(schema.securities)
    .set({
      notes: sec.notes ? `${sec.notes}\n${marker}` : marker,
      updatedAt: new Date(),
    })
    .where(eq(schema.securities.id, sec.id));

  revalidatePath("/vorgaenge");
}

export async function addSecurity(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const file = formData.get("file");
  const fields = formDataToObject(formData);
  const parsed = securityInputSchema.safeParse(fields);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const project = await loadProject(workspaceId, parsed.data.projectId);
  if (!project) return fail("Projekt nicht gefunden.");

  const id = genId("sec");
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
      bucket: "securities",
      workspaceId,
      entityId: id,
      fileName: `${id}_${file.name}`,
      data: buf,
    });
    documentPath = stored.storagePath;
    documentFilename = file.name;
  }

  try {
    await db.insert(schema.securities).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      subcontractorId: parsed.data.subcontractorId,
      kind: parsed.data.kind,
      direction: parsed.data.direction,
      provider: parsed.data.provider,
      referenceNumber: parsed.data.referenceNumber,
      amount: parsed.data.amount,
      percentOfContract: parsed.data.percentOfContract,
      currency: parsed.data.currency ?? "EUR",
      issuedAt: parsed.data.issuedAt,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      releaseTrigger: parsed.data.releaseTrigger,
      status: "aktiv",
      notes: parsed.data.notes,
      documentPath,
      documentFilename,
    });
  } catch {
    if (documentPath) await deleteUpload(documentPath);
    return fail("Sicherheit konnte nicht gespeichert werden.");
  }

  const userId = await getCurrentUserId();
  const [createdSec] = await db
    .select()
    .from(schema.securities)
    .where(eq(schema.securities.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "security",
    entityId: id,
    action: "create",
    after: createdSec,
    ctx: await getAuditContext(userId),
  });

  await reconcileSecurity(id);

  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}

export async function updateSecurity(formData: FormData): Promise<void> {
  const parsed = securityUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.id, parsed.data.id),
        eq(schema.securities.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Sicherheit nicht gefunden.");

  // Bei status=freigegeben + kein explizites releasedAt → setze auf heute.
  const releasedAt =
    parsed.data.status === "freigegeben" && !parsed.data.releasedAt
      ? new Date().toISOString().slice(0, 10)
      : parsed.data.releasedAt;

  await db
    .update(schema.securities)
    .set({
      kind: parsed.data.kind,
      direction: parsed.data.direction,
      provider: parsed.data.provider,
      referenceNumber: parsed.data.referenceNumber,
      amount: parsed.data.amount,
      percentOfContract: parsed.data.percentOfContract,
      issuedAt: parsed.data.issuedAt,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      releaseTrigger: parsed.data.releaseTrigger,
      status: parsed.data.status,
      releasedAt,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.securities.id, parsed.data.id));

  const userId = await getCurrentUserId();
  const [afterSec] = await db
    .select()
    .from(schema.securities)
    .where(eq(schema.securities.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "security",
    entityId: parsed.data.id,
    action: "update",
    before: existing,
    after: afterSec,
    ctx: await getAuditContext(userId),
  });

  await reconcileSecurity(parsed.data.id);
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function updateSecurityStatus(formData: FormData): Promise<void> {
  const parsed = securityStatusUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültiger Status.");

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.id, parsed.data.id),
        eq(schema.securities.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("Sicherheit nicht gefunden.");

  const releasedAt =
    parsed.data.status === "freigegeben"
      ? existing.releasedAt ?? new Date().toISOString().slice(0, 10)
      : existing.releasedAt;

  await db
    .update(schema.securities)
    .set({
      status: parsed.data.status,
      releasedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.securities.id, parsed.data.id));

  const userIdSt = await getCurrentUserId();
  const [afterSt] = await db
    .select()
    .from(schema.securities)
    .where(eq(schema.securities.id, parsed.data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "security",
    entityId: parsed.data.id,
    action: "update",
    before: existing,
    after: afterSt,
    ctx: await getAuditContext(userIdSt),
  });

  await reconcileSecurity(parsed.data.id);
  revalidatePath(`/projekte/${existing.projectId}`);
}

export async function deleteSecurity(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Sicherheits-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.id, parsed.data.id),
        eq(schema.securities.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return;

  if (existing.documentPath) {
    await deleteUpload(existing.documentPath);
  }

  await db
    .delete(schema.securities)
    .where(eq(schema.securities.id, parsed.data.id));

  const userId = await getCurrentUserId();
  await logChange({
    workspaceId,
    entityType: "security",
    entityId: parsed.data.id,
    action: "delete",
    before: existing,
    ctx: await getAuditContext(userId),
  });

  revalidatePath(`/projekte/${existing.projectId}`);
}
