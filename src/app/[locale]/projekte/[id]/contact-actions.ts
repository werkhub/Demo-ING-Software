"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  contactInputSchema,
  formDataToObject,
  idOnlySchema,
} from "@/lib/validation/schemas";

export async function createContact(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactInputSchema.safeParse(formDataToObject(formData));
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

  const id = genId("c");
  try {
    await db.insert(schema.projectContacts).values({
      id,
      workspaceId,
      ...parsed.data,
    });
  } catch {
    return fail("Kontakt konnte nicht angelegt werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}

export async function deleteContact(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Kontakt-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [current] = await db
    .select({ projectId: schema.projectContacts.projectId })
    .from(schema.projectContacts)
    .where(
      and(
        eq(schema.projectContacts.id, parsed.data.id),
        eq(schema.projectContacts.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.projectContacts)
    .where(
      and(
        eq(schema.projectContacts.id, parsed.data.id),
        eq(schema.projectContacts.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}`);
  }
}
