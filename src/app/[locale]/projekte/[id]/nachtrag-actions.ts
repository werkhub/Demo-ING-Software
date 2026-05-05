"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  idOnlySchema,
  nachtragInputSchema,
} from "@/lib/validation/schemas";

async function ensureProject(workspaceId: string, projectId: string): Promise<boolean> {
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

export async function createNachtrag(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = nachtragInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!(await ensureProject(workspaceId, parsed.data.projectId))) {
    return fail("Projekt nicht gefunden.");
  }

  const id = genId("nt");
  try {
    await db.insert(schema.nachtraege).values({
      id,
      workspaceId,
      ...parsed.data,
    });
  } catch {
    return fail("Nachtrag konnte nicht angelegt werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}`);
  revalidatePath("/");
  return ok({ id });
}

export async function deleteNachtrag(formData: FormData): Promise<void> {
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Nachtrag-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [current] = await db
    .select({ projectId: schema.nachtraege.projectId })
    .from(schema.nachtraege)
    .where(
      and(
        eq(schema.nachtraege.id, parsed.data.id),
        eq(schema.nachtraege.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.nachtraege)
    .where(
      and(
        eq(schema.nachtraege.id, parsed.data.id),
        eq(schema.nachtraege.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}`);
  }
  revalidatePath("/");
}

export async function updateNachtragStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const allowed = [
    "entwurf",
    "angekuendigt",
    "eingereicht",
    "anerkannt",
    "abgelehnt",
    "geschlossen",
  ];
  if (!id || !allowed.includes(status)) throw new Error("Ungültiger Status.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.nachtraege.projectId })
    .from(schema.nachtraege)
    .where(
      and(
        eq(schema.nachtraege.id, id),
        eq(schema.nachtraege.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("Nachtrag nicht gefunden.");

  await db
    .update(schema.nachtraege)
    .set({
      status: status as typeof schema.nachtraege.$inferInsert.status,
      updatedAt: new Date(),
      ...(status === "anerkannt" || status === "abgelehnt"
        ? { decidedAt: new Date().toISOString().slice(0, 10) }
        : {}),
    })
    .where(
      and(
        eq(schema.nachtraege.id, id),
        eq(schema.nachtraege.workspaceId, workspaceId)
      )
    );

  revalidatePath(`/projekte/${current.projectId}`);
}
