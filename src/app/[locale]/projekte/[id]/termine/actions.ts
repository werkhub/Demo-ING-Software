"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation/schemas";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const inputSchema = z.object({
  projectId: z.string().min(1),
  bezeichnung: z.string().trim().min(1, "Bezeichnung erforderlich."),
  beschreibung: optionalString,
  sollDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  notes: optionalString,
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["geplant", "laufend", "erreicht", "verzoegert", "abgesagt"]),
  istDatum: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  verzoegerungGrund: optionalString,
});

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

export async function createMeilenstein(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = inputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!(await ensureProject(workspaceId, parsed.data.projectId))) {
    return fail("Projekt nicht gefunden.");
  }

  const [maxRow] = await db
    .select({ m: max(schema.meilensteine.reihenfolge) })
    .from(schema.meilensteine)
    .where(
      and(
        eq(schema.meilensteine.workspaceId, workspaceId),
        eq(schema.meilensteine.projectId, parsed.data.projectId)
      )
    );
  const nextReihenfolge = (maxRow?.m ?? -1) + 1;

  const id = genId("ms");
  try {
    await db.insert(schema.meilensteine).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      bezeichnung: parsed.data.bezeichnung,
      beschreibung: parsed.data.beschreibung,
      reihenfolge: nextReihenfolge,
      sollDatum: parsed.data.sollDatum,
      status: "geplant",
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Meilenstein konnte nicht gespeichert werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/termine`);
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}

export async function updateMeilensteinStatus(formData: FormData): Promise<void> {
  const parsed = statusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Status-Aktualisierung.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.meilensteine.projectId })
    .from(schema.meilensteine)
    .where(
      and(
        eq(schema.meilensteine.id, parsed.data.id),
        eq(schema.meilensteine.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("Meilenstein nicht gefunden.");

  const istDatum =
    parsed.data.status === "erreicht"
      ? parsed.data.istDatum ?? new Date().toISOString().slice(0, 10)
      : parsed.data.status === "abgesagt"
        ? null
        : parsed.data.istDatum;

  await db
    .update(schema.meilensteine)
    .set({
      status: parsed.data.status,
      istDatum,
      verzoegerungGrund:
        parsed.data.status === "verzoegert" ? parsed.data.verzoegerungGrund : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.meilensteine.id, parsed.data.id),
        eq(schema.meilensteine.workspaceId, workspaceId)
      )
    );

  revalidatePath(`/projekte/${current.projectId}/termine`);
  revalidatePath(`/projekte/${current.projectId}`);
}

export async function deleteMeilenstein(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.meilensteine.projectId })
    .from(schema.meilensteine)
    .where(
      and(
        eq(schema.meilensteine.id, id),
        eq(schema.meilensteine.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.meilensteine)
    .where(
      and(
        eq(schema.meilensteine.id, id),
        eq(schema.meilensteine.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}/termine`);
  }
}
