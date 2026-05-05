/**
 * HinSchG-Logik (rein, ohne DB-Zugriffe).
 *
 * Fristen aus § 17 HinSchG:
 *   ACK_DEADLINE_DAYS  =  7 Tage  — Eingangsbestätigung
 *   RESPONSE_DEADLINE_DAYS = 90 Tage (3 Mon.)  — Rückmeldung über Maßnahmen
 *
 * Aufbewahrung § 11 HinSchG:
 *   RETENTION_YEARS   =  3 Jahre nach Abschluss
 */
import type {
  HinschgCategory,
  HinschgMeldung,
  HinschgStatus,
  HinschgUiState,
} from "@/db/schema";

export const ACK_DEADLINE_DAYS = 7;
export const RESPONSE_DEADLINE_DAYS = 90;
export const RETENTION_YEARS = 3;

export const CATEGORY_LABEL: Record<HinschgCategory, string> = {
  korruption: "Korruption / Bestechung",
  diskriminierung: "Diskriminierung / Mobbing",
  arbeitssicherheit: "Arbeitssicherheit",
  umwelt: "Umwelt / Emissionen",
  datenschutz: "Datenschutz",
  finanz: "Finanz / Buchhaltung",
  arbeitsrecht: "Arbeitsrecht / Lohn",
  sonstiges: "Sonstiges",
};

export const STATUS_LABEL: Record<HinschgStatus, string> = {
  eingegangen: "Eingegangen",
  in_pruefung: "In Prüfung",
  massnahme_ergriffen: "Maßnahme ergriffen",
  abgeschlossen: "Abgeschlossen",
  unbegruendet: "Unbegründet",
  archiviert: "Archiviert",
};

export const UI_STATE_LABEL: Record<HinschgUiState, string> = {
  neu: "Neu — Eingang bestätigen",
  ack_ueberfaellig: "Eingangsbestätigung überfällig",
  in_pruefung: "In Prüfung",
  antwort_ueberfaellig: "3-Monats-Frist überschritten",
  abgeschlossen: "Abgeschlossen",
  unbegruendet: "Unbegründet",
  archiviert: "Archiviert",
};

/** UUID v4 (RFC 4122) als Pseudonym-Token. */
export function generateAccessToken(): string {
  // Web-Crypto ist im Node-Runtime und in Edge-Runtime verfügbar.
  // crypto.randomUUID liefert eine v4 — ausreichend für Anonymitäts-Pseudonym.
  return crypto.randomUUID();
}

/** ISO-Date 90 Tage nach Eingang. */
export function computeResponseDeadline(submittedAt: Date): string {
  const d = new Date(submittedAt);
  d.setDate(d.getDate() + RESPONSE_DEADLINE_DAYS);
  return d.toISOString().slice(0, 10);
}

function daysSince(d: Date | null, today: Date = new Date()): number | null {
  if (!d) return null;
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round(
    (todayMid.getTime() - dMid.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function daysUntilIso(iso: string | null, today: Date = new Date()): number | null {
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
    (dt.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * UI-State (feiner als DB-Status) — bringt Eingangsbestätigung-Überfälligkeit
 * und 3-Monats-Frist-Überschreitung als eigene Sub-States hervor.
 */
export function uiState(
  m: Pick<
    HinschgMeldung,
    "status" | "submittedAt" | "acknowledgedAt" | "responseDeadline"
  >,
  today: Date = new Date()
): HinschgUiState {
  if (m.status === "abgeschlossen") return "abgeschlossen";
  if (m.status === "unbegruendet") return "unbegruendet";
  if (m.status === "archiviert") return "archiviert";

  const ackDays = daysSince(m.acknowledgedAt, today);
  const sinceSubmit = daysSince(m.submittedAt, today);
  const responseRemaining = daysUntilIso(m.responseDeadline, today);

  if (
    m.status === "eingegangen" &&
    ackDays === null &&
    sinceSubmit !== null &&
    sinceSubmit > ACK_DEADLINE_DAYS
  ) {
    return "ack_ueberfaellig";
  }

  if (
    (m.status === "in_pruefung" || m.status === "massnahme_ergriffen") &&
    responseRemaining !== null &&
    responseRemaining < 0
  ) {
    return "antwort_ueberfaellig";
  }

  if (m.status === "in_pruefung" || m.status === "massnahme_ergriffen") {
    return "in_pruefung";
  }
  return "neu";
}

export function ackDaysOverdue(
  m: Pick<HinschgMeldung, "submittedAt" | "acknowledgedAt">,
  today: Date = new Date()
): number {
  if (m.acknowledgedAt) return 0;
  const days = daysSince(m.submittedAt, today);
  if (days === null) return 0;
  return Math.max(0, days - ACK_DEADLINE_DAYS);
}

export function responseDaysOverdue(
  m: Pick<HinschgMeldung, "responseDeadline">,
  today: Date = new Date()
): number {
  const remaining = daysUntilIso(m.responseDeadline, today);
  if (remaining === null) return 0;
  return Math.max(0, -remaining);
}

/**
 * Was sieht der HINWEISGEBENDE im Status-Abruf? Bewusst weniger als die
 * Office-Sicht — internalNotes raus, assignedToUserId raus.
 */
export type ReporterStatusView = {
  submittedAt: Date;
  status: HinschgStatus;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  responseDeadline: string;
  responseSummary: string | null;
  category: HinschgCategory;
  subject: string;
};

export function toReporterView(m: HinschgMeldung): ReporterStatusView {
  return {
    submittedAt: m.submittedAt,
    status: m.status,
    acknowledged: m.acknowledgedAt !== null,
    acknowledgedAt: m.acknowledgedAt,
    responseDeadline: m.responseDeadline,
    responseSummary: m.responseSummary,
    category: m.category,
    subject: m.subject,
  };
}
