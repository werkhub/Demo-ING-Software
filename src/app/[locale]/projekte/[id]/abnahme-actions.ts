"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import {
  abnahmeMangelSchema,
  formDataToObject,
} from "@/lib/validation/schemas";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Erfasst einen Abnahme-Mangel als Vorgang `category="maengelruege"` mit Link
 * zum Projekt. Die zentrale Vorgangs-Engine kümmert sich um Risk-Score,
 * Audit-Eintrag und Pflicht-Citation auf § 13 Abs. 5 VOB/B.
 */
export async function createAbnahmeMangelVorgang(formData: FormData): Promise<void> {
  const parsed = abnahmeMangelSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const { projectId, description } = parsed.data;

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [project] = await db
    .select({ id: schema.projects.id, status: schema.projects.status })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) throw new Error("Projekt nicht gefunden.");

  const snippet = description.replace(/\s+/g, " ").slice(0, 80).trim();
  const title = `Abnahme-Mangel: ${snippet}${description.length > 80 ? "…" : ""}`;

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "ruege_analyse",
    title,
    category: "maengelruege",
    projectId,
    // Abnahme-Mängel: 14 Tage Bearbeitungs-/Antwortfrist intern.
    dueDate: isoDateInDays(14),
    firstStep: {
      kind: "klassifikation",
      payload: {
        anlass: "abnahme",
        description,
        projectStatusAtCreation: project.status,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 13 Abs. 5 VOB/B",
          sourceText:
            "Mängelbeseitigung — angemessene Frist setzen, ansonsten Selbstvornahme zulässig.",
        },
        {
          sourceKind: "bgb",
          sourceRef: "§ 640 BGB",
          sourceText:
            "Bei Abnahme dokumentierte Mängel sind Vorbehalt — keine Beweislast-Umkehr beim Auftraggeber.",
        },
      ],
    },
    citations: [
      {
        sourceKind: "vob",
        sourceRef: "§ 13 Abs. 5 VOB/B",
        sourceText:
          "Mängelbeseitigung — angemessene Frist setzen, ansonsten Selbstvornahme zulässig.",
      },
    ],
    link: { targetKind: "project", targetId: projectId },
    auditPayload: { anlass: "abnahme", description: description.slice(0, 200) },
  });

  revalidatePath(`/projekte/${projectId}`);
  revalidatePath("/vorgaenge");
  redirect(`/vorgaenge/${vorgangId}`);
}
