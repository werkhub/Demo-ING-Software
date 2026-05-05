"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";

function isoDateOrNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseAllokation(v: FormDataEntryValue | null): number {
  if (typeof v !== "string" || !v.trim()) return 1;
  const n = Number(v.replace(",", "."));
  if (Number.isNaN(n) || n <= 0) return 1;
  if (n > 1) return 1;
  return Math.round(n * 100) / 100;
}

export async function createZuordnung(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();

  const mitarbeiterId = String(formData.get("mitarbeiterId") ?? "").trim();
  const projektId = String(formData.get("projektId") ?? "").trim();
  const rolle = String(formData.get("rolle") ?? "").trim() || null;
  const startDatum = isoDateOrNull(formData.get("startDatum"));
  const endDatum = isoDateOrNull(formData.get("endDatum"));
  const allokation = parseAllokation(formData.get("allokation"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!mitarbeiterId || !projektId) {
    redirect(
      `/personal/zuordnung?error=${encodeURIComponent("Mitarbeiter und Projekt müssen ausgewählt sein.")}`
    );
  }

  // Tenant-Check: beide Entities müssen im Workspace liegen.
  const [maRow] = await db
    .select({ id: schema.mitarbeiter.id })
    .from(schema.mitarbeiter)
    .where(
      and(
        eq(schema.mitarbeiter.id, mitarbeiterId),
        eq(schema.mitarbeiter.workspaceId, workspaceId)
      )
    )
    .limit(1);
  const [projRow] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!maRow || !projRow) {
    redirect(
      `/personal/zuordnung?error=${encodeURIComponent("Mitarbeiter oder Projekt nicht gefunden.")}`
    );
  }

  await db.insert(schema.mitarbeiterProjekte).values({
    id: genId("mapr"),
    workspaceId,
    mitarbeiterId,
    projektId,
    rolle,
    startDatum,
    endDatum,
    allokation,
    notes,
  });

  revalidatePath("/personal/zuordnung");
  revalidatePath("/personal");
  redirect("/personal/zuordnung?created=1");
}

export async function deleteZuordnung(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/personal/zuordnung");
  }

  await db
    .delete(schema.mitarbeiterProjekte)
    .where(
      and(
        eq(schema.mitarbeiterProjekte.id, id),
        eq(schema.mitarbeiterProjekte.workspaceId, workspaceId)
      )
    );

  revalidatePath("/personal/zuordnung");
  revalidatePath("/personal");
  redirect("/personal/zuordnung?deleted=1");
}
