/**
 * Geräte-Domain-Helper — Labels, Reminder-Schwellen, pure Logik (Konflikt-Check
 * + Wartungs-Status). Kein DB-Zugriff hier, damit Tests ohne Setup laufen.
 */
import type {
  DispositionStatus,
  GeraetEigentum,
  GeraetKategorie,
  GeraetStatus,
  WartungArt,
  WartungState,
} from "@/db/schema";

/** UVV-Prüfung wird ab 30 Tagen vor Ablauf eskaliert (§ 3 BetrSichV jährlich). */
export const UVV_REMINDER_LEAD_DAYS = 30;

/** Mietrückgabe wird ab 14 Tagen vor Ablauf eskaliert. */
export const MIETE_REMINDER_LEAD_DAYS = 14;

export const KATEGORIE_LABEL: Record<GeraetKategorie, string> = {
  kran: "Kran",
  bagger: "Bagger",
  radlader: "Radlader",
  geruest: "Gerüst",
  handwerk: "Handwerksgerät",
  fahrzeug: "Fahrzeug",
  sonstiges: "Sonstiges",
};

export const STATUS_LABEL: Record<GeraetStatus, string> = {
  verfuegbar: "Verfügbar",
  disponiert: "Disponiert",
  in_wartung: "In Wartung",
  defekt: "Defekt",
  ausgemustert: "Ausgemustert",
};

export const EIGENTUM_LABEL: Record<GeraetEigentum, string> = {
  eigen: "Eigentum",
  miete: "Miete",
  leasing: "Leasing",
};

export const DISPO_STATUS_LABEL: Record<DispositionStatus, string> = {
  geplant: "Geplant",
  aktiv: "Aktiv",
  zurueck: "Zurückgegeben",
  storniert: "Storniert",
};

export const WARTUNG_ART_LABEL: Record<WartungArt, string> = {
  uvv_pruefung: "UVV-Prüfung",
  tuev: "TÜV",
  inspektion: "Inspektion",
  reparatur: "Reparatur",
};

export const WARTUNG_LEGAL_BASIS: Record<WartungArt, string> = {
  uvv_pruefung: "§ 3 BetrSichV",
  tuev: "§ 29 StVZO",
  inspektion: "Hersteller-Wartungsplan",
  reparatur: "—",
};

/* ============== KONFLIKT-LOGIK ============== */

type DispoRange = {
  id: string;
  vonDatum: string;
  bisDatum: string;
  status: DispositionStatus;
};

/**
 * Prüft, ob `neu` mit einer existierenden Disposition aus `existing` für
 * dasselbe Gerät überlappt. Storno und Rückgabe blockieren NICHT.
 *
 * `excludeId` wird beim Update der eigenen Disposition gesetzt, damit die
 * Zeile nicht mit sich selbst kollidiert.
 *
 * Überlappung: zwei Intervalle [a1,a2] und [b1,b2] überlappen, wenn
 * a1 ≤ b2 UND b1 ≤ a2. Datums-Strings im Format YYYY-MM-DD sind
 * lexikographisch vergleichbar.
 */
export function hasOverlap(
  existing: readonly DispoRange[],
  neu: { vonDatum: string; bisDatum: string },
  excludeId?: string
): DispoRange | null {
  for (const e of existing) {
    if (excludeId && e.id === excludeId) continue;
    if (e.status === "storniert" || e.status === "zurueck") continue;
    if (neu.vonDatum <= e.bisDatum && e.vonDatum <= neu.bisDatum) {
      return e;
    }
  }
  return null;
}

/* ============== WARTUNGS-STATUS ============== */

/**
 * Liefert den UI-Status einer Wartung relativ zu `today`. „Done" sticht alles —
 * eine durchgeführte Wartung ist immer abgeschlossen, auch wenn faellig in der
 * Zukunft liegt. „Overdue" bei abgelaufenem Termin, „expiring" innerhalb der
 * Lead-Zeit, sonst „ok".
 */
export function wartungState(
  faelligAm: string,
  durchgefuehrtAm: string | null,
  art: WartungArt = "uvv_pruefung",
  today: Date = new Date()
): WartungState {
  if (durchgefuehrtAm) return "done";
  const todayIso = todayIsoFromDate(today);
  if (faelligAm < todayIso) return "overdue";
  const lead =
    art === "uvv_pruefung" ? UVV_REMINDER_LEAD_DAYS : MIETE_REMINDER_LEAD_DAYS;
  const cutoff = addDaysIso(todayIso, lead);
  if (faelligAm <= cutoff) return "expiring";
  return "ok";
}

export const WARTUNG_STATE_LABEL: Record<WartungState, string> = {
  done: "Erledigt",
  ok: "Geplant",
  expiring: "Bald fällig",
  overdue: "Überfällig",
};

/* ============== HELPER ============== */

function todayIsoFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
