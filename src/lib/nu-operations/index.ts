/**
 * NU-Operations — Helper, Berechnungen, State-Machine, Labels.
 * Pure logic ohne DB-Zugriffe.
 */
import type {
  NuAuftrag,
  NuAuftragStatus,
  NuAuftragVertragstyp,
  NuEingangsrechnung,
  NuRechnungStatus,
  NuSicherheitsArt,
} from "@/db/schema";

export const NU_VERTRAGSTYP_LABEL: Record<NuAuftragVertragstyp, string> = {
  vob: "VOB-Vertrag",
  bgb: "BGB-Werkvertrag",
  werkvertrag: "Werkvertrag (gemischt)",
};

export const NU_AUFTRAG_STATUS_LABEL: Record<NuAuftragStatus, string> = {
  offen: "Offen",
  laufend: "Laufend",
  fertig: "Fertig",
  gekuendigt: "Gekündigt",
};

export const NU_RECHNUNG_STATUS_LABEL: Record<NuRechnungStatus, string> = {
  eingegangen: "Eingegangen",
  geprueft: "Geprüft",
  gezahlt: "Gezahlt",
  strittig: "Strittig",
};

export const NU_SICHERHEITSART_LABEL: Record<NuSicherheitsArt, string> = {
  vertragserfuellung: "Vertragserfüllung",
  gewaehrleistung: "Gewährleistung",
};

/** Standard-Frist Vertragserfüllungs-Sicherheit: bis Abnahme oder 18 Monate. */
export const VERTRAGSERFUELLUNG_FRIST_MONATE = 18;
/** Standard-Frist Gewährleistungs-Sicherheit: 4 Jahre VOB / 5 Jahre BGB. */
export const GEWAEHRLEISTUNG_FRIST_VOB_JAHRE = 4;
export const GEWAEHRLEISTUNG_FRIST_BGB_JAHRE = 5;

/** Status-Übergangs-Tabelle für NU-Auftrag. */
export function canTransitionAuftrag(
  from: NuAuftragStatus,
  to: NuAuftragStatus
): boolean {
  if (from === to) return true;
  if (from === "offen" && to === "laufend") return true;
  if (from === "offen" && to === "gekuendigt") return true;
  if (from === "laufend" && to === "fertig") return true;
  if (from === "laufend" && to === "gekuendigt") return true;
  return false;
}

/** Status-Übergangs-Tabelle für NU-Eingangsrechnung. */
export function canTransitionRechnung(
  from: NuRechnungStatus,
  to: NuRechnungStatus
): boolean {
  if (from === to) return true;
  if (from === "eingegangen" && to === "geprueft") return true;
  if (from === "eingegangen" && to === "strittig") return true;
  if (from === "geprueft" && to === "gezahlt") return true;
  if (from === "geprueft" && to === "strittig") return true;
  if (from === "strittig" && to === "geprueft") return true;
  return false;
}

/**
 * Berechnet Einbehalte und Auszahlbetrag für eine NU-Rechnung.
 * Eingabe: Brutto, Netto, USt + Auftrags-Konditionen + Bauabzug-Flag.
 *
 * Reihenfolge der Abzüge:
 *   1. Sicherheitseinbehalt (Vertragserfüllung) — auf Netto
 *   2. Gewährleistungseinbehalt — auf Netto
 *   3. Skonto — manuell, auf Brutto nach Sicherheits-Abzug
 *   4. Bauabzug §48 EStG — auf Brutto (15%) oder gesetzt
 *   5. Auszahlung = Brutto - alle Einbehalte
 */
export function calcEinbehalte(opts: {
  bruttoCents: number;
  nettoCents: number;
  sicherheitseinbehaltPct: number;
  gewaehrleistungseinbehaltPct: number;
  skontoCents: number;
  bauabzugCents: number;
}): {
  sicherheitCents: number;
  gewaehrleistungCents: number;
  skontoCents: number;
  bauabzugCents: number;
  ausgezahltCents: number;
} {
  const sicherheit = Math.round(
    opts.nettoCents * (opts.sicherheitseinbehaltPct / 100)
  );
  const gewaehr = Math.round(
    opts.nettoCents * (opts.gewaehrleistungseinbehaltPct / 100)
  );
  const skonto = Math.max(0, opts.skontoCents);
  const bauabzug = Math.max(0, opts.bauabzugCents);
  const ausgezahlt =
    opts.bruttoCents - sicherheit - gewaehr - skonto - bauabzug;
  return {
    sicherheitCents: sicherheit,
    gewaehrleistungCents: gewaehr,
    skontoCents: skonto,
    bauabzugCents: bauabzug,
    ausgezahltCents: Math.max(0, ausgezahlt),
  };
}

/**
 * Standard-Bauabzug §48 EStG: 15% vom Brutto, falls keine gültige
 * Freistellungsbescheinigung vorliegt UND Workspace bauabzug-pflichtig ist.
 */
export function defaultBauabzugCents(
  bruttoCents: number,
  hatGueltigeFreistellung: boolean,
  workspaceIsBauabzugPflichtig: boolean
): number {
  if (!workspaceIsBauabzugPflichtig) return 0;
  if (hatGueltigeFreistellung) return 0;
  return Math.round(bruttoCents * 0.15);
}

/**
 * Berechnet Fälligkeit Sicherheits-Konto-Eintrag.
 *
 * Vertragserfüllung: bei Abnahme (project.abnahmeDate) oder default-Frist
 * Gewährleistung: project.warrantyEnd oder Abnahme + 4/5 Jahre je Vertragstyp
 */
/** Parst YYYY-MM-DD als UTC-Mitternacht (vermeidet DST-Drift bei +Monaten/Jahren). */
function parseIsoUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function addMonthsUtc(iso: string, monate: number): string {
  const d = parseIsoUtc(iso);
  d.setUTCMonth(d.getUTCMonth() + monate);
  return d.toISOString().slice(0, 10);
}

function addYearsUtc(iso: string, jahre: number): string {
  const d = parseIsoUtc(iso);
  d.setUTCFullYear(d.getUTCFullYear() + jahre);
  return d.toISOString().slice(0, 10);
}

export function calcFaelligkeit(opts: {
  art: NuSicherheitsArt;
  buchungDatum: string;
  abnahmeDatum: string | null;
  warrantyEndDatum: string | null;
  vertragstyp: NuAuftragVertragstyp;
}): string {
  if (opts.art === "vertragserfuellung") {
    if (opts.abnahmeDatum) return opts.abnahmeDatum;
    return addMonthsUtc(opts.buchungDatum, VERTRAGSERFUELLUNG_FRIST_MONATE);
  }
  // Gewährleistung
  if (opts.warrantyEndDatum) return opts.warrantyEndDatum;
  const jahre =
    opts.vertragstyp === "bgb"
      ? GEWAEHRLEISTUNG_FRIST_BGB_JAHRE
      : GEWAEHRLEISTUNG_FRIST_VOB_JAHRE;
  if (opts.abnahmeDatum) return addYearsUtc(opts.abnahmeDatum, jahre);
  return addYearsUtc(opts.buchungDatum, jahre);
}

/**
 * Saldo-Aggregation: pro Auftrag offene + freigegebene Sicherheiten.
 */
export type KontoSaldo = {
  offenCents: number;
  freigegebenCents: number;
  gesamtCents: number;
  count: number;
};

export function calcKontoSaldo<
  T extends {
    einbehaltenerBetragCents: number;
    freigabeBetragCents: number | null;
    freigegebenAm: Date | null;
  },
>(eintraege: T[]): KontoSaldo {
  let offen = 0;
  let frei = 0;
  for (const e of eintraege) {
    if (e.freigegebenAm) {
      frei += e.freigabeBetragCents ?? 0;
    } else {
      offen += e.einbehaltenerBetragCents;
    }
  }
  return {
    offenCents: offen,
    freigegebenCents: frei,
    gesamtCents: offen + frei,
    count: eintraege.length,
  };
}

export function isoDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Tage zwischen heute und einer Fälligkeit (negativ = überfällig). */
export function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Aggregations-Helper für Modul 4.1 Nachkalkulation:
 * NU-Aufwand pro LV-Position (cents) für ein Projekt.
 */
export function nuAufwandPerLvPosition(
  rechnungen: NuEingangsrechnung[],
  auftragLv: { nuAuftragId: string; lvPositionId: string | null }[]
): Map<string, number> {
  // Map<auftragId, Set<lvPositionId>>
  const auftragLvMap = new Map<string, Set<string>>();
  for (const lv of auftragLv) {
    if (!lv.lvPositionId) continue;
    if (!auftragLvMap.has(lv.nuAuftragId)) {
      auftragLvMap.set(lv.nuAuftragId, new Set());
    }
    auftragLvMap.get(lv.nuAuftragId)!.add(lv.lvPositionId);
  }
  // Pro LV-Position summieren — aber wenn ein Auftrag mehrere LV-Positionen
  // bedient, wird der Aufwand auf die Positionen verteilt (gleichmäßig
  // mangels besserer Heuristik).
  const out = new Map<string, number>();
  for (const r of rechnungen) {
    if (r.status !== "gezahlt" && r.status !== "geprueft") continue;
    const lvPositions = auftragLvMap.get(r.nuAuftragId);
    if (!lvPositions || lvPositions.size === 0) continue;
    const split = Math.round(r.nettoCents / lvPositions.size);
    for (const lvId of lvPositions) {
      out.set(lvId, (out.get(lvId) ?? 0) + split);
    }
  }
  return out;
}

export function isAusgleichOk(saldo: KontoSaldo): boolean {
  return saldo.offenCents === 0;
}

export const VORGANGS_TRIGGER_LABELS = {
  nu_auftrag_ohne_freistellung: "Auftrag ohne Freistellungsbescheinigung",
  nu_sicherheit_faellig: "Sicherheits-Einbehalt fällig",
  nu_rechnung_abweichung_pruefen: "NU-Rechnung Abweichung prüfen",
} as const;
