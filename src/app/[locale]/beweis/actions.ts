"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  beweisChecklistInputSchema,
  formDataToObject,
} from "@/lib/validation/schemas";

export async function saveBeweisChecklist(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = beweisChecklistInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Ungültige Eingabe.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  // Workspace-Check
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

  // Validiere JSON
  try {
    JSON.parse(parsed.data.checksState);
  } catch {
    return fail("Ungültiger Checks-State (kein JSON).");
  }

  // Upsert: existiert bereits eine Checkliste für (project, anlass)?
  const [existing] = await db
    .select({ id: schema.beweisChecklists.id })
    .from(schema.beweisChecklists)
    .where(
      and(
        eq(schema.beweisChecklists.projectId, parsed.data.projectId),
        eq(schema.beweisChecklists.anlass, parsed.data.anlass),
        eq(schema.beweisChecklists.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.beweisChecklists)
      .set({
        checksState: parsed.data.checksState,
        notes: parsed.data.notes,
        updatedAt: new Date(),
      })
      .where(eq(schema.beweisChecklists.id, existing.id));
    revalidatePath("/beweis");
    revalidatePath(`/projekte/${parsed.data.projectId}`);
    return ok({ id: existing.id });
  }

  const id = genId("bw");
  await db.insert(schema.beweisChecklists).values({
    id,
    workspaceId,
    ...parsed.data,
  });

  revalidatePath("/beweis");
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}
