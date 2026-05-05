"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  fristIdSchema,
  fristInputSchema,
  formDataToObject,
} from "@/lib/validation/schemas";
import { cleanupLinksToTarget } from "@/lib/vorgang/link-cleanup";

async function ensureProjectInWorkspace(
  workspaceId: string,
  projectId: string | null
): Promise<boolean> {
  if (!projectId) return true;
  const [row] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return !!row;
}

export async function createFrist(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = fristInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();

  if (!(await ensureProjectInWorkspace(workspaceId, parsed.data.projectId))) {
    return fieldFail({
      projectId: ["Projekt gehört nicht zum aktuellen Workspace."],
    });
  }

  const id = genId("f");
  try {
    await db.insert(schema.fristen).values({
      id,
      workspaceId,
      ...parsed.data,
    });
  } catch {
    return fail("Frist konnte nicht angelegt werden.");
  }

  revalidatePath("/fristen");
  revalidatePath("/");
  if (parsed.data.projectId) {
    revalidatePath(`/projekte/${parsed.data.projectId}`);
  }
  return ok({ id });
}

export async function toggleFristCompleted(formData: FormData): Promise<void> {
  const parsed = fristIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Frist-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [current] = await db
    .select({
      completed: schema.fristen.completed,
      projectId: schema.fristen.projectId,
    })
    .from(schema.fristen)
    .where(
      and(
        eq(schema.fristen.id, parsed.data.id),
        eq(schema.fristen.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!current) throw new Error("Frist nicht gefunden.");

  const next = !current.completed;
  await db
    .update(schema.fristen)
    .set({ completed: next, completedAt: next ? new Date() : null })
    .where(
      and(
        eq(schema.fristen.id, parsed.data.id),
        eq(schema.fristen.workspaceId, workspaceId)
      )
    );

  revalidatePath("/fristen");
  revalidatePath("/");
  if (current.projectId) {
    revalidatePath(`/projekte/${current.projectId}`);
  }
}

export async function deleteFrist(formData: FormData): Promise<void> {
  const parsed = fristIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Frist-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [current] = await db
    .select({ projectId: schema.fristen.projectId })
    .from(schema.fristen)
    .where(
      and(
        eq(schema.fristen.id, parsed.data.id),
        eq(schema.fristen.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.fristen)
    .where(
      and(
        eq(schema.fristen.id, parsed.data.id),
        eq(schema.fristen.workspaceId, workspaceId)
      )
    );

  // Orphaned vorgang_links entfernen (G).
  await cleanupLinksToTarget({ targetKind: "frist", targetId: parsed.data.id });

  revalidatePath("/fristen");
  revalidatePath("/");
  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}`);
  }
}
