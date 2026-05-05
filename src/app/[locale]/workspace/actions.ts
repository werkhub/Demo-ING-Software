"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { serializeDisciplines } from "@/lib/workspace/disciplines";
import type { DisciplineSubprofile, WorkspaceRole } from "@/db/schema";
import {
  formDataToObject,
  workspaceDisciplinesSchema,
  workspaceRoleSchema,
  workspaceVobSettingsSchema,
} from "@/lib/validation/schemas";

export async function updateVobSettings(
  _prev: ActionResult<{ provider: string }> | null,
  formData: FormData
): Promise<ActionResult<{ provider: string }>> {
  const parsed = workspaceVobSettingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Ungültige Auswahl.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  try {
    await db
      .update(schema.workspaces)
      .set({
        vobPreferredExternalProvider: parsed.data.vobPreferredExternalProvider,
      })
      .where(eq(schema.workspaces.id, workspaceId));
  } catch {
    return fail("Einstellung konnte nicht gespeichert werden.");
  }

  revalidatePath("/workspace");
  revalidatePath("/gesetze", "layout");
  return ok({ provider: parsed.data.vobPreferredExternalProvider });
}

export async function updateWorkspaceRole(
  _prev: ActionResult<{ role: WorkspaceRole }> | null,
  formData: FormData
): Promise<ActionResult<{ role: WorkspaceRole }>> {
  const parsed = workspaceRoleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Ungültige Rolle.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  try {
    await db
      .update(schema.workspaces)
      .set({ workspaceRole: parsed.data.workspaceRole })
      .where(eq(schema.workspaces.id, workspaceId));
  } catch {
    return fail("Rolle konnte nicht gespeichert werden.");
  }

  // Rolle prägt nahezu die gesamte UI — Layout-weiter Refresh
  revalidatePath("/", "layout");
  return ok({ role: parsed.data.workspaceRole });
}

export type WorkspaceDisciplinesResult = {
  subprofile: DisciplineSubprofile;
  disciplinesCount: number;
};

export async function updateWorkspaceDisciplines(
  _prev: ActionResult<WorkspaceDisciplinesResult> | null,
  formData: FormData
): Promise<ActionResult<WorkspaceDisciplinesResult>> {
  const parsed = workspaceDisciplinesSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Ungültige Eingabe für Fachprofil.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  try {
    await db
      .update(schema.workspaces)
      .set({
        disciplinesJson: serializeDisciplines(parsed.data.disciplines),
        disciplineSubprofile: parsed.data.disciplineSubprofile,
        clientFocus: parsed.data.clientFocus,
        companySize: parsed.data.companySize,
      })
      .where(eq(schema.workspaces.id, workspaceId));
  } catch {
    return fail("Fachprofil konnte nicht gespeichert werden.");
  }

  // Fachprofil prägt Sidebar + HOAI-Rechner + Recht-Assistent-Kontext —
  // Layout-weiter Refresh.
  revalidatePath("/", "layout");
  return ok({
    subprofile: parsed.data.disciplineSubprofile,
    disciplinesCount: parsed.data.disciplines.length,
  });
}

