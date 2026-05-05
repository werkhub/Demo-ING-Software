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
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { aggregateNachkalk } from "@/lib/nachkalk/aggregate";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

const isoToday = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export async function createSnapshot(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const projektId = String(formData.get("projektId") ?? "");
  if (!projektId) return fail("projektId fehlt.");

  const [project] = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return fail("Projekt nicht gefunden.");

  const agg = await aggregateNachkalk(workspaceId, projektId);

  const id = genId("nk");
  await db.insert(schema.nachkalkulationSnapshots).values({
    id,
    workspaceId,
    projektId,
    stichtag: isoToday(),
    sollNettoCents: agg.total.sollNettoCents,
    istLohnCents: agg.total.istLohnCents,
    istMaterialCents: agg.total.istMaterialCents,
    istNuCents: agg.total.istNuCents,
    deckungsbeitragCents: agg.total.deckungsbeitragCents,
    fertigstellungsgradPct: agg.fertigstellungsgradPct,
    createdBy: userId,
    snapshotJson: JSON.stringify(agg.positionen),
  });

  // Auto-Vorgänge bei Kostenüberschreitung pro Position (idempotent über
  // Marker im notes). Wir markieren am Snapshot-notes, damit nicht jeder
  // Snapshot-Lauf neue Vorgänge erzeugt.
  const verletzte = agg.positionen.filter(
    (p) => p.warning === "kostenueberschreitung"
  );
  if (verletzte.length > 0) {
    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "rechnung_anomalie", // Reuse — kein eigener Source-Wert nötig
      title: `Nachkalk: ${verletzte.length} LV-Positionen mit Kostenüberschreitung (${project.name})`,
      category: "vertragspflicht",
      projectId: projektId,
      dueDate: isoToday(7),
      firstStep: {
        kind: "klassifikation",
        payload: {
          snapshotId: id,
          projektId,
          verletzteAnzahl: verletzte.length,
          summenAbweichungCents:
            agg.total.istGesamtCents - agg.total.sollNettoCents,
          positionen: verletzte.map((p) => ({
            lvItemId: p.lvItemId,
            oz: p.oz,
            shortText: p.shortText,
            sollCents: p.sollNettoCents,
            istCents: p.istGesamtCents,
            abweichungPct: p.abweichungPct,
          })),
          triggeredBy: "nachkalk_snapshot",
        },
      },
      auditPayload: {
        snapshotId: id,
        projektId,
        verletzteAnzahl: verletzte.length,
      },
    });
  }

  revalidatePath(`/projekte/${projektId}/nachkalkulation`);
  return ok({ id });
}

export async function createSnapshotRedirect(formData: FormData): Promise<void> {
  const result = await createSnapshot(null, formData);
  const projektId = String(formData.get("projektId") ?? "");
  if (!result.ok) {
    redirect(
      `/projekte/${projektId}/nachkalkulation?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/projekte/${projektId}/nachkalkulation?snapshot=${result.data.id}`);
}
