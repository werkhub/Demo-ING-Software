/**
 * Anzeigen-Logik (BHA + Bedenken).
 *
 * Status-Workflow + Reminder-Schwellen + Default-Bodies. Pure Funktionen,
 * server- + client-tauglich.
 */
import type {
  Anzeige,
  AnzeigeCausedBy,
  AnzeigeConcernAbout,
  AnzeigeKind,
  AnzeigeRecipientRole,
  AnzeigeStatus,
} from "@/db/schema";

/** Vorlauf in Tagen, ab dem fehlende Zugangsbestätigung eskaliert. */
export const ACKNOWLEDGEMENT_WARN_DAYS = 14;

export const ANZEIGE_KIND_LABEL: Record<AnzeigeKind, string> = {
  behinderung: "Behinderungsanzeige",
  bedenken: "Bedenkenanmeldung",
};

export const ANZEIGE_KIND_SHORT: Record<AnzeigeKind, string> = {
  behinderung: "BHA",
  bedenken: "Bedenken",
};

export const ANZEIGE_LEGAL_BASIS: Record<AnzeigeKind, string> = {
  behinderung: "§ 6 Abs. 1 VOB/B",
  bedenken: "§ 4 Abs. 3 VOB/B",
};

export const ANZEIGE_STATUS_LABEL: Record<AnzeigeStatus, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  bestaetigt: "Bestätigt",
  zurueckgewiesen: "Zurückgewiesen",
  erledigt: "Erledigt",
};

export const RECIPIENT_ROLE_LABEL: Record<AnzeigeRecipientRole, string> = {
  ag_vertreter: "AG-Vertreter",
  bauleiter_ag: "Bauleiter (AG)",
  architekt: "Architekt",
  fachplaner: "Fachplaner",
  sonstiges: "Sonstiges",
};

export const CAUSED_BY_LABEL: Record<AnzeigeCausedBy, string> = {
  ag_anordnung: "AG-Anordnung",
  fehlende_plaene: "Fehlende Pläne / Vorgaben",
  vorgewerk: "Verzug Vorgewerk",
  hoehere_gewalt: "Höhere Gewalt",
  wetter: "Witterung",
  streik: "Streik / Aussperrung",
  sonstiges: "Sonstiges",
};

export const CONCERN_ABOUT_LABEL: Record<AnzeigeConcernAbout, string> = {
  ausfuehrungsart: "Vorgesehene Ausführungsart",
  bauseits_stoffe: "Bauseits gestellte Stoffe / Bauteile",
  vorleistung: "Vorleistung anderer Unternehmer",
  planvorgabe: "Planvorgabe / Detailausführung",
  sonstiges: "Sonstiges",
};

/* ============== STATUS-LOGIK ============== */

export type AnzeigeUiState =
  | "entwurf"
  | "versendet"
  | "wartet_zugang_ueberfaellig"
  | "bestaetigt"
  | "wartet_antwort"
  | "zurueckgewiesen"
  | "erledigt";

/** Tage seit ISO-Datum (positiv = Vergangenheit). */
function daysSince(iso: string | null, today: Date = new Date()): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  return Math.round(
    (todayMid.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Detaillierter UI-Status — feiner als das DB-Status-Enum, weil zusätzlich
 * „Zugang überfällig" und „wartet auf Antwort" als Sub-States erkennbar sind.
 */
export function uiState(
  anzeige: Pick<
    Anzeige,
    "status" | "sentAt" | "acknowledgedAt" | "responseReceivedAt"
  >,
  today: Date = new Date()
): AnzeigeUiState {
  if (anzeige.status === "entwurf") return "entwurf";
  if (anzeige.status === "zurueckgewiesen") return "zurueckgewiesen";
  if (anzeige.status === "erledigt") return "erledigt";
  if (anzeige.status === "bestaetigt") {
    if (!anzeige.responseReceivedAt) return "bestaetigt";
    return "bestaetigt"; // Antwort vorhanden — bleibt bestaetigt bis User auf erledigt setzt
  }
  // status === "versendet"
  if (anzeige.acknowledgedAt) return "bestaetigt";
  const sentDays = daysSince(anzeige.sentAt, today);
  if (sentDays !== null && sentDays > ACKNOWLEDGEMENT_WARN_DAYS) {
    return "wartet_zugang_ueberfaellig";
  }
  return "versendet";
}

export const UI_STATE_LABEL: Record<AnzeigeUiState, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet · wartet auf Zugang",
  wartet_zugang_ueberfaellig: "Zugangsbestätigung überfällig",
  bestaetigt: "Bestätigt",
  wartet_antwort: "Wartet auf Antwort",
  zurueckgewiesen: "Zurückgewiesen",
  erledigt: "Erledigt",
};

/* ============== TEMPLATES ============== */

type TemplateContext = {
  projectIdentifier: string;
  projectName: string;
  agName: string;
  authorName?: string | null;
  authorRole?: string | null;
};

/**
 * Erzeugt einen Default-Body für eine BHA. Liefert formellen Brieftext mit
 * Pflichtangaben nach § 6 Abs. 1 VOB/B; User editiert.
 */
export function defaultBhaBody(
  ctx: TemplateContext,
  causedBy: AnzeigeCausedBy | null,
  obstructionStart: string | null,
  estimatedDurationDays: number | null,
  estimatedExtraCost: number | null,
  subjectMatter: string
): string {
  const cause = causedBy ? CAUSED_BY_LABEL[causedBy] : "(Ursache angeben)";
  return [
    `**Behinderungsanzeige nach § 6 Abs. 1 VOB/B**`,
    ``,
    `Bauvorhaben: ${ctx.projectIdentifier} — ${ctx.projectName}`,
    `Auftraggeber: ${ctx.agName}`,
    ``,
    `Sehr geehrte Damen und Herren,`,
    ``,
    `hiermit zeigen wir Ihnen gemäß § 6 Abs. 1 VOB/B die nachstehende Behinderung der Bauausführung an.`,
    ``,
    `**Ursache:** ${cause}`,
    obstructionStart
      ? `**Beginn der Behinderung:** ${obstructionStart}`
      : `**Beginn der Behinderung:** (Datum eintragen)`,
    estimatedDurationDays !== null && estimatedDurationDays > 0
      ? `**Voraussichtliche Dauer:** ${estimatedDurationDays} Werktage`
      : `**Voraussichtliche Dauer:** noch nicht absehbar`,
    ``,
    `**Sachverhalt:**`,
    subjectMatter,
    ``,
    `Wir behalten uns ausdrücklich Mehrkosten und Bauzeitverlängerung gemäß § 6 Abs. 6 VOB/B vor.`,
    estimatedExtraCost !== null && estimatedExtraCost > 0
      ? `Erste Schätzung der Mehrkosten: ${estimatedExtraCost.toLocaleString("de-DE")} € netto.`
      : ``,
    ``,
    `Wir bitten um umgehende Klärung und um Bestätigung des Zugangs dieser Anzeige.`,
    ``,
    `Mit freundlichen Grüßen`,
    ctx.authorName
      ? `${ctx.authorName}${ctx.authorRole ? ` (${ctx.authorRole})` : ""}`
      : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/**
 * Default-Body für eine Bedenkenanmeldung nach § 4 Abs. 3 VOB/B.
 */
export function defaultBedenkenBody(
  ctx: TemplateContext,
  concernAbout: AnzeigeConcernAbout | null,
  subjectMatter: string,
  potentialDamage: string | null,
  proposedSolution: string | null
): string {
  const about = concernAbout
    ? CONCERN_ABOUT_LABEL[concernAbout]
    : "(Bedenken-Gegenstand angeben)";
  return [
    `**Bedenkenanmeldung nach § 4 Abs. 3 VOB/B**`,
    ``,
    `Bauvorhaben: ${ctx.projectIdentifier} — ${ctx.projectName}`,
    `Auftraggeber: ${ctx.agName}`,
    ``,
    `Sehr geehrte Damen und Herren,`,
    ``,
    `hiermit melden wir Ihnen gemäß § 4 Abs. 3 VOB/B Bedenken gegen ${about.toLowerCase()} an.`,
    ``,
    `**Sachverhalt:**`,
    subjectMatter,
    ``,
    potentialDamage
      ? `**Mögliche Folgen bei Beibehaltung der Vorgabe:**\n${potentialDamage}`
      : "",
    proposedSolution
      ? `**Lösungsvorschlag:**\n${proposedSolution}`
      : "",
    ``,
    `Wir bitten um schriftliche Stellungnahme. Bis zu Ihrer Entscheidung halten wir die betreffenden Arbeiten an, um eine Mängelhaftung zu vermeiden.`,
    ``,
    `Mit freundlichen Grüßen`,
    ctx.authorName
      ? `${ctx.authorName}${ctx.authorRole ? ` (${ctx.authorRole})` : ""}`
      : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function defaultBody(
  kind: AnzeigeKind,
  ctx: TemplateContext,
  data: {
    subjectMatter: string;
    causedBy?: AnzeigeCausedBy | null;
    obstructionStart?: string | null;
    estimatedDurationDays?: number | null;
    estimatedExtraCost?: number | null;
    concernAbout?: AnzeigeConcernAbout | null;
    potentialDamage?: string | null;
    proposedSolution?: string | null;
  }
): string {
  if (kind === "behinderung") {
    return defaultBhaBody(
      ctx,
      data.causedBy ?? null,
      data.obstructionStart ?? null,
      data.estimatedDurationDays ?? null,
      data.estimatedExtraCost ?? null,
      data.subjectMatter
    );
  }
  return defaultBedenkenBody(
    ctx,
    data.concernAbout ?? null,
    data.subjectMatter,
    data.potentialDamage ?? null,
    data.proposedSolution ?? null
  );
}
