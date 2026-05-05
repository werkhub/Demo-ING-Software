"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
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

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Datum im Format YYYY-MM-DD erwartet.",
  });

const inputSchema = z.object({
  projectId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  gewerk: z.string().trim().min(1, "Gewerk erforderlich."),
  raumBauteil: optionalString,
  material: z.string().trim().min(1, "Material erforderlich."),
  hersteller: optionalString,
  artikelNr: optionalString,
  farbeVariante: optionalString,
  empfehlung: optionalString,
  notes: optionalString,
});

const decisionSchema = z.object({
  id: z.string().min(1),
  agEntscheidung: z.enum(["offen", "ausgewaehlt", "abgelehnt", "alternative"]),
  agEntscheiderName: optionalString,
  agEntscheidungDatum: optionalIsoDate,
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

export async function createBemusterung(
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

  const id = genId("bm");
  try {
    await db.insert(schema.bemusterungen).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      datum: parsed.data.datum,
      gewerk: parsed.data.gewerk,
      raumBauteil: parsed.data.raumBauteil,
      material: parsed.data.material,
      hersteller: parsed.data.hersteller,
      artikelNr: parsed.data.artikelNr,
      farbeVariante: parsed.data.farbeVariante,
      empfehlung: parsed.data.empfehlung,
      status: "vorgelegt",
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Bemusterung konnte nicht gespeichert werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/bemusterung`);
  return ok({ id });
}

export async function recordAgDecision(formData: FormData): Promise<void> {
  const parsed = decisionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Ungültige Entscheidung.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.bemusterungen.projectId })
    .from(schema.bemusterungen)
    .where(
      and(
        eq(schema.bemusterungen.id, parsed.data.id),
        eq(schema.bemusterungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("Bemusterung nicht gefunden.");

  const decided = parsed.data.agEntscheidung !== "offen";
  await db
    .update(schema.bemusterungen)
    .set({
      agEntscheidung: parsed.data.agEntscheidung,
      agEntscheiderName: parsed.data.agEntscheiderName,
      agEntscheidungDatum:
        parsed.data.agEntscheidungDatum ??
        (decided ? new Date().toISOString().slice(0, 10) : null),
      status: decided ? "entschieden" : "vorgelegt",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.bemusterungen.id, parsed.data.id),
        eq(schema.bemusterungen.workspaceId, workspaceId)
      )
    );

  revalidatePath(`/projekte/${current.projectId}/bemusterung`);
}

export async function deleteBemusterung(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.bemusterungen.projectId })
    .from(schema.bemusterungen)
    .where(
      and(
        eq(schema.bemusterungen.id, id),
        eq(schema.bemusterungen.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.bemusterungen)
    .where(
      and(
        eq(schema.bemusterungen.id, id),
        eq(schema.bemusterungen.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}/bemusterung`);
  }
}
