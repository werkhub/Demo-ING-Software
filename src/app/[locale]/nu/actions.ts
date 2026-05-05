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
  passThroughStatusUpdateSchema,
  subcontractorInputSchema,
} from "@/lib/validation/schemas";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import { getAuditContext, logChange } from "@/lib/audit/log";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createSubcontractor(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = subcontractorInputSchema.safeParse(formDataToObject(formData));
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

  const id = genId("nu");
  try {
    await db.insert(schema.subcontractors).values({
      id,
      workspaceId,
      ...parsed.data,
    });
  } catch {
    return fail("Nachunternehmer konnte nicht angelegt werden.");
  }

  const userId = await getCurrentUserId();
  const [createdNu] = await db
    .select()
    .from(schema.subcontractors)
    .where(eq(schema.subcontractors.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "subcontractor",
    entityId: id,
    action: "create",
    after: createdNu,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/nu");
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}

export async function updatePassThroughStatus(formData: FormData): Promise<void> {
  const parsed = passThroughStatusUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültiger Status."
    );
  }
  const { id, passThroughStatus: status } = parsed.data;

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [current] = await db
    .select()
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, id),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("NU nicht gefunden.");

  const previousStatus = current.passThroughStatus;
  const becameRisky =
    (status === "klausel_fehlend" || status === "konfliktig") &&
    previousStatus !== "klausel_fehlend" &&
    previousStatus !== "konfliktig";

  await db
    .update(schema.subcontractors)
    .set({
      passThroughStatus:
        status as typeof schema.subcontractors.$inferInsert.passThroughStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.subcontractors.id, id));

  const [afterNu] = await db
    .select()
    .from(schema.subcontractors)
    .where(eq(schema.subcontractors.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "subcontractor",
    entityId: id,
    action: "update",
    before: current,
    after: afterNu,
    ctx: await getAuditContext(userId),
  });

  // Auto-Vorgang nur beim Übergang in den Risiko-Bereich (idempotent durch Status-Vergleich)
  if (becameRisky) {
    const isFehlend = status === "klausel_fehlend";
    const title = isFehlend
      ? `Pass-Through-Lücke ${current.gewerk}: ${current.name} — Klausel fehlt`
      : `Pass-Through-Konflikt ${current.gewerk}: ${current.name}`;

    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "nu_pass_through",
      title,
      category: "vertragspflicht",
      projectId: current.projectId,
      // Pass-Through-Lücke schmerzt sofort: 14 Tage zur Klärung mit NU
      dueDate: isoDateInDays(14),
      firstStep: {
        kind: "klassifikation",
        payload: {
          subcontractorId: current.id,
          subcontractorName: current.name,
          gewerk: current.gewerk,
          contractValue: current.contractValue,
          previousStatus,
          newStatus: status,
        },
        citations: [
          {
            sourceKind: "vob",
            sourceRef: "§ 13 Abs. 4 VOB/B",
            sourceText:
              "Mängel-Verjährung 4 Jahre — bei BGB-Werkvertrag 5 Jahre. Differenz muss an NU weitergereicht werden.",
          },
        ],
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 13 Abs. 4 VOB/B",
          sourceText:
            "Mängel-Verjährungs-Differenz BGB/VOB muss in NU-Vertrag durchgereicht werden.",
        },
      ],
      auditPayload: {
        subcontractorId: current.id,
        previousStatus,
        newStatus: status,
      },
    });
    revalidatePath("/vorgaenge");
  }

  revalidatePath("/nu");
  revalidatePath(`/projekte/${current.projectId}`);
}

export async function deleteSubcontractor(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("NU-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const [current] = await db
    .select()
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, parsed.data.id),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, parsed.data.id),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    );

  if (current) {
    await logChange({
      workspaceId,
      entityType: "subcontractor",
      entityId: parsed.data.id,
      action: "delete",
      before: current,
      ctx: await getAuditContext(userId),
    });
  }

  revalidatePath("/nu");
  if (current?.projectId) revalidatePath(`/projekte/${current.projectId}`);
}
