"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  contractInputSchema,
  formDataToObject,
  idOnlySchema,
  triggerByContractIdSchema,
} from "@/lib/validation/schemas";
import { scanContract, type Finding } from "@/lib/contract-risk-scan";
import {
  createVorgangFromTrigger,
  findOpenVorgangByLink,
} from "@/lib/vorgang/create-from-trigger";
import { cleanupLinksToTarget } from "@/lib/vorgang/link-cleanup";
import type { VorgangCitationKind } from "@/db/schema";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseFindings(json: string | null): Finding[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as Finding[];
  } catch {
    return [];
  }
}

/** Heuristik: aus "§ 13 Abs. 5 VOB/B" → kind=vob; "BGB" → bgb; "BGH ..." → urteil. */
function citationKindFromBasis(basis: string): VorgangCitationKind {
  const b = basis.toLowerCase();
  if (b.includes("vob")) return "vob";
  if (b.includes("hoai")) return "hoai";
  if (b.includes("bgh") || b.includes("olg") || b.includes("eclis"))
    return "urteil";
  if (b.includes("bgb")) return "bgb";
  return "intern";
}

export async function createContract(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = contractInputSchema.safeParse(formDataToObject(formData));
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

  // Risiko-Scan ausführen + Findings speichern
  const scan = scanContract(parsed.data.contractText);

  const id = genId("ct");
  try {
    await db.insert(schema.contracts).values({
      id,
      workspaceId,
      ...parsed.data,
      riskScore: scan.score,
      riskFindings: JSON.stringify(scan.findings),
    });
  } catch {
    return fail("Vertrag konnte nicht angelegt werden.");
  }

  revalidatePath("/vertrag");
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}

export async function rescanContract(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Vertrag-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.id, parsed.data.id),
        eq(schema.contracts.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!contract) throw new Error("Vertrag nicht gefunden.");

  const scan = scanContract(contract.contractText);
  await db
    .update(schema.contracts)
    .set({
      riskScore: scan.score,
      riskFindings: JSON.stringify(scan.findings),
      updatedAt: new Date(),
    })
    .where(eq(schema.contracts.id, parsed.data.id));

  revalidatePath("/vertrag");
  revalidatePath(`/projekte/${contract.projectId}`);
}

export async function deleteContract(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Vertrag-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [current] = await db
    .select({ projectId: schema.contracts.projectId })
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.id, parsed.data.id),
        eq(schema.contracts.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.contracts)
    .where(
      and(
        eq(schema.contracts.id, parsed.data.id),
        eq(schema.contracts.workspaceId, workspaceId)
      )
    );

  await cleanupLinksToTarget({ targetKind: "contract", targetId: parsed.data.id });

  revalidatePath("/vertrag");
  if (current?.projectId) revalidatePath(`/projekte/${current.projectId}`);
}

/* ============== TRIGGER → VORGANG ============== */

/**
 * Übernimmt einen Vertrag inkl. Risk-Findings in einen Vorgang. Nur sinnvoll
 * ab Risk-Score 30+ oder mind. 1 high-Finding — sonst lohnt der Workflow nicht.
 */
export async function createVorgangFromContract(formData: FormData): Promise<void> {
  const validated = triggerByContractIdSchema.safeParse(formDataToObject(formData));
  if (!validated.success) {
    throw new Error(
      validated.error.issues.map((i) => i.message).join(" · ") ||
        "Vertrag-ID fehlt."
    );
  }
  const { id } = validated.data;

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(
      and(
        eq(schema.contracts.id, id),
        eq(schema.contracts.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!contract) throw new Error("Vertrag nicht gefunden.");

  // Idempotenz: schon ein offener Vorgang verlinkt? Dorthin umleiten.
  const existing = await findOpenVorgangByLink({
    workspaceId,
    targetKind: "contract",
    targetId: contract.id,
  });
  if (existing) {
    revalidatePath("/vertrag");
    if (contract.projectId) revalidatePath(`/projekte/${contract.projectId}`);
    redirect(`/vorgaenge/${existing}`);
  }

  const findings = parseFindings(contract.riskFindings);
  if (findings.length === 0) {
    throw new Error(
      `Keine Risiko-Findings — bitte zuerst „Neu scannen" und erneut versuchen.`
    );
  }

  // Pflicht-Citations aus jedem Finding ableiten (max 5 für Übersichtlichkeit)
  const citations = findings.slice(0, 5).map((f) => ({
    sourceKind: citationKindFromBasis(f.basis),
    sourceRef: f.basis,
    sourceText: f.title,
  }));

  // Höchster Schweregrad bestimmt Frist-Druck
  const hasHigh = findings.some((f) => f.level === "high");
  const dueDays = hasHigh ? 7 : 14;

  const title = `Vertragsrisiko-Review: ${contract.title}`;

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "vertrags_scan",
    title,
    category: "vertragspflicht",
    projectId: contract.projectId,
    dueDate: isoDateInDays(dueDays),
    firstStep: {
      kind: "klassifikation",
      payload: {
        contractId: contract.id,
        contractTitle: contract.title,
        contractKind: contract.kind,
        riskScore: contract.riskScore,
        findings,
      },
      citations,
    },
    citations,
    link: { targetKind: "contract", targetId: contract.id },
    auditPayload: {
      contractId: contract.id,
      riskScore: contract.riskScore,
      findingsCount: findings.length,
    },
  });

  revalidatePath("/vertrag");
  revalidatePath("/vorgaenge");
  if (contract.projectId) revalidatePath(`/projekte/${contract.projectId}`);
  redirect(`/vorgaenge/${vorgangId}`);
}
