/**
 * Sicherheiten-Logik (rein, ohne DB-Zugriffe).
 *
 * Vertragserfüllungs-/Mängelansprüche-/Vorauszahlungs-Bürgschaften (§ 17 / § 16
 * VOB/B), Bareinbehalte (§ 17 VI VOB/B, AGB-Höchstgrenze 5 %) und vom AG
 * gestellte Bauhandwerkersicherungen (§ 650f BGB).
 *
 * Geltungsende-Ableitung: `effectiveValidUntil` nimmt entweder den expliziten
 * Wert oder leitet aus Projekt-Lebenszyklus-Daten (abnahmeDate/warrantyEnd) ab.
 */
import type {
  Project,
  Security,
  SecurityKind,
  SecurityState,
} from "@/db/schema";

/** Vorlauf in Tagen, ab dem eine Sicherheit als „läuft ab" markiert wird. */
export const RELEASE_WARN_DAYS = 30;

export const SECURITY_LABELS: Record<SecurityKind, string> = {
  vertragserfuellung: "Vertragserfüllungsbürgschaft",
  maengelanspruch: "Mängelansprüchebürgschaft",
  vorauszahlung: "Vorauszahlungsbürgschaft",
  bareinbehalt: "Bareinbehalt",
  bauhandwerker: "Bauhandwerkersicherung",
};

export const SECURITY_LEGAL_BASIS: Record<SecurityKind, string> = {
  vertragserfuellung: "§ 17 VOB/B",
  maengelanspruch: "§ 17 VOB/B",
  vorauszahlung: "§ 16 II VOB/B",
  bareinbehalt: "§ 17 VI VOB/B",
  bauhandwerker: "§ 650f BGB",
};

/** Übliche Höhe in Prozent — Default beim Erfassen, AGB-konforme 5 %-Linie. */
export const SECURITY_TYPICAL_PERCENT: Record<SecurityKind, number | null> = {
  vertragserfuellung: 5,
  maengelanspruch: 5,
  vorauszahlung: null, // individuell, abh. von Vorauszahlungsbetrag
  bareinbehalt: 5,
  bauhandwerker: null, // bis 110 % der Restvergütung
};

/**
 * Berechnet das effektive Geltungsende. Bei releaseTrigger != manuell wird
 * der Projekt-Lebenszyklus-Tag bevorzugt (abnahmeDate / warrantyEnd) — falls
 * der noch nicht gesetzt ist, fällt es auf den expliziten validUntil-Wert
 * zurück (oder bleibt null = „wartet auf Lebenszyklus-Ereignis").
 */
export function effectiveValidUntil(
  sec: Pick<Security, "validUntil" | "releaseTrigger">,
  project: Pick<Project, "abnahmeDate" | "warrantyEnd">
): string | null {
  if (sec.releaseTrigger === "bei_abnahme") {
    return project.abnahmeDate ?? sec.validUntil ?? null;
  }
  if (sec.releaseTrigger === "bei_gewaehrleistungsende") {
    return project.warrantyEnd ?? sec.validUntil ?? null;
  }
  return sec.validUntil ?? null;
}

/** Tage bis zum effektiven Rückgabedatum — negativ = überfällig. */
export function daysUntilRelease(
  validUntilIso: string | null,
  today: Date = new Date()
): number | null {
  if (!validUntilIso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(validUntilIso);
  if (!m) return null;
  const valid = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  return Math.round(
    (valid.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Bestimmt den UI-State einer Sicherheit:
 *   released  — Status „freigegeben" oder „verfallen", Akte zu
 *   overdue   — Geltungsende erreicht/überschritten, aber noch nicht freigegeben
 *   expiring  — läuft in <= 30 Tagen ab
 *   aktiv     — alles im grünen Bereich (oder validUntil unbekannt = wartet)
 */
export function securityState(
  sec: Pick<Security, "status" | "validUntil" | "releaseTrigger">,
  project: Pick<Project, "abnahmeDate" | "warrantyEnd">,
  today: Date = new Date()
): SecurityState {
  if (sec.status === "freigegeben" || sec.status === "verfallen") {
    return "released";
  }
  const eff = effectiveValidUntil(sec, project);
  const days = daysUntilRelease(eff, today);
  if (days === null) return "aktiv"; // wartet auf Lebenszyklus-Ereignis
  if (days < 0) return "overdue";
  if (days <= RELEASE_WARN_DAYS) return "expiring";
  return "aktiv";
}

export type SecurityWithEffective = Security & {
  effectiveValidUntil: string | null;
  state: SecurityState;
  daysLeft: number | null;
};

/**
 * Reichert eine Sicherheits-Liste mit abgeleiteten Feldern an. Vermeidet
 * Doppelberechnung in UI + Sortierung + Reminder-Query.
 */
export function annotateSecurities(
  securities: Security[],
  project: Pick<Project, "abnahmeDate" | "warrantyEnd">,
  today: Date = new Date()
): SecurityWithEffective[] {
  return securities.map((s) => {
    const eff = effectiveValidUntil(s, project);
    return {
      ...s,
      effectiveValidUntil: eff,
      state: securityState(s, project, today),
      daysLeft: daysUntilRelease(eff, today),
    };
  });
}

/** Aggregat über alle Sicherheiten eines Projekts. */
export type SecuritiesSummary = {
  totalAmount: number;
  activeAmount: number;
  releasedAmount: number;
  overdueCount: number;
  expiringCount: number;
};

export function summarizeSecurities(
  annotated: SecurityWithEffective[]
): SecuritiesSummary {
  const sum: SecuritiesSummary = {
    totalAmount: 0,
    activeAmount: 0,
    releasedAmount: 0,
    overdueCount: 0,
    expiringCount: 0,
  };
  for (const s of annotated) {
    sum.totalAmount += s.amount;
    if (s.state === "released") sum.releasedAmount += s.amount;
    else sum.activeAmount += s.amount;
    if (s.state === "overdue") sum.overdueCount += 1;
    if (s.state === "expiring") sum.expiringCount += 1;
  }
  return sum;
}

export const SECURITY_STATE_LABEL: Record<SecurityState, string> = {
  aktiv: "Aktiv",
  expiring: "Läuft ab",
  overdue: "Überfällig",
  released: "Freigegeben",
};
