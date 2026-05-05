/**
 * Modul 3.4 — Labels, Status-Definitionen, Toleranz-Defaults.
 * Pure constants. Reine Funktionen leben in `match.ts` und `aggregate.ts`.
 */

export type BestellungStatus =
  | "offen"
  | "teilgeliefert"
  | "vollstaendig"
  | "storniert";

export type LieferscheinStatus =
  | "eingegangen"
  | "geprueft"
  | "reklamation"
  | "abgeschlossen";

export type MaterialMatchStatus = "ok" | "abweichung" | "unklar";

export const BESTELLUNG_STATUS_LABEL: Record<BestellungStatus, string> = {
  offen: "Offen",
  teilgeliefert: "Teilgeliefert",
  vollstaendig: "Vollständig",
  storniert: "Storniert",
};

export const LIEFERSCHEIN_STATUS_LABEL: Record<LieferscheinStatus, string> = {
  eingegangen: "Eingegangen",
  geprueft: "Geprüft",
  reklamation: "Reklamation",
  abgeschlossen: "Abgeschlossen",
};

export const MATCH_STATUS_LABEL: Record<MaterialMatchStatus, string> = {
  ok: "OK",
  abweichung: "Abweichung",
  unklar: "Unklar",
};

/** Standard-Toleranz für 3-Way-Match in Prozent der Menge. */
export const DEFAULT_TOLERANZ_PCT_MENGE = 2;
/** Standard-Toleranz für 3-Way-Match in Cent (Beträge). */
export const DEFAULT_TOLERANZ_CENTS = 0;

/** Reminder-Schwelle: Lieferscheine im Status `eingegangen` älter als X Tage. */
export const LS_PRUEFEN_UEBERFAELLIG_TAGE = 30;
