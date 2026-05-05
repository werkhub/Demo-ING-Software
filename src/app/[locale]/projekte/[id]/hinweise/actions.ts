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

const optionalCents = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  });

const hinweisInputSchema = z.object({
  projectId: z.string().min(1),
  anlass: z.enum([
    "kostensteigerung",
    "planungsaenderung",
    "materialwahl",
    "risiko",
    "terminverzug",
    "sonstiges",
  ]),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  empfaengerName: z.string().trim().min(1, "Empfänger erforderlich."),
  empfaengerRolle: optionalString,
  form: z.enum(["muendlich", "schriftlich", "email"]),
  wortlaut: z.string().trim().min(5, "Mindestens 5 Zeichen."),
  potentialKostenwirkungEur: optionalCents,
  agReaktion: z
    .enum(["keine", "akzeptiert", "abgelehnt", "in_bearbeitung"])
    .default("keine"),
  agReaktionDatum: optionalIsoDate,
  agReaktionText: optionalString,
  notes: optionalString,
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

export async function createHinweis(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = hinweisInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!(await ensureProject(workspaceId, parsed.data.projectId))) {
    return fail("Projekt nicht gefunden.");
  }

  const id = genId("hw");
  try {
    await db.insert(schema.hinweise).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      anlass: parsed.data.anlass,
      datum: parsed.data.datum,
      empfaengerName: parsed.data.empfaengerName,
      empfaengerRolle: parsed.data.empfaengerRolle,
      form: parsed.data.form,
      wortlaut: parsed.data.wortlaut,
      potentialKostenwirkungCents: parsed.data.potentialKostenwirkungEur,
      agReaktion: parsed.data.agReaktion,
      agReaktionDatum: parsed.data.agReaktionDatum,
      agReaktionText: parsed.data.agReaktionText,
      status: "erteilt",
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Hinweis konnte nicht gespeichert werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/hinweise`);
  revalidatePath(`/projekte/${parsed.data.projectId}`);
  return ok({ id });
}

export async function updateHinweisStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const allowed = ["entwurf", "erteilt", "nachverfolgt", "geschlossen"];
  if (!id || !allowed.includes(status)) throw new Error("Ungültiger Status.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.hinweise.projectId })
    .from(schema.hinweise)
    .where(
      and(
        eq(schema.hinweise.id, id),
        eq(schema.hinweise.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("Hinweis nicht gefunden.");

  await db
    .update(schema.hinweise)
    .set({
      status: status as typeof schema.hinweise.$inferInsert.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.hinweise.id, id),
        eq(schema.hinweise.workspaceId, workspaceId)
      )
    );

  revalidatePath(`/projekte/${current.projectId}/hinweise`);
}

export async function updateHinweisAgReaktion(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const agReaktion = String(formData.get("agReaktion") ?? "").trim();
  const agReaktionDatum = String(formData.get("agReaktionDatum") ?? "").trim();
  const agReaktionText = String(formData.get("agReaktionText") ?? "").trim();
  const allowed = ["keine", "akzeptiert", "abgelehnt", "in_bearbeitung"];
  if (!id || !allowed.includes(agReaktion))
    throw new Error("Ungültige AG-Reaktion.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.hinweise.projectId })
    .from(schema.hinweise)
    .where(
      and(
        eq(schema.hinweise.id, id),
        eq(schema.hinweise.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("Hinweis nicht gefunden.");

  await db
    .update(schema.hinweise)
    .set({
      agReaktion: agReaktion as typeof schema.hinweise.$inferInsert.agReaktion,
      agReaktionDatum: agReaktionDatum.length > 0 ? agReaktionDatum : null,
      agReaktionText: agReaktionText.length > 0 ? agReaktionText : null,
      status: agReaktion === "keine" ? "erteilt" : "nachverfolgt",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.hinweise.id, id),
        eq(schema.hinweise.workspaceId, workspaceId)
      )
    );

  revalidatePath(`/projekte/${current.projectId}/hinweise`);
}

export async function deleteHinweis(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.hinweise.projectId })
    .from(schema.hinweise)
    .where(
      and(
        eq(schema.hinweise.id, id),
        eq(schema.hinweise.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.hinweise)
    .where(
      and(
        eq(schema.hinweise.id, id),
        eq(schema.hinweise.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}/hinweise`);
  }
}
