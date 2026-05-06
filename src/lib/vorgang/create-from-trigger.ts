// "server-only" bewusst weg — wird auch vom Cron-CLI (tsx) ohne Next-Bundling
// aufgerufen. Client-Bundling-Schutz greift trotzdem über die transitiven
// DB-Imports (better-sqlite3 ist Node-only, Bundler wirft hart).
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { computeVorgangRiskScore } from "./risk-score";
import type {
  VorgangAnalysisKind,
  VorgangCategory,
  VorgangCitationKind,
  VorgangLinkKind,
} from "@/db/schema";

/**
 * Findet einen offenen Vorgang im Workspace, der bereits auf das angegebene
 * Ziel verlinkt ist. „Offen" = Status ≠ abgeschlossen/archiviert. Wird zur
 * Idempotenz-Sicherung in den Trigger-Actions verwendet — mehrfaches Klicken
 * auf „In Vorgang überführen" soll nicht zu Vorgang-Duplikaten führen.
 *
 * Gibt die ID des ersten gefundenen Treffers zurück (oder null).
 */
export async function findOpenVorgangByLink(opts: {
  workspaceId: string;
  targetKind: VorgangLinkKind;
  targetId: string;
}): Promise<string | null> {
  const candidates = await db
    .select({ vorgangId: schema.vorgangLinks.vorgangId })
    .from(schema.vorgangLinks)
    .where(
      and(
        eq(schema.vorgangLinks.targetKind, opts.targetKind),
        eq(schema.vorgangLinks.targetId, opts.targetId)
      )
    );
  if (candidates.length === 0) return null;
  const ids = candidates.map((c) => c.vorgangId);
  const open = await db
    .select({ id: schema.vorgaenge.id })
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.workspaceId, opts.workspaceId),
        inArray(schema.vorgaenge.id, ids),
        ne(schema.vorgaenge.status, "abgeschlossen"),
        ne(schema.vorgaenge.status, "archiviert")
      )
    )
    .limit(1);
  return open[0]?.id ?? null;
}

/**
 * Quelle, aus der ein Vorgang automatisch erzeugt wurde — wandert in den
 * Audit-Log ("auto_created_from_<source>") und in den ersten Analyse-Step.
 * Halten wir bewusst eng, damit jede neue Trigger-Quelle bewusst ergänzt
 * werden muss.
 */
export type VorgangTriggerSource =
  | "bautagebuch"
  | "ruege_analyse"
  | "vergabe_analyse"
  | "abschlagspruefung"
  | "vertrags_scan"
  | "nu_pass_through"
  | "nu_compliance"
  | "sicherheit_ueberfaellig"
  | "bha_zugangsfrist"
  | "vertragsstrafe_vorbehalt_fehlt"
  | "abnahmemangel_ueberfaellig"
  | "mangel_frist_ueberzogen"
  | "gewaehrleistung_endet_60d"
  | "sicherheit_inanspruchnahme_pruefen"
  | "hinschg_eingangsbestaetigung"
  | "hinschg_dreimonats_frist"
  | "rechnung_anomalie"
  | "stunden_woche_unverbucht"
  | "stunden_unplausibel"
  | "witterungsbehinderung_anzeige"
  | "plan_freigegeben"
  | "plan_freigabe_stockt"
  | "uvv_pruefung_faellig"
  | "mietruecksgabe_faellig"
  | "freistellung_laeuft_aus"
  | "bauabzug_anmeldung_finanzamt"
  | "nu_auftrag_ohne_freistellung"
  | "nu_sicherheit_faellig"
  | "nu_rechnung_abweichung_pruefen"
  | "material_rechnung_abweichung"
  | "material_lieferschein_pruefen_ueberfaellig"
  | "liquiditaet_eng";

export type TriggerCitationInput = {
  sourceKind: VorgangCitationKind;
  sourceRef: string;
  sourceText?: string | null;
};

export type TriggerStepInput = {
  kind: VorgangAnalysisKind;
  payload: Record<string, unknown>;
  citations?: TriggerCitationInput[];
};

export type TriggerDraftInput = {
  recipientEmail?: string | null;
  subject: string;
  bodyMarkdown: string;
};

export type CreateVorgangFromTriggerOpts = {
  workspaceId: string;
  userId: string | null;
  source: VorgangTriggerSource;
  title: string;
  category: VorgangCategory;
  projectId?: string | null;
  /** Interne Bearbeitungsfrist YYYY-MM-DD; bei null wird kein Default gesetzt. */
  dueDate?: string | null;
  /** Erster AnalysisStep — typischerweise das Klassifikations-/Befund-Payload aus dem Werkzeug. */
  firstStep?: TriggerStepInput;
  /** Zusätzliche Top-Level-Citations (separat von Step-Citations). */
  citations?: TriggerCitationInput[];
  /** Optionaler Antwort-Entwurf, den das Werkzeug schon vorbereitet hat. */
  draft?: TriggerDraftInput;
  /** Optionale Verlinkung zu einer Quell-Entität (z. B. Bautagebuch-Eintrag). */
  link?: { targetKind: VorgangLinkKind; targetId: string };
  /** Frei-Form-Payload, das in den Audit-Log fließt. */
  auditPayload?: Record<string, unknown>;
};

/**
 * Zentrale Vorgangs-Erzeugungs-Pipeline aus einem Werkzeug-Trigger.
 *
 * Verantwortlich für: Vorgang anlegen, Risk-Score berechnen, Audit-Eintrag
 * "auto_created_from_<source>", optional ersten AnalysisStep, optional Citations,
 * optional Draft, optional VorgangLink. Server-only — wird aus den jeweiligen
 * Server-Actions (Bautagebuch, Rüge, Vertrag, NU, Rechnung) aufgerufen.
 */
export async function createVorgangFromTrigger(
  opts: CreateVorgangFromTriggerOpts
): Promise<{ vorgangId: string }> {
  const id = genId("vg");
  const citations = opts.citations ?? [];
  const stepCitations = opts.firstStep?.citations ?? [];
  const totalCitationCount = citations.length + stepCitations.length;

  await db.insert(schema.vorgaenge).values({
    id,
    workspaceId: opts.workspaceId,
    projectId: opts.projectId ?? null,
    title: opts.title,
    category: opts.category,
    status: "offen",
    dueDate: opts.dueDate ?? null,
    createdBy: opts.userId,
    riskScore: computeVorgangRiskScore({
      category: opts.category,
      status: "offen",
      dueDate: opts.dueDate ?? null,
      citationCount: totalCitationCount,
      documentCount: 0,
    }),
  });

  if (opts.firstStep) {
    await db.insert(schema.vorgangAnalysisSteps).values({
      id: genId("vs"),
      vorgangId: id,
      stepIndex: 0,
      kind: opts.firstStep.kind,
      payloadJson: JSON.stringify({
        source: opts.source,
        ...opts.firstStep.payload,
      }),
      citations: JSON.stringify(stepCitations),
    });
  }

  if (citations.length > 0) {
    await db.insert(schema.vorgangCitations).values(
      citations.map((c) => ({
        id: genId("vc"),
        vorgangId: id,
        sourceKind: c.sourceKind,
        sourceRef: c.sourceRef,
        sourceText: c.sourceText ?? null,
      }))
    );
  }

  if (opts.draft) {
    await db.insert(schema.vorgangDrafts).values({
      id: genId("vd"),
      vorgangId: id,
      kind: "email",
      recipientEmail: opts.draft.recipientEmail ?? null,
      subject: opts.draft.subject,
      bodyMarkdown: opts.draft.bodyMarkdown,
      status: "entwurf",
    });
  }

  if (opts.link) {
    await db
      .insert(schema.vorgangLinks)
      .values({
        id: genId("vl"),
        vorgangId: id,
        targetKind: opts.link.targetKind,
        targetId: opts.link.targetId,
      })
      .onConflictDoNothing();
  }

  await db.insert(schema.vorgangAuditLog).values({
    id: genId("au"),
    vorgangId: id,
    actorId: opts.userId,
    action: `auto_created_from_${opts.source}`,
    payloadJson: JSON.stringify({
      source: opts.source,
      title: opts.title,
      category: opts.category,
      ...(opts.auditPayload ?? {}),
    }),
  });

  return { vorgangId: id };
}
