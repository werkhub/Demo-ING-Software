"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation/schemas";

const inputSchema = z.object({
  projectId: z.string().min(1),
  effectiveAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  anrechenbareKostenEur: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 100) : null;
    })
    .refine((n) => n !== null && n > 0, {
      message: "Positiver Betrag in € erforderlich.",
    }),
  anlass: z.enum([
    "planung_grundlage",
    "kostenanschlag",
    "kostenfeststellung",
    "aenderung_ag",
    "aenderung_planung",
  ]),
  honorarsummeNettoEur: z
    .union([z.string(), z.number(), z.literal("")])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 100) : null;
    }),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function createKostenVersion(
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

  const id = genId("hkv");
  try {
    await db.insert(schema.hoaiKostenVersionen).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      effectiveAt: parsed.data.effectiveAt,
      anrechenbareKostenCents: parsed.data.anrechenbareKostenEur ?? 0,
      anlass: parsed.data.anlass,
      honorarsummeNettoCents: parsed.data.honorarsummeNettoEur,
      notes: parsed.data.notes,
    });

    // Cache am Projekt aktualisieren — neueste Version wird zur "aktuellen".
    await db
      .update(schema.projects)
      .set({
        hoaiAnrechenbareKostenCents: parsed.data.anrechenbareKostenEur ?? null,
        hoaiHonorarsummeNettoCents:
          parsed.data.honorarsummeNettoEur ?? null,
        hoaiBerechnetAm: parsed.data.honorarsummeNettoEur ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.projects.id, parsed.data.projectId),
          eq(schema.projects.workspaceId, workspaceId)
        )
      );
  } catch {
    return fail("Kosten-Version konnte nicht gespeichert werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/hoai`);
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  revalidatePath(`/projekte`);
  return ok({ id });
}

export async function deleteKostenVersion(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.hoaiKostenVersionen.projectId })
    .from(schema.hoaiKostenVersionen)
    .where(
      and(
        eq(schema.hoaiKostenVersionen.id, id),
        eq(schema.hoaiKostenVersionen.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.hoaiKostenVersionen)
    .where(
      and(
        eq(schema.hoaiKostenVersionen.id, id),
        eq(schema.hoaiKostenVersionen.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}/hoai`);
  }
}
