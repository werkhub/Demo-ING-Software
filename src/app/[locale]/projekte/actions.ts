"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { getAuditContext, logChange } from "@/lib/audit/log";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  projectHoaiUpdateSchema,
  projectIdSchema,
  projectInputSchema,
  projectStatusUpdateSchema,
  projectUpdateSchema,
} from "@/lib/validation/schemas";
import { calculate } from "@/lib/hoai/calculator";
import { HONORARTAFELN } from "@/lib/hoai/honorartafeln";
import type { Leistungsphase } from "@/lib/hoai/types";
import {
  cleanupLinksToTarget,
  gcOrphanedVorgangLinks,
} from "@/lib/vorgang/link-cleanup";
import { computeAbnahmeAutomations } from "@/lib/projekt/status-transition";

/**
 * Idempotenter Frist-Insert: legt nur dann eine Frist an, wenn keine andere
 * im selben Projekt mit gleicher legalBasis existiert. Dadurch zerschießt ein
 * mehrfacher Status-Wechsel zu „Abnahme" das Frist-Datenset nicht.
 */
async function ensureFristExists(opts: {
  workspaceId: string;
  projectId: string;
  task: string;
  deadline: string;
  legalBasis: string;
}): Promise<boolean> {
  const existing = await db
    .select({ id: schema.fristen.id })
    .from(schema.fristen)
    .where(
      and(
        eq(schema.fristen.workspaceId, opts.workspaceId),
        eq(schema.fristen.projectId, opts.projectId),
        eq(schema.fristen.legalBasis, opts.legalBasis)
      )
    )
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(schema.fristen).values({
    id: genId("f"),
    workspaceId: opts.workspaceId,
    projectId: opts.projectId,
    task: opts.task,
    deadline: opts.deadline,
    legalBasis: opts.legalBasis,
  });
  return true;
}

export async function createProject(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = projectInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const id = genId("p");

  try {
    await db.insert(schema.projects).values({
      id,
      workspaceId,
      ...parsed.data,
      progress: 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    if (/UNIQUE/i.test(msg)) {
      return fieldFail({
        identifier: ["BV-Nummer ist in diesem Workspace bereits vergeben."],
      });
    }
    return fail("Konnte das Projekt nicht anlegen. Bitte erneut versuchen.");
  }

  const userId = await getCurrentUserId();
  const [createdProject] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "project",
    entityId: id,
    action: "create",
    after: createdProject,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/projekte");
  revalidatePath("/");
  redirect(`/projekte/${id}`);
}

export async function updateProject(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const data = formDataToObject(formData);
  const idParse = projectIdSchema.safeParse({ id: data.id });
  if (!idParse.success) return fail("Ungültige Projekt-ID.");
  const id = idParse.data.id;

  const parsed = projectUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();

  const [existing] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, id), eq(schema.projects.workspaceId, workspaceId))
    )
    .limit(1);
  if (!existing) return fail("Projekt nicht gefunden.");

  try {
    await db
      .update(schema.projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.projects.id, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    if (/UNIQUE/i.test(msg)) {
      return fieldFail({
        identifier: ["BV-Nummer ist in diesem Workspace bereits vergeben."],
      });
    }
    return fail("Aktualisierung fehlgeschlagen.");
  }

  const userId = await getCurrentUserId();
  const [afterProject] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "project",
    entityId: id,
    action: "update",
    before: existing,
    after: afterProject,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/projekte");
  revalidatePath(`/projekte/${id}`);
  revalidatePath("/");
  return ok({ id });
}

export async function deleteProject(formData: FormData): Promise<void> {
  const parsed = projectIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Projekt-ID.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const [existing] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.id),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.id),
        eq(schema.projects.workspaceId, workspaceId)
      )
    );

  if (existing) {
    await logChange({
      workspaceId,
      entityType: "project",
      entityId: parsed.data.id,
      action: "delete",
      before: existing,
      ctx: await getAuditContext(userId),
    });
  }

  // Direkten Project-Link entfernen, anschließend Orphan-GC für die per
  // FK cascade mitgelöschten Child-Entitäten (Verträge, Bautagebuch, Fristen,
  // Vorgänge, Rechnungen).
  await cleanupLinksToTarget({ targetKind: "project", targetId: parsed.data.id });
  await gcOrphanedVorgangLinks();

  revalidatePath("/projekte");
  revalidatePath("/");
  redirect("/projekte");
}

/**
 * Status-Wechsel mit phasen-spezifischen Auto-Aktionen:
 *   - Wechsel zu „Abnahme": setzt abnahmeDate (heute, falls leer), berechnet
 *     warrantyEnd (BGB 5 J · VOB 4 J), legt Schlussrechnungs-Frist
 *     (§ 16 Abs. 3 VOB/B, +30 d) und Gewährleistungs-Auslauf-Frist
 *     (§ 13 Abs. 4 VOB/B / § 634a BGB, warrantyEnd −60 d) an.
 *
 * Idempotent über `ensureFristExists` (legalBasis-Check) — mehrfacher Wechsel
 * legt keine Duplikate an.
 */
export async function setProjectStatus(formData: FormData): Promise<void> {
  const parsed = projectStatusUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Status-Eingabe."
    );
  }
  const { id, status } = parsed.data;

  const workspaceId = await getCurrentWorkspaceId();

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, id),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) throw new Error("Projekt nicht gefunden.");

  // No-op, wenn Status unverändert.
  if (project.status === status) {
    revalidatePath(`/projekte/${id}`);
    return;
  }

  // Phasen-spezifische Daten-Updates aufsammeln.
  const updates: Partial<typeof schema.projects.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "Abnahme") {
    const auto = computeAbnahmeAutomations({
      currentAbnahmeDate: project.abnahmeDate,
      currentWarrantyEnd: project.warrantyEnd,
      contractType: project.contractType,
    });
    if (auto.abnahmeDate) updates.abnahmeDate = auto.abnahmeDate;
    if (auto.warrantyEnd) updates.warrantyEnd = auto.warrantyEnd;

    await db
      .update(schema.projects)
      .set(updates)
      .where(eq(schema.projects.id, id));

    for (const f of auto.fristen) {
      await ensureFristExists({
        workspaceId,
        projectId: id,
        task: f.task,
        deadline: f.deadline,
        legalBasis: f.legalBasis,
      });
    }
  } else {
    await db
      .update(schema.projects)
      .set(updates)
      .where(eq(schema.projects.id, id));
  }

  const userId = await getCurrentUserId();
  const [afterStatus] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "project",
    entityId: id,
    action: "update",
    before: project,
    after: afterStatus,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/projekte");
  revalidatePath(`/projekte/${id}`);
  revalidatePath("/fristen");
  revalidatePath("/");
}

/* ============== HOAI-Konfiguration am Projekt (Sprint 2 Pivot) ============== */

/**
 * Speichert die HOAI-Eingaben am Projekt + berechnet die Honorarsumme.
 * Cache-Felder hoaiHonorarsummeNettoCents + hoaiBerechnetAm werden
 * automatisch gesetzt. Bei ungültiger Eingabe (Kosten außerhalb Tafel-
 * Bereich, ungültige LP-Kombination) wird ein fail-Result zurückgegeben.
 */
export async function updateProjectHoai(
  _prev: ActionResult<{ id: string; honorarsummeNettoCents: number }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; honorarsummeNettoCents: number }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = projectHoaiUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  // Projekt im Workspace?
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, data.id),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) {
    return fail("Projekt nicht gefunden.");
  }

  // HOAI-Berechnung durchführen
  const calc = calculate({
    leistungsbild: data.hoaiLeistungsbild,
    zone: data.hoaiHonorarzone,
    satz: data.hoaiSatz,
    anrechenbareKostenCents: data.hoaiAnrechenbareKostenCents,
    beauftragteLps: data.hoaiBeauftragteLpsJson as Leistungsphase[],
    umbauZuschlagPct: data.hoaiUmbauZuschlagPct,
    nebenkostenPauschalePct: data.hoaiNebenkostenPct,
  });

  if (!calc.ok) {
    const tafel = HONORARTAFELN[data.hoaiLeistungsbild];
    let msg: string;
    switch (calc.error.kind) {
      case "kosten_unter_min":
        msg = `Anrechenbare Kosten unter Tafel-Minimum (${(tafel.kostenBereichMinCents / 100).toFixed(2)} €).`;
        break;
      case "kosten_ueber_max":
        msg = `Anrechenbare Kosten über Tafel-Maximum (${(tafel.kostenBereichMaxCents / 100).toFixed(2)} €).`;
        break;
      case "ungueltige_lp":
        msg = `LP${calc.error.lp} ist für ${calc.error.leistungsbild} nicht vorgesehen.`;
        break;
      case "keine_lps_beauftragt":
        msg = "Mindestens eine Leistungsphase muss beauftragt sein.";
        break;
    }
    return fail(msg);
  }

  await db
    .update(schema.projects)
    .set({
      hoaiLeistungsbild: data.hoaiLeistungsbild,
      hoaiParagraph: HONORARTAFELN[data.hoaiLeistungsbild].paragraph,
      hoaiHonorarzone: data.hoaiHonorarzone,
      hoaiSatz: data.hoaiSatz,
      hoaiAnrechenbareKostenCents: data.hoaiAnrechenbareKostenCents,
      hoaiBeauftragteLpsJson: JSON.stringify(data.hoaiBeauftragteLpsJson),
      hoaiUmbauZuschlagPct: data.hoaiUmbauZuschlagPct,
      hoaiNebenkostenPct: data.hoaiNebenkostenPct,
      hoaiHonorarsummeNettoCents: calc.result.honorarsummeNettoCents,
      hoaiBerechnetAm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, data.id));

  // Audit
  const [after] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, data.id))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "project",
    entityId: data.id,
    action: "update",
    before: project,
    after,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/projekte");
  revalidatePath(`/projekte/${data.id}`);
  revalidatePath(`/projekte/${data.id}/hoai`);
  return ok({
    id: data.id,
    honorarsummeNettoCents: calc.result.honorarsummeNettoCents,
  });
}
