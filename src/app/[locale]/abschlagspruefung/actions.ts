"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import type {
  AbschlagInput,
  AbschlagCheckResult,
} from "@/lib/abschlag/types";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

type ParseResult = {
  workspaceId: string;
  userId: string;
  projectId: string | null;
  subcontractorId: string | null;
  input: AbschlagInput;
  result: AbschlagCheckResult;
  source: "manual" | "pdf" | "sample";
  sourceFilename: string | null;
};

async function parseFormData(formData: FormData): Promise<ParseResult> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const inputJson = String(formData.get("inputJson") ?? "");
  const resultJson = String(formData.get("resultJson") ?? "");
  if (!inputJson || !resultJson) throw new Error("inputJson / resultJson fehlt.");

  let input: AbschlagInput;
  let result: AbschlagCheckResult;
  try {
    input = JSON.parse(inputJson) as AbschlagInput;
    result = JSON.parse(resultJson) as AbschlagCheckResult;
  } catch {
    throw new Error("Ungültiges JSON in inputJson / resultJson.");
  }

  // Plausibilität minimal absichern
  if (!input.lieferant || !input.rechnungsNr) {
    throw new Error("Lieferant und Rechnungs-Nr. sind Pflicht.");
  }
  if (!Array.isArray(input.positionen)) {
    throw new Error("positionen muss ein Array sein.");
  }

  // Projekt/Lieferant gegen Workspace prüfen
  const projectIdRaw = String(formData.get("projectId") ?? "").trim();
  let projectId: string | null = null;
  if (projectIdRaw) {
    const [proj] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectIdRaw),
          eq(schema.projects.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!proj) throw new Error("Projekt nicht gefunden.");
    projectId = proj.id;
  }

  const subcontractorIdRaw = String(formData.get("subcontractorId") ?? "").trim();
  let subcontractorId: string | null = null;
  if (subcontractorIdRaw) {
    const [nu] = await db
      .select({ id: schema.subcontractors.id })
      .from(schema.subcontractors)
      .where(
        and(
          eq(schema.subcontractors.id, subcontractorIdRaw),
          eq(schema.subcontractors.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!nu) throw new Error("Nachunternehmer nicht gefunden.");
    subcontractorId = nu.id;
  }

  const sourceRaw = String(formData.get("source") ?? "manual");
  const source: "manual" | "pdf" | "sample" =
    sourceRaw === "pdf" || sourceRaw === "sample" ? sourceRaw : "manual";
  const sourceFilenameRaw = String(formData.get("sourceFilename") ?? "").trim();
  const sourceFilename = sourceFilenameRaw || null;

  return {
    workspaceId,
    userId,
    projectId,
    subcontractorId,
    input,
    result,
    source,
    sourceFilename,
  };
}

/** Persistiert eine Prüfung (Eingabe + Ergebnis). Redirected nicht. */
export async function savePruefung(formData: FormData): Promise<void> {
  const p = await parseFormData(formData);
  await db.insert(schema.abschlagspruefungen).values({
    id: genId("ap"),
    workspaceId: p.workspaceId,
    projectId: p.projectId,
    subcontractorId: p.subcontractorId,
    lieferant: p.input.lieferant,
    rechnungsNr: p.input.rechnungsNr,
    rechnungsdatum: p.input.rechnungsdatum,
    abschlagNo: p.input.abschlagNr,
    rechnungBruttoEur: p.result.rechnungBrutto,
    empfohleneZahlungBruttoEur: p.result.empfohleneZahlungBrutto,
    empfohleneKuerzungEur: p.result.empfohleneKuerzungBrutto,
    score: p.result.score,
    findingsCount: p.result.findings.length,
    decision: p.result.decision,
    status: "geprueft",
    positionsJson: JSON.stringify(p.input.positionen),
    findingsJson: JSON.stringify(p.result.findings),
    letterDraftMarkdown: p.result.letterDraftMarkdown,
    source: p.source,
    sourceFilename: p.sourceFilename,
    createdBy: p.userId,
  });
  revalidatePath("/abschlagspruefung");
}

/**
 * Persistiert + erzeugt einen Vorgang mit Citations und Antwort-Entwurf.
 * Redirected anschließend in den Vorgang.
 */
export async function createVorgangFromPruefung(formData: FormData): Promise<void> {
  const p = await parseFormData(formData);

  const id = genId("ap");
  await db.insert(schema.abschlagspruefungen).values({
    id,
    workspaceId: p.workspaceId,
    projectId: p.projectId,
    subcontractorId: p.subcontractorId,
    lieferant: p.input.lieferant,
    rechnungsNr: p.input.rechnungsNr,
    rechnungsdatum: p.input.rechnungsdatum,
    abschlagNo: p.input.abschlagNr,
    rechnungBruttoEur: p.result.rechnungBrutto,
    empfohleneZahlungBruttoEur: p.result.empfohleneZahlungBrutto,
    empfohleneKuerzungEur: p.result.empfohleneKuerzungBrutto,
    score: p.result.score,
    findingsCount: p.result.findings.length,
    decision: p.result.decision,
    status: "geprueft",
    positionsJson: JSON.stringify(p.input.positionen),
    findingsJson: JSON.stringify(p.result.findings),
    letterDraftMarkdown: p.result.letterDraftMarkdown,
    source: p.source,
    sourceFilename: p.sourceFilename,
    createdBy: p.userId,
  });

  // Vorgang anlegen — Bearbeitungsfrist 7 Tage (vor Ende der § 16 21-Tage-Frist
  // liegt die interne Bearbeitung).
  const due = new Date();
  due.setDate(due.getDate() + 7);

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId: p.workspaceId,
    userId: p.userId,
    source: "abschlagspruefung",
    title: `Abschlagsprüfung: ${p.input.lieferant} · Nr. ${p.input.rechnungsNr} (${p.input.abschlagNr}. Abschlag)`,
    category: "vertragspflicht",
    projectId: p.projectId,
    dueDate: due.toISOString().slice(0, 10),
    firstStep: {
      kind: "klassifikation",
      payload: {
        decision: p.result.decision,
        score: p.result.score,
        rechnungBrutto: p.result.rechnungBrutto,
        empfohleneZahlungBrutto: p.result.empfohleneZahlungBrutto,
        empfohleneKuerzungBrutto: p.result.empfohleneKuerzungBrutto,
        sicherheitseinbehaltEur: p.result.sicherheitseinbehaltEur,
        bauabzugsEinbehaltEur: p.result.bauabzugsEinbehaltEur,
        findingsByCategory: countByCategory(p.result.findings),
        positionen: p.input.positionen.length,
        abschlagspruefungId: id,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: "§ 16 Abs. 1 VOB/B",
          sourceText:
            "Abschlagszahlungen werden binnen 21 Tagen nach Eingang einer prüfbaren Aufstellung fällig.",
        },
        {
          sourceKind: "vob",
          sourceRef: "§ 14 Abs. 2 VOB/B",
          sourceText:
            "Aufmaßbasierte Abrechnung — Mengen müssen durch Aufmaßprotokoll belegt sein.",
        },
      ],
    },
    citations: [
      {
        sourceKind: "vob",
        sourceRef: "§ 17 VOB/B",
        sourceText:
          "Sicherheitsleistung — VEB / GLB i. d. R. je 5 %; Klauseln über 5 % regelmäßig unwirksam.",
      },
      {
        sourceKind: "intern",
        sourceRef: "§ 13b UStG",
        sourceText:
          "Bauleistungen unter Bauunternehmern — Reverse-Charge: Rechnung ohne USt.",
      },
      {
        sourceKind: "intern",
        sourceRef: "§ 48 EStG",
        sourceText:
          "Bauabzugssteuer — 15 % Einbehalt bei Bauleistung ohne Freistellungsbescheinigung.",
      },
    ],
    draft: {
      recipientEmail: null,
      subject: `Prüfung Abschlagsrechnung Nr. ${p.input.rechnungsNr} (${p.input.abschlagNr}. Abschlag)`,
      bodyMarkdown: p.result.letterDraftMarkdown,
    },
    auditPayload: {
      abschlagspruefungId: id,
      decision: p.result.decision,
      score: p.result.score,
      kuerzungBrutto: p.result.empfohleneKuerzungBrutto,
      auszahlungBrutto: p.result.empfohleneZahlungBrutto,
    },
  });

  revalidatePath("/abschlagspruefung");
  revalidatePath("/vorgaenge");
  if (p.projectId) revalidatePath(`/projekte/${p.projectId}`);
  redirect(`/vorgaenge/${vorgangId}?tab=entwurf`);
}

function countByCategory(
  findings: AbschlagCheckResult["findings"]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) out[f.category] = (out[f.category] ?? 0) + 1;
  return out;
}

/* =============================================================================
 * Projekt-Kontext-Loader — wird vom Client beim Wechsel von Projekt/NU
 * aufgerufen, um Stammdaten + LV + Aufmaß-Aggregate + bisher gezahlte
 * Abschläge in einem Roundtrip zu liefern.
 * ============================================================================= */

export type ProjectContextLvPosition = {
  oz: string;
  beschreibung: string;
  einheit: string;
  menge: number; // LV-Soll-Menge
  einheitspreis: number;
};

export type ProjectContextResult = {
  /** Kontext-Status — bleibt definiert auch wenn projectId leer war. */
  loaded: boolean;
  project: {
    value: number | null; // Auftragssumme netto
    securityRetentionPercent: number | null;
    penaltyClauseAgreed: boolean | null;
  } | null;
  lvPositionen: ProjectContextLvPosition[];
  /** OZ → kumulierte Aufmaß-Ist-Menge (über alle Aufmaße des Projekts). */
  aufmassMengenByOz: Record<string, number>;
  /** Bisher freigegebene Eingangsrechnungen für dieses Projekt + ggf. NU. */
  bisherGezahltBrutto: number;
  bisherigeAbschlaegeAnzahl: number;
  /** Hinweis-Texte für das UI ("12 LV-Positionen geladen", …). */
  hints: string[];
};

const EMPTY_CONTEXT: ProjectContextResult = {
  loaded: false,
  project: null,
  lvPositionen: [],
  aufmassMengenByOz: {},
  bisherGezahltBrutto: 0,
  bisherigeAbschlaegeAnzahl: 0,
  hints: [],
};

export async function loadAbschlagProjectContext(
  projectId: string,
  subcontractorId: string | null
): Promise<ProjectContextResult> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!projectId) return EMPTY_CONTEXT;

  // 1. Projekt-Eckdaten verifizieren + laden
  const [proj] = await db
    .select({
      id: schema.projects.id,
      value: schema.projects.value,
      securityRetentionPercent: schema.projects.securityRetentionPercent,
      penaltyClauseAgreed: schema.projects.penaltyClauseAgreed,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!proj) return EMPTY_CONTEXT;

  // 2. LV-Items (nur echte Positionen, keine Titel/Untertitel)
  const [lvRow] = await db
    .select({ id: schema.lv.id })
    .from(schema.lv)
    .where(
      and(
        eq(schema.lv.workspaceId, workspaceId),
        eq(schema.lv.projectId, projectId)
      )
    )
    .limit(1);

  type LvPos = ProjectContextLvPosition & { lvItemId: string };
  const lvPositionen: LvPos[] = lvRow
    ? (
        await db
          .select({
            id: schema.lvItems.id,
            oz: schema.lvItems.oz,
            shortText: schema.lvItems.shortText,
            unit: schema.lvItems.unit,
            quantity: schema.lvItems.quantity,
            unitPrice: schema.lvItems.unitPrice,
            kind: schema.lvItems.kind,
            sortIndex: schema.lvItems.sortIndex,
          })
          .from(schema.lvItems)
          .where(
            and(
              eq(schema.lvItems.workspaceId, workspaceId),
              eq(schema.lvItems.lvId, lvRow.id),
              inArray(schema.lvItems.kind, [
                "position",
                "eventual",
                "bedarfsposition",
              ])
            )
          )
          .orderBy(schema.lvItems.sortIndex)
      )
        .filter((r) => r.oz && r.unit && r.quantity != null && r.unitPrice != null)
        .map((r) => ({
          lvItemId: r.id,
          oz: r.oz!,
          beschreibung: r.shortText,
          einheit: r.unit!,
          menge: r.quantity!,
          einheitspreis: r.unitPrice!,
        }))
    : [];

  // 3. Aufmaß-Aggregat: pro OZ die Summe der computedQuantity (oder
  //    approvedQuantity wenn vorhanden) über alle Aufmaße des Projekts.
  const aufmassMengenByOz: Record<string, number> = {};
  if (lvRow) {
    const lvItemIdToOz: Record<string, string> = {};
    for (const p of lvPositionen) lvItemIdToOz[p.lvItemId] = p.oz;

    const zeilen = await db
      .select({
        lvItemId: schema.aufmassZeilen.lvItemId,
        ozOverride: schema.aufmassZeilen.ozOverride,
        approvedQuantity: schema.aufmassZeilen.approvedQuantity,
        computedQuantity: schema.aufmassZeilen.computedQuantity,
        status: schema.aufmassZeilen.status,
      })
      .from(schema.aufmassZeilen)
      .innerJoin(
        schema.aufmass,
        eq(schema.aufmassZeilen.aufmassId, schema.aufmass.id)
      )
      .where(
        and(
          eq(schema.aufmass.workspaceId, workspaceId),
          eq(schema.aufmass.projectId, projectId)
        )
      );

    for (const z of zeilen) {
      const oz =
        z.ozOverride ??
        (z.lvItemId ? lvItemIdToOz[z.lvItemId] ?? null : null);
      if (!oz) continue;
      const menge = z.approvedQuantity ?? z.computedQuantity;
      if (menge == null) continue;
      aufmassMengenByOz[oz] = (aufmassMengenByOz[oz] ?? 0) + menge;
    }
  }

  // 4. Bisher gezahlte Abschläge brutto (freigegebene Eingangsrechnungen
  //    für dieses Projekt; wenn NU gewählt: zusätzlich nach NU filtern).
  const whereClauses = [
    eq(schema.rechnungen.workspaceId, workspaceId),
    eq(schema.rechnungen.projectId, projectId),
    eq(schema.rechnungen.status, "freigegeben"),
  ];
  if (subcontractorId) {
    whereClauses.push(eq(schema.rechnungen.subcontractorId, subcontractorId));
  }
  const [agg] = await db
    .select({
      summe: sql<number>`coalesce(sum(${schema.rechnungen.totalGross}), 0)`.as(
        "summe"
      ),
      anzahl: sql<number>`count(*)`.as("anzahl"),
    })
    .from(schema.rechnungen)
    .where(and(...whereClauses));

  const bisherGezahltBrutto = Number(agg?.summe ?? 0);
  const bisherigeAbschlaegeAnzahl = Number(agg?.anzahl ?? 0);

  // 5. UI-Hints
  const hints: string[] = [];
  if (lvPositionen.length > 0) hints.push(`${lvPositionen.length} LV-Positionen geladen`);
  const aufmassCount = Object.keys(aufmassMengenByOz).length;
  if (aufmassCount > 0) hints.push(`${aufmassCount} OZ mit Aufmaß-Ist`);
  if (bisherigeAbschlaegeAnzahl > 0) {
    hints.push(
      `${bisherigeAbschlaegeAnzahl} freigegebene Vorrechnung${bisherigeAbschlaegeAnzahl === 1 ? "" : "en"}`
    );
  }
  if (proj.value) hints.push(`Auftragssumme ${(proj.value / 1000).toFixed(0)} k €`);

  return {
    loaded: true,
    project: {
      value: proj.value,
      securityRetentionPercent: proj.securityRetentionPercent,
      penaltyClauseAgreed: proj.penaltyClauseAgreed,
    },
    lvPositionen: lvPositionen.map(({ lvItemId: _, ...rest }) => rest),
    aufmassMengenByOz,
    bisherGezahltBrutto,
    bisherigeAbschlaegeAnzahl,
    hints,
  };
}
