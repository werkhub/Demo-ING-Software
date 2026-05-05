"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { fail, type ActionResult } from "@/lib/action-result";
import { getCurrentWorkspaceId } from "@/lib/session";

const leistungsbereichEnum = z.enum([
  "tragwerk",
  "tga",
  "brandschutz",
  "vermessung",
  "geotechnik",
  "schall",
  "sonstiges",
]);

const statusEnum = z.enum([
  "angefragt",
  "beauftragt",
  "abgeschlossen",
  "storniert",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum")
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v));

const lpListSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    // "3,4,5" oder "3 4 5" → [3,4,5]
    const lps = v
      .split(/[\s,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 9);
    if (lps.length === 0) return null;
    return JSON.stringify(Array.from(new Set(lps)).sort((a, b) => a - b));
  });

const createSchema = z.object({
  projektId: z.string().min(1),
  fachplanerName: z.string().min(1, "Fachplaner-Name fehlt").max(200),
  fachplanerKontakt: z.string().max(200).optional().nullable(),
  leistungsbereich: leistungsbereichEnum,
  lpReferenz: lpListSchema,
  vergabeDatum: isoDate.optional().nullable(),
  vergabeSummeEur: z
    .union([z.string().regex(/^\d+([.,]\d{1,2})?$/), z.literal("")])
    .transform((v) =>
      v === "" ? null : Math.round(parseFloat(v.replace(",", ".")) * 100)
    )
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createSubplaner(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = createSchema.safeParse({
    projektId: formData.get("projektId"),
    fachplanerName: formData.get("fachplanerName"),
    fachplanerKontakt: formData.get("fachplanerKontakt") ?? "",
    leistungsbereich: formData.get("leistungsbereich"),
    lpReferenz: formData.get("lpReferenz") ?? "",
    vergabeDatum: formData.get("vergabeDatum") ?? "",
    vergabeSummeEur: formData.get("vergabeSummeEur") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return fail(
      "Eingabe unvollständig.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Projekt-Zugehörigkeit
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return fail("Projekt nicht gefunden.");

  const id = genId("sp");
  const now = new Date();
  await db.insert(schema.subplanerVergaben).values({
    id,
    workspaceId,
    projektId: parsed.data.projektId,
    fachplanerName: parsed.data.fachplanerName,
    fachplanerKontakt: parsed.data.fachplanerKontakt ?? null,
    leistungsbereich: parsed.data.leistungsbereich,
    lpReferenzJson: parsed.data.lpReferenz ?? null,
    vergabeDatum: parsed.data.vergabeDatum ?? null,
    vergabeSummeCents: parsed.data.vergabeSummeEur,
    status: "angefragt",
    dokumentPfad: null,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath(`/projekte/${parsed.data.projektId}/subplaner`);
  return { ok: true, data: { id } };
}

const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: statusEnum,
});

export async function updateSubplanerStatus(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = updateStatusSchema.parse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  const [sp] = await db
    .select({ projektId: schema.subplanerVergaben.projektId })
    .from(schema.subplanerVergaben)
    .where(
      and(
        eq(schema.subplanerVergaben.id, parsed.id),
        eq(schema.subplanerVergaben.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!sp) return;
  await db
    .update(schema.subplanerVergaben)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(schema.subplanerVergaben.id, parsed.id));
  revalidatePath(`/projekte/${sp.projektId}/subplaner`);
}

export async function deleteSubplaner(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const [sp] = await db
    .select({ projektId: schema.subplanerVergaben.projektId })
    .from(schema.subplanerVergaben)
    .where(
      and(
        eq(schema.subplanerVergaben.id, id),
        eq(schema.subplanerVergaben.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!sp) return;
  await db
    .delete(schema.subplanerVergaben)
    .where(eq(schema.subplanerVergaben.id, id));
  revalidatePath(`/projekte/${sp.projektId}/subplaner`);
  redirect(`/projekte/${sp.projektId}/subplaner`);
}
