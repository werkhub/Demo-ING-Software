/**
 * Mängel-Lib (rein, ohne DB-Zugriffe).
 *
 * Lebenszyklus + Fristberechnung + Labels für die phasen-übergreifende
 * Mängel-Domäne (siehe `src/db/schema/maengel.ts`).
 *
 * Wichtige Rechtsgrundlagen:
 *   § 4 Abs. 7 VOB/B   — Mängel während Bauausführung
 *   § 13 Abs. 5 VOB/B  — Beseitigung mit Fristsetzung
 *   § 13 Abs. 4 VOB/B  — Verjährung 4 Jahre VOB
 *   § 634a Abs. 1 BGB  — Verjährung 5 Jahre BGB
 */
import type {
  ContractType,
  GewaehrleistungEndState,
  Mangel,
  MangelAnzeigeVersandweg,
  MangelDeadlineState,
  MangelPhase,
  MangelPrioritaet,
  MangelStatus,
  Project,
} from "@/db/schema";

/** Vorlauftage für „Frist läuft ab" — Mangel mit fristsetzungDatum binnen 7 d. */
export const MANGEL_FRIST_WARN_DAYS = 7;

/** Vorlauftage für „Gewährleistung endet" — Trigger auch im Reminder-Cron. */
export const GEWAEHRLEISTUNG_WARN_DAYS = 60;

export const MANGEL_PHASE_LABEL: Record<MangelPhase, string> = {
  ausfuehrung: "Bauausführung",
  abnahme: "Abnahme",
  gewaehrleistung: "Gewährleistung",
};

export const MANGEL_PHASE_LEGAL_BASIS: Record<MangelPhase, string> = {
  ausfuehrung: "§ 4 Abs. 7 VOB/B",
  abnahme: "§ 12 VOB/B · § 640 BGB",
  gewaehrleistung: "§ 13 Abs. 4 VOB/B · § 634a BGB",
};

export const MANGEL_STATUS_LABEL: Record<MangelStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  behoben: "Behoben",
  abgelehnt: "Abgelehnt",
  strittig: "Strittig",
};

export const MANGEL_PRIORITAET_LABEL: Record<MangelPrioritaet, string> = {
  niedrig: "Niedrig",
  mittel: "Mittel",
  hoch: "Hoch",
  kritisch: "Kritisch",
};

export const MANGEL_PRIORITAET_RANK: Record<MangelPrioritaet, number> = {
  kritisch: 0,
  hoch: 1,
  mittel: 2,
  niedrig: 3,
};

export const MANGEL_VERSANDWEG_LABEL: Record<MangelAnzeigeVersandweg, string> = {
  email: "E-Mail",
  brief: "Brief",
  einschreiben: "Einschreiben",
  uebergabe: "Persönliche Übergabe",
};

function daysUntilIso(
  iso: string | null,
  today: Date = new Date()
): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  // UTC nutzen, sonst verschiebt DST/Zeitzone die Differenz um ±1 Tag.
  const dt = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const todayMid = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  return Math.round((dt - todayMid) / (1000 * 60 * 60 * 24));
}

/**
 * Bewertet den Frist-Status eines Mangels:
 *   done     — Status behoben/abgelehnt — kein Reminder mehr nötig
 *   overdue  — fristsetzungDatum < heute (negative Tage)
 *   expiring — fristsetzungDatum in <= 7 d
 *   ok       — alles im grünen Bereich (oder keine Frist gesetzt)
 *
 * Status `strittig` bleibt aktiv-überwacht, weil ein strittiger Mangel
 * juristische Folgewirkung hat (Sicherheit ggf. in Anspruch nehmen).
 */
export function mangelDeadlineState(
  mangel: Pick<Mangel, "status" | "fristsetzungDatum">,
  today: Date = new Date()
): MangelDeadlineState {
  if (mangel.status === "behoben" || mangel.status === "abgelehnt") {
    return "done";
  }
  const days = daysUntilIso(mangel.fristsetzungDatum, today);
  if (days === null) return "ok";
  if (days < 0) return "overdue";
  if (days <= MANGEL_FRIST_WARN_DAYS) return "expiring";
  return "ok";
}

export function daysUntilFrist(
  mangel: Pick<Mangel, "fristsetzungDatum">,
  today: Date = new Date()
): number | null {
  return daysUntilIso(mangel.fristsetzungDatum, today);
}

/**
 * Berechnet Gewährleistungs-Ende = abnahmeDate + (4 J. VOB | 5 J. BGB) − 1 d.
 * Verjährung tritt MIT Ablauf des Tages ein, daher zeigen wir den letzten
 * gültigen Tag der Mangel-Geltendmachung. Liefert null bei fehlendem
 * Vertragstyp oder ungültigem Datum.
 */
export function computeGewaehrleistungEnd(
  abnahmeDateIso: string,
  contractType: ContractType | null
): string | null {
  if (!contractType) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(abnahmeDateIso);
  if (!m) return null;
  const years = contractType === "vob_vertrag" ? 4 : 5;
  // UTC, sonst verschiebt DST den letzten Tag bei toISOString-Rückkonvertierung.
  const dt = new Date(
    Date.UTC(Number(m[1]) + years, Number(m[2]) - 1, Number(m[3]))
  );
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Bewertet Gewährleistungs-Frist:
 *   expired  — warrantyEnd < heute
 *   expiring — <= 60 d
 *   ok       — sonst (oder warrantyEnd null/ungültig)
 */
export function gewaehrleistungEndState(
  project: Pick<Project, "warrantyEnd">,
  today: Date = new Date()
): GewaehrleistungEndState {
  const days = daysUntilIso(project.warrantyEnd, today);
  if (days === null) return "ok";
  if (days < 0) return "expired";
  if (days <= GEWAEHRLEISTUNG_WARN_DAYS) return "expiring";
  return "ok";
}

export function daysUntilGewaehrleistungEnd(
  project: Pick<Project, "warrantyEnd">,
  today: Date = new Date()
): number | null {
  return daysUntilIso(project.warrantyEnd, today);
}

/**
 * Erste Zeile der `beschreibung` als Listen-Titel (max. 80 Zeichen).
 * Vermeidet, dass die UI den ganzen Block in eine Tabellenzelle quetscht.
 */
export function mangelTitle(mangel: Pick<Mangel, "beschreibung">): string {
  const firstLine = mangel.beschreibung.split("\n", 1)[0]?.trim() ?? "";
  if (firstLine.length <= 80) return firstLine;
  return firstLine.slice(0, 77) + "…";
}
