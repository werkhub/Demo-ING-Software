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

const inputSchema = z.object({
  projectId: z.string().min(1),
  anlass: z.enum([
    "maengelstreit",
    "aufmassstreit",
    "baufortschritt",
    "baumangel",
    "sonstiges",
  ]),
  fragestellung: z.string().trim().min(5, "Fragestellung erforderlich."),
  rechtsgrundlage: z.enum([
    "paragraph_485_zpo",
    "privatauftrag",
    "gerichtsbeauftragt",
    "sonstiges",
  ]),
  sachverstaendigerName: optionalString,
  sachverstaendigerOrganization: optionalString,
  sachverstaendigerEmail: optionalString,
  sachverstaendigerPhone: optionalString,
  beauftragtAm: optionalIsoDate,
  fristGutachten: optionalIsoDate,
  kostenGeschaetztEur: optionalCents,
  kostenTraeger: z
    .union([z.literal(""), z.enum(["ag", "an", "geteilt", "streit"])])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
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

export async function createSachverstaendiger(
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

  const id = genId("sv");
  try {
    await db.insert(schema.sachverstaendige).values({
      id,
      workspaceId,
      projectId: parsed.data.projectId,
      anlass: parsed.data.anlass,
      fragestellung: parsed.data.fragestellung,
      rechtsgrundlage: parsed.data.rechtsgrundlage,
      sachverstaendigerName: parsed.data.sachverstaendigerName,
      sachverstaendigerOrganization: parsed.data.sachverstaendigerOrganization,
      sachverstaendigerEmail: parsed.data.sachverstaendigerEmail,
      sachverstaendigerPhone: parsed.data.sachverstaendigerPhone,
      beauftragtAm: parsed.data.beauftragtAm,
      fristGutachten: parsed.data.fristGutachten,
      kostenGeschaetztCents: parsed.data.kostenGeschaetztEur,
      kostenTraeger: parsed.data.kostenTraeger,
      status: parsed.data.beauftragtAm ? "beauftragt" : "angefragt",
      notes: parsed.data.notes,
    });
  } catch {
    return fail("Sachverständigen-Akte konnte nicht gespeichert werden.");
  }

  revalidatePath(`/projekte/${parsed.data.projectId}/sachverstaendige`);
  return ok({ id });
}

export async function updateSachverstaendigenStatus(
  formData: FormData
): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const ergebnisZusammenfassung = String(
    formData.get("ergebnisZusammenfassung") ?? ""
  ).trim();
  const allowed = [
    "angefragt",
    "beauftragt",
    "gutachten_erhalten",
    "geschlossen",
  ];
  if (!id || !allowed.includes(status)) throw new Error("Ungültiger Status.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.sachverstaendige.projectId })
    .from(schema.sachverstaendige)
    .where(
      and(
        eq(schema.sachverstaendige.id, id),
        eq(schema.sachverstaendige.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!current) throw new Error("Sachverständigen-Akte nicht gefunden.");

  await db
    .update(schema.sachverstaendige)
    .set({
      status: status as typeof schema.sachverstaendige.$inferInsert.status,
      ergebnisZusammenfassung:
        ergebnisZusammenfassung.length > 0 ? ergebnisZusammenfassung : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.sachverstaendige.id, id),
        eq(schema.sachverstaendige.workspaceId, workspaceId)
      )
    );

  revalidatePath(`/projekte/${current.projectId}/sachverstaendige`);
}

export async function deleteSachverstaendiger(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();
  const [current] = await db
    .select({ projectId: schema.sachverstaendige.projectId })
    .from(schema.sachverstaendige)
    .where(
      and(
        eq(schema.sachverstaendige.id, id),
        eq(schema.sachverstaendige.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.sachverstaendige)
    .where(
      and(
        eq(schema.sachverstaendige.id, id),
        eq(schema.sachverstaendige.workspaceId, workspaceId)
      )
    );

  if (current?.projectId) {
    revalidatePath(`/projekte/${current.projectId}/sachverstaendige`);
  }
}
