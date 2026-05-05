"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { analyzeRuege } from "@/lib/ruege-analyze";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import {
  formDataToObject,
  ruegeTriggerSchema,
} from "@/lib/validation/schemas";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Übernimmt einen analysierten Rüge-Text in einen Vorgang inkl. erstem
 * Analyse-Step (Heuristik-Result), Pflicht-Citation auf § 13 Abs. 5 VOB/B
 * und vorbereitetem Antwort-Entwurf.
 */
export async function createVorgangFromRuege(formData: FormData): Promise<void> {
  const parsed = ruegeTriggerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const { text, projectId, recipientEmail } = parsed.data;

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  // Wenn ein projectId angegeben ist, prüfen dass es im Workspace liegt
  let validatedProjectId: string | null = null;
  if (projectId) {
    const [proj] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!proj) throw new Error("Projekt nicht gefunden.");
    validatedProjectId = proj.id;
  }

  const result = analyzeRuege(text);

  const snippet = text.replace(/\s+/g, " ").slice(0, 80).trim();
  const title = `Mängelrüge: ${snippet}${text.length > 80 ? "…" : ""}`;

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "ruege_analyse",
    title,
    category: "maengelruege",
    projectId: validatedProjectId,
    // Bearbeitungsfrist: bei unangemessen kurzer Frist sofortige Reaktion
    dueDate: isoDateInDays(result.fristAngemessen === false ? 3 : 7),
    firstStep: {
      kind: "klassifikation",
      payload: {
        formellPass: result.formellPass,
        materiellLikely: result.materiellLikely,
        fristTage: result.fristTage,
        fristAngemessen: result.fristAngemessen,
        checks: result.checks,
        riskScore: result.riskScore,
        inputTextPreview: text.slice(0, 1000),
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 13 Abs. 5 VOB/B",
          sourceText:
            "Mängelbeseitigungs-Verlangen — angemessene Frist setzen, ansonsten Selbstvornahme zulässig.",
        },
        {
          sourceKind: "urteil",
          sourceRef: "BGH VII ZR 13/16",
          sourceText:
            "Frist von weniger als 10 Werktagen für Putz-Nachbesserung regelmäßig unangemessen kurz.",
        },
      ],
    },
    citations: [
      {
        sourceKind: "vob",
        sourceRef: "§ 13 Abs. 5 VOB/B",
        sourceText:
          "Mängelbeseitigungs-Verlangen — angemessene Frist setzen, ansonsten Selbstvornahme zulässig.",
      },
    ],
    draft: {
      recipientEmail,
      subject: "Antwort auf Ihre Mängelrüge — Beweissicherung",
      bodyMarkdown: result.responseDraft,
    },
    auditPayload: {
      formellPass: result.formellPass,
      materiellLikely: result.materiellLikely,
      heuristicRiskScore: result.riskScore,
    },
  });

  revalidatePath("/ruege-analyse");
  revalidatePath("/vorgaenge");
  if (validatedProjectId) revalidatePath(`/projekte/${validatedProjectId}`);
  redirect(`/vorgaenge/${vorgangId}?tab=entwurf`);
}
