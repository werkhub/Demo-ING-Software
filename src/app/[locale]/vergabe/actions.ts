"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { analyzeTender } from "@/lib/vergabe/analyze";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import {
  formDataToObject,
  vergabeTriggerSchema,
} from "@/lib/validation/schemas";

type ParsedFile = { name: string; sizeBytes: number; mimeType?: string };

function parseFilesJson(json: string | null): ParsedFile[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (f): f is ParsedFile =>
          !!f &&
          typeof f === "object" &&
          typeof (f as ParsedFile).name === "string" &&
          typeof (f as ParsedFile).sizeBytes === "number"
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Übernimmt eine Ausschreibungs-Analyse in einen neuen Vorgang.
 *
 * - Setzt internen Bearbeitungs-Termin auf 5 Tage vor erkannter Angebotsfrist
 *   (Default 14 Tage), damit das Team Vorlauf für Rückfragen / Kalkulation hat.
 * - Erster AnalysisStep enthält das vollständige Heuristik-Ergebnis als Payload.
 * - Pflicht-Citations auf VOB/A § 3 + § 16 EU greifen Bid-Wertung an.
 */
export async function createVorgangFromTender(formData: FormData): Promise<void> {
  const parsed = vergabeTriggerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const { url, text, filesJson, projectId } = parsed.data;

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

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

  const files = parseFilesJson(filesJson);
  const result = analyzeTender({ url, text, files });

  const vergabeNr = result.facts.find((f) => f.key === "vergabeNummer")?.value;
  const vergabestelle = result.facts.find((f) => f.key === "vergabestelle")?.value;
  const leistung = result.facts.find((f) => f.key === "leistung")?.value;

  const titlePart =
    leistung ??
    vergabestelle ??
    (text ? text.replace(/\s+/g, " ").slice(0, 80).trim() : null) ??
    (url ? url.slice(0, 80) : "Ausschreibung");
  const title = `Ausschreibung: ${titlePart}${vergabeNr ? ` · ${vergabeNr}` : ""}`;

  // Bearbeitungs-Frist: 5 Tage vor Angebotsabgabe — sonst Default 14 Tage.
  const angebotsfrist = result.deadlines.find(
    (d) => d.kind === "angebotsabgabe" && d.isoDate
  );
  let dueDate = isoDateInDays(14);
  if (angebotsfrist?.isoDate) {
    const submission = new Date(angebotsfrist.isoDate + "T00:00:00");
    submission.setDate(submission.getDate() - 5);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (submission > today) {
      dueDate = submission.toISOString().slice(0, 10);
    } else {
      dueDate = isoDateInDays(2);
    }
  }

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "vergabe_analyse",
    title,
    // Vergabe-Workflow ist eine Vertragspflicht (Angebot ist Vertragsangebot).
    category: "vertragspflicht",
    projectId: validatedProjectId,
    dueDate,
    firstStep: {
      kind: "klassifikation",
      payload: {
        url,
        platform: result.platform?.id ?? null,
        bidDecision: result.bid.decision,
        bidScore: result.bid.score,
        facts: result.facts,
        deadlines: result.deadlines,
        eligibility: result.eligibility,
        award: result.award,
        risks: result.risks,
        documentTypes: result.documentTypes,
        meta: result.meta,
        inputTextPreview: text ? text.slice(0, 1500) : null,
        attachedFiles: files,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 3 VOB/A · § 3 EU VOB/A",
          sourceText:
            "Verfahrensarten und Bekanntmachungspflichten — Grundlage für die Verfahrenswahl-Bewertung.",
        },
        {
          sourceKind: "vob",
          sourceRef: "§ 16 EU VOB/A Abs. 6",
          sourceText:
            "Zuschlag auf das wirtschaftlichste Angebot, im Bau i. d. R. niedrigster Preis.",
        },
      ],
    },
    citations: [
      {
        sourceKind: "vob",
        sourceRef: "§ 11 VOB/B",
        sourceText:
          "Vertragsstrafe — max. 5 % der Auftragssumme; höhere Klauseln sind unwirksam (BGH VII ZR 210/01).",
      },
      {
        sourceKind: "vob",
        sourceRef: "§ 17 VOB/B",
        sourceText:
          "Sicherheitsleistung — VEB / GLB üblich je 5 %, Bürgschaftslinie rechtzeitig prüfen.",
      },
    ],
    auditPayload: {
      url,
      platform: result.platform?.id ?? null,
      bidDecision: result.bid.decision,
      bidScore: result.bid.score,
      detectedDeadlines: result.deadlines.length,
      detectedRisks: result.risks.length,
      hasGaeb: result.meta.hasGaeb,
      fileCount: files.length,
    },
  });

  revalidatePath("/vergabe");
  revalidatePath("/vorgaenge");
  if (validatedProjectId) revalidatePath(`/projekte/${validatedProjectId}`);
  redirect(`/vorgaenge/${vorgangId}`);
}
